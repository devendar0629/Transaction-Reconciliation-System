import { DatabaseInstance, getDatabase } from '../config/db.js';
import {
  DashboardSummary,
  EnrichedTransaction,
  SettlementHistory,
  SettlementStatus,
  Transaction,
  TransactionDetail,
} from '../types/index.js';
import { calculateDaysBetween, evaluateTransactionIssues } from './reconciliation.service.js';

export function getSystemReferenceDate(targetDb: DatabaseInstance): string {
  if (process.env.REFERENCE_DATE) {
    return process.env.REFERENCE_DATE;
  }

  const row = targetDb
    .prepare<[], { max_date: string | null }>(
      'SELECT MAX(settlement_date) as max_date FROM settlement_history'
    )
    .get();

  if (row?.max_date) {
    return row.max_date;
  }

  // Fallback to current date
  return new Date().toISOString().slice(0, 10);
}

export function getAllTransactions(
  statusFilter?: SettlementStatus,
  db?: DatabaseInstance
): EnrichedTransaction[] {
  const targetDb = db || getDatabase();
  const referenceDate = getSystemReferenceDate(targetDb);

  let query = 'SELECT * FROM transactions';
  const params: string[] = [];

  if (statusFilter && statusFilter.trim() !== '' && statusFilter !== ('ALL' as any)) {
    query += ' WHERE settlement_status = ?';
    params.push(statusFilter);
  }

  query += ' ORDER BY transaction_date DESC, transaction_id ASC';

  const txns = targetDb.prepare(query).all(...params) as Transaction[];

  // Get set of transaction IDs that received invalid settlement attempts
  const invalidTxnRows = targetDb
    .prepare<[], { transaction_id: string }>(
      'SELECT DISTINCT transaction_id FROM invalid_settlement_attempts'
    )
    .all();
  const invalidTxnIds = new Set(invalidTxnRows.map((r) => r.transaction_id));

  return txns.map((txn) => {
    const hasInvalid = invalidTxnIds.has(txn.transaction_id);
    const issue = evaluateTransactionIssues(txn, hasInvalid, referenceDate);

    return {
      ...txn,
      transaction_amount: Number(txn.transaction_amount),
      total_settled_amount: Number(txn.total_settled_amount),
      issue_flag: issue.issue_flag,
      issue_description: issue.issue_description,
      recommendation: issue.recommendation,
    };
  });
}

export function getTransactionById(
  id: string,
  db?: DatabaseInstance
): TransactionDetail | null {
  const targetDb = db || getDatabase();
  const referenceDate = getSystemReferenceDate(targetDb);

  const txn = targetDb
    .prepare<[string], Transaction>('SELECT * FROM transactions WHERE transaction_id = ?')
    .get(id);

  if (!txn) {
    return null;
  }

  const settlements = targetDb
    .prepare<[string], SettlementHistory>(
      'SELECT * FROM settlement_history WHERE transaction_id = ? ORDER BY settlement_date ASC, processed_at ASC'
    )
    .all(id);

  const invalidAttempt = targetDb
    .prepare<[string], { reason: string }>(
      'SELECT reason FROM invalid_settlement_attempts WHERE transaction_id = ?'
    )
    .get(id);

  const hasInvalid = !!invalidAttempt;
  const issue = evaluateTransactionIssues(txn, hasInvalid, referenceDate);

  let finalIssueDescription = issue.issue_description;
  if (invalidAttempt && hasInvalid) {
    finalIssueDescription = `${issue.issue_description || ''} Details: ${invalidAttempt.reason}`;
  }

  return {
    ...txn,
    transaction_amount: Number(txn.transaction_amount),
    total_settled_amount: Number(txn.total_settled_amount),
    issue_flag: issue.issue_flag,
    issue_description: finalIssueDescription,
    recommendation: issue.recommendation,
    settlement_history: settlements.map((s) => ({
      ...s,
      settlement_amount: Number(s.settlement_amount),
    })),
  };
}

export function getDashboardSummary(db?: DatabaseInstance): DashboardSummary {
  const targetDb = db || getDatabase();
  const enrichedTxns = getAllTransactions(undefined, targetDb);

  const total_transactions = enrichedTxns.length;

  const settlementCountRow = targetDb
    .prepare<[], { count: number }>('SELECT COUNT(*) as count FROM settlement_history')
    .get();
  const total_settlements = settlementCountRow?.count || 0;

  const status_breakdown: Record<SettlementStatus, number> = {
    PENDING: 0,
    PARTIAL: 0,
    FULLY_SETTLED: 0,
    OVER_SETTLED: 0,
    REFUNDED: 0,
    NOT_APPLICABLE: 0,
  };

  let critical_issues_count = 0;
  let warnings_count = 0;
  let total_outstanding_amount = 0;

  for (const txn of enrichedTxns) {
    if (status_breakdown[txn.settlement_status] !== undefined) {
      status_breakdown[txn.settlement_status]++;
    }

    if (txn.issue_flag === 'CRITICAL') {
      critical_issues_count++;
    } else if (txn.issue_flag === 'WARNING') {
      warnings_count++;
    }

    if (txn.status === 'COMPLETED' && (txn.settlement_status === 'PENDING' || txn.settlement_status === 'PARTIAL')) {
      const outstanding = txn.transaction_amount - txn.total_settled_amount;
      if (outstanding > 0) {
        total_outstanding_amount += outstanding;
      }
    }
  }

  total_outstanding_amount = Math.round(total_outstanding_amount * 100) / 100;

  // Calculate settlement performance metrics
  // Average days to settle: average difference in days between settlement_date and transaction_date
  const settlementDiffRows = targetDb
    .prepare<[], { settlement_date: string; transaction_date: string }>(`
      SELECT s.settlement_date, t.transaction_date
      FROM settlement_history s
      JOIN transactions t ON s.transaction_id = t.transaction_id
    `)
    .all();

  let average_days_to_settle = 0;
  if (settlementDiffRows.length > 0) {
    const totalDays = settlementDiffRows.reduce((acc, row) => {
      const days = calculateDaysBetween(row.transaction_date, row.settlement_date);
      return acc + (days >= 0 ? days : 0);
    }, 0);
    average_days_to_settle = Math.round((totalDays / settlementDiffRows.length) * 10) / 10;
  }

  // Settlement rate (%): completed transactions that are FULLY_SETTLED or REFUNDED
  const completedTxns = enrichedTxns.filter((t) => t.status === 'COMPLETED');
  const settledCount = completedTxns.filter(
    (t) => t.settlement_status === 'FULLY_SETTLED' || t.settlement_status === 'REFUNDED'
  ).length;

  const settlement_rate_percentage =
    completedTxns.length > 0
      ? Math.round((settledCount / completedTxns.length) * 1000) / 10
      : 0;

  return {
    total_transactions,
    total_settlements,
    status_breakdown,
    critical_issues_count,
    warnings_count,
    total_outstanding_amount,
    average_days_to_settle,
    settlement_rate_percentage,
  };
}
