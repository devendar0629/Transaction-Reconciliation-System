import { DatabaseInstance, getDatabase, initDatabase } from './db.js';

export const initialTransactions = [
  {
    transaction_id: 'TXN001',
    lifecycle_id: 'LC001',
    account_id: 'ACC123',
    merchant_name: 'Amazon.com',
    transaction_date: '2025-08-14',
    transaction_amount: 125.99,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN002',
    lifecycle_id: 'LC002',
    account_id: 'ACC124',
    merchant_name: 'Starbucks',
    transaction_date: '2025-08-14',
    transaction_amount: 4.75,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN003',
    lifecycle_id: 'LC003',
    account_id: 'ACC125',
    merchant_name: 'Shell Gas',
    transaction_date: '2025-08-14',
    transaction_amount: 45.30,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN004',
    lifecycle_id: 'LC004',
    account_id: 'ACC126',
    merchant_name: 'Best Buy',
    transaction_date: '2025-08-14',
    transaction_amount: 899.99,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN005',
    lifecycle_id: 'LC005',
    account_id: 'ACC127',
    merchant_name: 'Home Depot',
    transaction_date: '2025-08-14',
    transaction_amount: 234.50,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN006',
    lifecycle_id: 'LC006',
    account_id: 'ACC128',
    merchant_name: 'Target',
    transaction_date: '2025-08-14',
    transaction_amount: 87.25,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN007',
    lifecycle_id: 'LC007',
    account_id: 'ACC129',
    merchant_name: 'Walmart',
    transaction_date: '2025-08-14',
    transaction_amount: 156.78,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN008',
    lifecycle_id: 'LC008',
    account_id: 'ACC130',
    merchant_name: 'Apple',
    transaction_date: '2025-08-05',
    transaction_amount: 1299.99,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN009',
    lifecycle_id: 'LC009',
    account_id: 'ACC131',
    merchant_name: 'Nike',
    transaction_date: '2025-08-14',
    transaction_amount: 189.95,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN010',
    lifecycle_id: 'LC010',
    account_id: 'ACC132',
    merchant_name: 'Netflix',
    transaction_date: '2025-08-07',
    transaction_amount: 15.99,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN013',
    lifecycle_id: 'LC011',
    account_id: 'ACC135',
    merchant_name: 'Corner Deli',
    transaction_date: '2025-08-14',
    transaction_amount: 32.45,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN014',
    lifecycle_id: 'LC012',
    account_id: 'ACC136',
    merchant_name: 'Shell Gas',
    transaction_date: '2025-08-14',
    transaction_amount: 28.90,
    currency: 'USD',
    status: 'COMPLETED',
    settlement_status: 'PENDING',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN015',
    lifecycle_id: 'LC013',
    account_id: 'ACC137',
    merchant_name: 'Amazon.com',
    transaction_date: '2025-08-14',
    transaction_amount: 199.99,
    currency: 'USD',
    status: 'FAILED',
    settlement_status: 'NOT_APPLICABLE',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
  {
    transaction_id: 'TXN016',
    lifecycle_id: 'LC014',
    account_id: 'ACC138',
    merchant_name: 'Uber Taxi',
    transaction_date: '2025-08-14',
    transaction_amount: 75.25,
    currency: 'USD',
    status: 'DECLINED',
    settlement_status: 'NOT_APPLICABLE',
    total_settled_amount: 0.00,
    last_settlement_date: null,
  },
];

export function seedDatabase(db?: DatabaseInstance): void {
  const targetDb = db || getDatabase();

  const runSeed = targetDb.transaction(() => {
    targetDb.exec('DELETE FROM invalid_settlement_attempts;');
    targetDb.exec('DELETE FROM settlement_history;');
    targetDb.exec('DELETE FROM transactions;');

    const insertTxn = targetDb.prepare(`
      INSERT INTO transactions (
        transaction_id, lifecycle_id, account_id, merchant_name,
        transaction_date, transaction_amount, currency, status,
        settlement_status, total_settled_amount, last_settlement_date
      ) VALUES (
        @transaction_id, @lifecycle_id, @account_id, @merchant_name,
        @transaction_date, @transaction_amount, @currency, @status,
        @settlement_status, @total_settled_amount, @last_settlement_date
      )
    `);

    for (const txn of initialTransactions) {
      insertTxn.run(txn);
    }
  });

  runSeed();
}

// If executed directly as script
if (process.argv[1] && process.argv[1].includes('seed')) {
  const db = initDatabase();
  seedDatabase(db);
  console.log('Database seeded successfully with initial transactions.');
}
