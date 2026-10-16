import Database from 'better-sqlite3';
import { initDatabase, closeDatabase, DatabaseInstance } from '../src/config/db.js';
import {
  determineSettlementStatus,
  evaluateTransactionIssues,
  runReconciliation,
} from '../src/services/reconciliation.service.js';
import { getAllTransactions, getTransactionById } from '../src/services/transaction.service.js';
import { CSVSettlementRecord, Transaction } from '../src/types/index.js';

describe('Transaction Reconciliation Engine - Core Business Scenarios', () => {
  let db: DatabaseInstance;

  beforeEach(() => {
    // Isolated in-memory database for each test
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    closeDatabase();
  });

  const insertHelper = (txn: Partial<Transaction> & { transaction_id: string }) => {
    db.prepare(`
      INSERT INTO transactions (
        transaction_id, lifecycle_id, account_id, merchant_name,
        transaction_date, transaction_amount, currency, status,
        settlement_status, total_settled_amount, last_settlement_date
      ) VALUES (
        @transaction_id, @lifecycle_id, @account_id, @merchant_name,
        @transaction_date, @transaction_amount, @currency, @status,
        @settlement_status, @total_settled_amount, @last_settlement_date
      )
    `).run({
      transaction_id: txn.transaction_id,
      lifecycle_id: txn.lifecycle_id ?? null,
      account_id: txn.account_id ?? 'ACC001',
      merchant_name: txn.merchant_name ?? 'Test Merchant',
      transaction_date: txn.transaction_date ?? '2025-08-14',
      transaction_amount: txn.transaction_amount ?? 100.0,
      currency: txn.currency ?? 'USD',
      status: txn.status ?? 'COMPLETED',
      settlement_status: txn.settlement_status ?? 'PENDING',
      total_settled_amount: txn.total_settled_amount ?? 0.0,
      last_settlement_date: txn.last_settlement_date ?? null,
    });
  };

  it('Scenario 1 — Perfect Match: $100.00 transaction with $100.00 DEBIT settlement -> FULLY_SETTLED, Issue: None', () => {
    insertHelper({
      transaction_id: 'TXN_SC1',
      lifecycle_id: 'LC_SC1',
      transaction_amount: 100.0,
    });

    const record: CSVSettlementRecord = {
      settlement_id: 'SET_SC1',
      lifecycle_id: 'LC_SC1',
      account_id: 'ACC001',
      merchant_name: 'Test Merchant',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-15',
      settlement_amount: 100.0,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    const summary = runReconciliation([record], db);
    expect(summary.matched_count).toBe(1);

    const txn = getTransactionById('TXN_SC1', db);
    expect(txn).not.toBeNull();
    expect(txn!.settlement_status).toBe('FULLY_SETTLED');
    expect(txn!.total_settled_amount).toBe(100.0);
    expect(txn!.issue_flag).toBe('NONE');
  });

  it('Scenario 2 — Partial Settlement: $100.00 transaction with $80.00 DEBIT settlement -> PARTIAL, Issue: Warning flag', () => {
    insertHelper({
      transaction_id: 'TXN_SC2',
      lifecycle_id: 'LC_SC2',
      transaction_amount: 100.0,
    });

    const record: CSVSettlementRecord = {
      settlement_id: 'SET_SC2',
      lifecycle_id: 'LC_SC2',
      account_id: 'ACC001',
      merchant_name: 'Test Merchant',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-15',
      settlement_amount: 80.0,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    const summary = runReconciliation([record], db);
    expect(summary.matched_count).toBe(1);

    const txn = getTransactionById('TXN_SC2', db);
    expect(txn).not.toBeNull();
    expect(txn!.settlement_status).toBe('PARTIAL');
    expect(txn!.total_settled_amount).toBe(80.0);
    expect(txn!.issue_flag).toBe('WARNING');
    expect(txn!.issue_description).toContain('Partial settlement');
  });

  it('Scenario 3 — Over Settlement / Refund Netting: $100.00 transaction with $100.00 DEBIT + $20.00 CREDIT (refund) -> Net: $80.00, Status: REFUNDED, Issue: None', () => {
    insertHelper({
      transaction_id: 'TXN_SC3',
      lifecycle_id: 'LC_SC3',
      transaction_amount: 100.0,
    });

    const records: CSVSettlementRecord[] = [
      {
        settlement_id: 'SET_SC3_1',
        lifecycle_id: 'LC_SC3',
        account_id: 'ACC001',
        merchant_name: 'Test Merchant',
        transaction_date: '2025-08-14',
        settlement_date: '2025-08-15',
        settlement_amount: 100.0,
        settlement_type: 'DEBIT',
        currency: 'USD',
      },
      {
        settlement_id: 'SET_SC3_2',
        lifecycle_id: 'LC_SC3',
        account_id: 'ACC001',
        merchant_name: 'Test Merchant',
        transaction_date: '2025-08-14',
        settlement_date: '2025-08-16',
        settlement_amount: 20.0,
        settlement_type: 'CREDIT',
        currency: 'USD',
      },
    ];

    const summary = runReconciliation(records, db);
    expect(summary.matched_count).toBe(2);

    const txn = getTransactionById('TXN_SC3', db);
    expect(txn).not.toBeNull();
    expect(txn!.total_settled_amount).toBe(80.0);
    expect(txn!.settlement_status).toBe('REFUNDED');
    expect(txn!.issue_flag).toBe('NONE'); // Must NOT be flagged as warning!
  });

  it('Scenario 4 — Over Settlement Critical: $100.00 transaction with $120.00 DEBIT settlement -> Status: OVER_SETTLED, Issue: Critical flag', () => {
    insertHelper({
      transaction_id: 'TXN_SC4',
      lifecycle_id: 'LC_SC4',
      transaction_amount: 100.0,
    });

    const record: CSVSettlementRecord = {
      settlement_id: 'SET_SC4',
      lifecycle_id: 'LC_SC4',
      account_id: 'ACC001',
      merchant_name: 'Test Merchant',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-15',
      settlement_amount: 120.0,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    const summary = runReconciliation([record], db);
    expect(summary.matched_count).toBe(1);

    const txn = getTransactionById('TXN_SC4', db);
    expect(txn).not.toBeNull();
    expect(txn!.total_settled_amount).toBe(120.0);
    expect(txn!.settlement_status).toBe('OVER_SETTLED');
    expect(txn!.issue_flag).toBe('CRITICAL');
    expect(txn!.issue_description).toContain('Over-settlement');
  });

  it('Scenario 5 — Missing Lifecycle ID: matched via fallback logic (account_id + merchant_name + transaction_date)', () => {
    insertHelper({
      transaction_id: 'TXN_SC5',
      lifecycle_id: 'LC_KNOWN',
      account_id: 'ACC_FALLBACK',
      merchant_name: 'Fallback Corner Store',
      transaction_date: '2025-08-14',
      transaction_amount: 65.5,
    });

    const record: CSVSettlementRecord = {
      settlement_id: 'SET_SC5',
      lifecycle_id: null, // Empty lifecycle_id
      account_id: 'ACC_FALLBACK',
      merchant_name: 'Fallback Corner Store',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-15',
      settlement_amount: 65.5,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    const summary = runReconciliation([record], db);
    expect(summary.matched_count).toBe(1);
    expect(summary.unmatched_records.length).toBe(0);

    const txn = getTransactionById('TXN_SC5', db);
    expect(txn).not.toBeNull();
    expect(txn!.settlement_status).toBe('FULLY_SETTLED');
    expect(txn!.total_settled_amount).toBe(65.5);
  });

  it('Scenario 6 — Status Transitions: $100.00 PENDING -> $50.00 DEBIT (PARTIAL) -> $50.00 DEBIT (FULLY_SETTLED)', () => {
    insertHelper({
      transaction_id: 'TXN_SC6',
      lifecycle_id: 'LC_SC6',
      transaction_amount: 100.0,
    });

    // Step 1: First settlement $50.00
    const rec1: CSVSettlementRecord = {
      settlement_id: 'SET_SC6_1',
      lifecycle_id: 'LC_SC6',
      account_id: 'ACC001',
      merchant_name: 'Test Merchant',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-15',
      settlement_amount: 50.0,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    runReconciliation([rec1], db);
    let txn = getTransactionById('TXN_SC6', db);
    expect(txn!.settlement_status).toBe('PARTIAL');
    expect(txn!.total_settled_amount).toBe(50.0);
    expect(txn!.issue_flag).toBe('WARNING');

    // Step 2: Second settlement $50.00
    const rec2: CSVSettlementRecord = {
      settlement_id: 'SET_SC6_2',
      lifecycle_id: 'LC_SC6',
      account_id: 'ACC001',
      merchant_name: 'Test Merchant',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-16',
      settlement_amount: 50.0,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    runReconciliation([rec2], db);
    txn = getTransactionById('TXN_SC6', db);
    expect(txn!.settlement_status).toBe('FULLY_SETTLED');
    expect(txn!.total_settled_amount).toBe(100.0);
    expect(txn!.last_settlement_date).toBe('2025-08-16');
    expect(txn!.issue_flag).toBe('NONE');
  });

  it('Scenario 7 — Complex Refund Case: $100.00 with $100.00 DEBIT + $30.00 CREDIT (partial refund) -> Net: $70.00, Status: REFUNDED', () => {
    insertHelper({
      transaction_id: 'TXN_SC7',
      lifecycle_id: 'LC_SC7',
      transaction_amount: 100.0,
    });

    const records: CSVSettlementRecord[] = [
      {
        settlement_id: 'SET_SC7_1',
        lifecycle_id: 'LC_SC7',
        account_id: 'ACC001',
        merchant_name: 'Test Merchant',
        transaction_date: '2025-08-14',
        settlement_date: '2025-08-15',
        settlement_amount: 100.0,
        settlement_type: 'DEBIT',
        currency: 'USD',
      },
      {
        settlement_id: 'SET_SC7_2',
        lifecycle_id: 'LC_SC7',
        account_id: 'ACC001',
        merchant_name: 'Test Merchant',
        transaction_date: '2025-08-14',
        settlement_date: '2025-08-16',
        settlement_amount: 30.0,
        settlement_type: 'CREDIT',
        currency: 'USD',
      },
    ];

    runReconciliation(records, db);
    const txn = getTransactionById('TXN_SC7', db);
    expect(txn).not.toBeNull();
    expect(txn!.total_settled_amount).toBe(70.0);
    expect(txn!.settlement_status).toBe('REFUNDED');
    expect(txn!.issue_flag).toBe('NONE');
  });

  it('Issue Detection: Pending settlement overdue > 7 days triggers CRITICAL flag', () => {
    insertHelper({
      transaction_id: 'TXN_OVERDUE',
      lifecycle_id: 'LC_OVERDUE',
      transaction_date: '2025-08-01',
      transaction_amount: 50.0,
      settlement_status: 'PENDING',
    });

    // Explicitly set reference date to 2025-08-15 (14 days later > 7 days)
    process.env.REFERENCE_DATE = '2025-08-15';
    const txns = getAllTransactions(undefined, db);
    delete process.env.REFERENCE_DATE;
    const overdueTxn = txns.find((t) => t.transaction_id === 'TXN_OVERDUE');
    expect(overdueTxn).toBeDefined();
    expect(overdueTxn!.issue_flag).toBe('CRITICAL');
    expect(overdueTxn!.issue_description).toContain('Settlement overdue');
  });

  it('Issue Detection & Rejection: Settlement attempted on FAILED transaction triggers CRITICAL flag and logs invalid record', () => {
    insertHelper({
      transaction_id: 'TXN_FAILED',
      lifecycle_id: 'LC_FAILED',
      status: 'FAILED',
      settlement_status: 'NOT_APPLICABLE',
      transaction_amount: 150.0,
    });

    const record: CSVSettlementRecord = {
      settlement_id: 'SET_INVALID',
      lifecycle_id: 'LC_FAILED',
      account_id: 'ACC001',
      merchant_name: 'Test Merchant',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-15',
      settlement_amount: 150.0,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    const summary = runReconciliation([record], db);
    expect(summary.invalid_records.length).toBe(1);
    expect(summary.invalid_records[0]!.transaction_id).toBe('TXN_FAILED');

    const txn = getTransactionById('TXN_FAILED', db);
    expect(txn!.settlement_status).toBe('NOT_APPLICABLE');
    expect(txn!.total_settled_amount).toBe(0.0);
    expect(txn!.issue_flag).toBe('CRITICAL');
    expect(txn!.issue_description).toContain('Invalid settlement attempt');
  });

  it('Unmatched Orphan Handling: Records with no matching transaction are reported gracefully', () => {
    const orphan: CSVSettlementRecord = {
      settlement_id: 'SET_ORPHAN',
      lifecycle_id: 'LC_NONEXISTENT',
      account_id: 'ACC_GHOST',
      merchant_name: 'Ghost Merchant',
      transaction_date: '2025-08-14',
      settlement_date: '2025-08-15',
      settlement_amount: 99.0,
      settlement_type: 'DEBIT',
      currency: 'USD',
    };

    const summary = runReconciliation([orphan], db);
    expect(summary.unmatched_records.length).toBe(1);
    expect(summary.unmatched_records[0]!.settlement_id).toBe('SET_ORPHAN');
  });
});
