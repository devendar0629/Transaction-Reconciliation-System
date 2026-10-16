import { DatabaseInstance, getDatabase } from '../config/db.js';
import {
  CSVSettlementRecord,
  EnrichedTransaction,
  InvalidRecord,
  IssueFlag,
  ReconciliationSummary,
  SettlementHistory,
  SettlementStatus,
  Transaction,
  UnmatchedRecord,
} from '../types/index.js';

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function evaluateTransactionIssues(
  txn: Transaction,
  hasInvalidSettlementAttempt: boolean,
  referenceDateStr: string
): { issue_flag: IssueFlag; issue_description: string | null; recommendation: string | null } {
  // Critical 1: FAILED or DECLINED transaction received an invalid settlement attempt
  if ((txn.status === 'FAILED' || txn.status === 'DECLINED') && hasInvalidSettlementAttempt) {
    return {
      issue_flag: 'CRITICAL',
      issue_description: `Invalid settlement attempt: Transaction is marked ${txn.status} but received a settlement attempt.`,
      recommendation: 'Investigate gateway reconciliation logs immediately; ensure customer account was not incorrectly charged or credited.',
    };
  }

  // Critical 2: OVER_SETTLED
  if (txn.settlement_status === 'OVER_SETTLED') {
    return {
      issue_flag: 'CRITICAL',
      issue_description: `Over-settlement detected: Total settled amount ($${txn.total_settled_amount.toFixed(2)}) exceeds transaction amount ($${txn.transaction_amount.toFixed(2)}).`,
      recommendation: 'Audit settlement provider reports, verify duplicate capture batches, and initiate settlement clawback if required.',
    };
  }

  // Critical 3: PENDING for > 7 days relative to reference date
  if (txn.status === 'COMPLETED' && txn.settlement_status === 'PENDING') {
    const daysOld = calculateDaysBetween(txn.transaction_date, referenceDateStr);
    if (daysOld > 7) {
      return {
        issue_flag: 'CRITICAL',
        issue_description: `Settlement overdue: No settlement received after ${daysOld} days from transaction date (${txn.transaction_date}). Exceeds 7-day SLA.`,
        recommendation: 'Contact merchant acquirer or payment gateway operations to investigate pending clearance or network drop.',
      };
    }
  }

  // Warning: PARTIAL settlement (debit only, less than amount)
  if (txn.settlement_status === 'PARTIAL') {
    return {
      issue_flag: 'WARNING',
      issue_description: `Partial settlement: Settled amount ($${txn.total_settled_amount.toFixed(2)}) is less than transaction amount ($${txn.transaction_amount.toFixed(2)}).`,
      recommendation: 'Monitor upcoming settlement cycles for residual balance capture or confirm if partial fulfillment/installment plan was agreed.',
    };
  }

  // Note: REFUNDED transactions (DEBIT + CREDIT) have no warning issues per specifications!
  return {
    issue_flag: 'NONE',
    issue_description: null,
    recommendation: null,
  };
}

export function determineSettlementStatus(
  txnAmount: number,
  settlements: { settlement_amount: number; settlement_type: string }[]
): { settlement_status: SettlementStatus; total_settled_amount: number } {
  let totalDebitCents = 0;
  let totalCreditCents = 0;
  let hasCredit = false;

  for (const s of settlements) {
    const amountCents = Math.round(s.settlement_amount * 100);
    if (s.settlement_type === 'DEBIT') {
      totalDebitCents += amountCents;
    } else if (s.settlement_type === 'CREDIT') {
      totalCreditCents += amountCents;
      hasCredit = true;
    }
  }

  const netCents = totalDebitCents - totalCreditCents;
  const netAmount = Math.round(netCents) / 100;
  const targetCents = Math.round(txnAmount * 100);

  if (settlements.length === 0) {
    return { settlement_status: 'PENDING', total_settled_amount: 0 };
  }

  if (netCents === targetCents) {
    return { settlement_status: 'FULLY_SETTLED', total_settled_amount: netAmount };
  }

  if (netCents > targetCents) {
    return { settlement_status: 'OVER_SETTLED', total_settled_amount: netAmount };
  }

  // netCents < targetCents
  if (hasCredit) {
    return { settlement_status: 'REFUNDED', total_settled_amount: netAmount };
  }

  return { settlement_status: 'PARTIAL', total_settled_amount: netAmount };
}

export function runReconciliation(
  records: CSVSettlementRecord[],
  db?: DatabaseInstance
): ReconciliationSummary {
  const targetDb = db || getDatabase();

  const unmatched_records: UnmatchedRecord[] = [];
  const invalid_records: InvalidRecord[] = [];
  const duplicate_records: { settlement_id: string; reason: string }[] = [];
  const updatedTransactionIds = new Set<string>();

  const findTxnByLifecycle = targetDb.prepare<[string], Transaction>(
    'SELECT * FROM transactions WHERE lifecycle_id = ?'
  );

  const findTxnByComposite = targetDb.prepare<[string, string, string], Transaction>(
    'SELECT * FROM transactions WHERE account_id = ? AND merchant_name = ? AND transaction_date = ?'
  );

  const checkExistingSettlement = targetDb.prepare<[string], { settlement_id: string }>(
    'SELECT settlement_id FROM settlement_history WHERE settlement_id = ?'
  );

  const checkExistingInvalidAttempt = targetDb.prepare<[string], { settlement_id: string }>(
    'SELECT settlement_id FROM invalid_settlement_attempts WHERE settlement_id = ?'
  );

  const insertSettlement = targetDb.prepare(`
    INSERT INTO settlement_history (
      settlement_id, transaction_id, lifecycle_id, settlement_date,
      settlement_amount, settlement_type, currency
    ) VALUES (
      @settlement_id, @transaction_id, @lifecycle_id, @settlement_date,
      @settlement_amount, @settlement_type, @currency
    )
  `);

  const insertInvalidAttempt = targetDb.prepare(`
    INSERT OR IGNORE INTO invalid_settlement_attempts (settlement_id, transaction_id, reason)
    VALUES (?, ?, ?)
  `);

  const getSettlementsForTxn = targetDb.prepare<[string], SettlementHistory>(
    'SELECT * FROM settlement_history WHERE transaction_id = ? ORDER BY settlement_date ASC'
  );

  const updateTxn = targetDb.prepare(`
    UPDATE transactions
    SET settlement_status = @settlement_status,
        total_settled_amount = @total_settled_amount,
        last_settlement_date = @last_settlement_date
    WHERE transaction_id = @transaction_id
  `);

  const reconcileTx = targetDb.transaction(() => {
    for (const record of records) {
      // 1. Check duplicate settlement_id in database
      const existingHistory = checkExistingSettlement.get(record.settlement_id);
      const existingInvalid = checkExistingInvalidAttempt.get(record.settlement_id);

      if (existingHistory || existingInvalid) {
        duplicate_records.push({
          settlement_id: record.settlement_id,
          reason: `Settlement ID '${record.settlement_id}' has already been processed previously.`,
        });
        continue;
      }

      // 2. Matching Strategy
      let matchedTxn: Transaction | undefined;

      // Primary Match: lifecycle_id when present and non-empty
      if (record.lifecycle_id && record.lifecycle_id.trim() !== '') {
        matchedTxn = findTxnByLifecycle.get(record.lifecycle_id);
      }

      // Fallback Match: account_id + merchant_name + transaction_date
      if (!matchedTxn) {
        matchedTxn = findTxnByComposite.get(
          record.account_id,
          record.merchant_name,
          record.transaction_date
        );
      }

      // If still not matched -> Orphan settlement
      if (!matchedTxn) {
        unmatched_records.push({
          settlement_id: record.settlement_id,
          lifecycle_id: record.lifecycle_id,
          account_id: record.account_id,
          merchant_name: record.merchant_name,
          settlement_amount: record.settlement_amount,
          settlement_type: record.settlement_type,
          reason: 'No matching transaction found in database via lifecycle_id or composite key (account_id + merchant_name + transaction_date).',
        });
        continue;
      }

      // 3. Currency Consistency Check
      if (record.currency !== matchedTxn.currency) {
        invalid_records.push({
          settlement_id: record.settlement_id,
          transaction_id: matchedTxn.transaction_id,
          reason: `Currency mismatch: settlement currency '${record.currency}' does not match transaction currency '${matchedTxn.currency}'.`,
        });
        insertInvalidAttempt.run(
          record.settlement_id,
          matchedTxn.transaction_id,
          `Currency mismatch: ${record.currency} vs ${matchedTxn.currency}`
        );
        continue;
      }

      // 4. Check if transaction is FAILED or DECLINED
      if (matchedTxn.status === 'FAILED' || matchedTxn.status === 'DECLINED') {
        invalid_records.push({
          settlement_id: record.settlement_id,
          transaction_id: matchedTxn.transaction_id,
          reason: `Settlement attempted on ${matchedTxn.status} transaction (TXN: ${matchedTxn.transaction_id}). Settlement rejected.`,
        });
        insertInvalidAttempt.run(
          record.settlement_id,
          matchedTxn.transaction_id,
          `Settlement received for a ${matchedTxn.status} transaction`
        );
        updatedTransactionIds.add(matchedTxn.transaction_id);
        continue;
      }

      // 5. Valid match for COMPLETED transaction -> Insert settlement history
      insertSettlement.run({
        settlement_id: record.settlement_id,
        transaction_id: matchedTxn.transaction_id,
        lifecycle_id: record.lifecycle_id || matchedTxn.lifecycle_id,
        settlement_date: record.settlement_date,
        settlement_amount: record.settlement_amount,
        settlement_type: record.settlement_type,
        currency: record.currency,
      });

      updatedTransactionIds.add(matchedTxn.transaction_id);

      // Re-calculate transaction total and status
      const allTxnSettlements = getSettlementsForTxn.all(matchedTxn.transaction_id);
      const { settlement_status, total_settled_amount } = determineSettlementStatus(
        matchedTxn.transaction_amount,
        allTxnSettlements
      );

      // Calculate last_settlement_date (most recent settlement_date)
      const lastSettlementDate = allTxnSettlements.reduce((latest, s) => {
        return !latest || s.settlement_date > latest ? s.settlement_date : latest;
      }, '' as string) || null;

      updateTxn.run({
        settlement_status,
        total_settled_amount,
        last_settlement_date: lastSettlementDate,
        transaction_id: matchedTxn.transaction_id,
      });
    }
  });

  reconcileTx();

  const processed_count = records.length;
  const matched_count = processed_count - unmatched_records.length - duplicate_records.length;

  return {
    total_records: records.length,
    processed_count,
    matched_count,
    unmatched_records,
    invalid_records,
    duplicate_records,
    updated_transactions_count: updatedTransactionIds.size,
  };
}
