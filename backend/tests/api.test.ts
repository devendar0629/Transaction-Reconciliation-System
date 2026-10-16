import request from 'supertest';
import { createApp } from '../src/app.js';
import { initDatabase, closeDatabase, getDatabase } from '../src/config/db.js';
import { seedDatabase } from '../src/config/seed.js';

describe('Transaction Reconciliation REST API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    // In-memory isolated database
    initDatabase(':memory:');
    seedDatabase(getDatabase());
    app = createApp();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /transactions should return seeded baseline transactions', async () => {
    const res = await request(app).get('/transactions');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(14); // 14 seeded baseline transactions
  });

  it('GET /transactions?settlement_status=PENDING should filter correctly', async () => {
    const res = await request(app).get('/transactions?settlement_status=PENDING');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    for (const txn of res.body.data) {
      expect(txn.settlement_status).toBe('PENDING');
    }
  });

  it('GET /transactions/:id should return single transaction details with settlement history', async () => {
    const res = await request(app).get('/transactions/TXN001');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.transaction_id).toBe('TXN001');
    expect(res.body.data.merchant_name).toBe('Amazon.com');
    expect(Array.isArray(res.body.data.settlement_history)).toBe(true);
  });

  it('GET /transactions/:id should return 404 for unknown transaction ID', async () => {
    const res = await request(app).get('/transactions/TXN_NON_EXISTENT');
    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
  });

  it('POST /reconcile should process default settlement_report.csv successfully', async () => {
    const res = await request(app).post('/reconcile');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary).toBeDefined();

    const summary = res.body.summary;
    expect(summary.total_records).toBe(19);
    expect(summary.processed_count).toBe(19);

    // Orphans SET016, SET018
    const orphanIds = summary.unmatched_records.map((u: any) => u.settlement_id);
    expect(orphanIds).toContain('SET016');
    expect(orphanIds).toContain('SET018');

    // Invalid attempt SET017 against TXN015 (FAILED)
    const invalidTxnIds = summary.invalid_records.map((i: any) => i.transaction_id);
    expect(invalidTxnIds).toContain('TXN015');
  });

  it('POST /reconcile should accept uploaded CSV file via multipart/form-data', async () => {
    const customCSV = `settlement_id,lifecycle_id,account_id,merchant_name,transaction_date,settlement_date,settlement_amount,settlement_type,currency
SET_CUSTOM1,LC001,ACC123,Amazon.com,2025-08-14,2025-08-16,50.00,CREDIT,USD`;

    const res = await request(app)
      .post('/reconcile')
      .attach('file', Buffer.from(customCSV), 'custom.csv');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.summary.processed_count).toBe(1);
  });

  it('GET /dashboard/summary should return comprehensive aggregated metrics', async () => {
    const res = await request(app).get('/dashboard/summary');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');

    const data = res.body.data;
    expect(data.total_transactions).toBe(14);
    expect(data.total_settlements).toBeGreaterThan(0);
    expect(data.status_breakdown).toBeDefined();
    expect(data.status_breakdown.FULLY_SETTLED).toBeDefined();
    expect(data.critical_issues_count).toBeGreaterThan(0);
    expect(data.settlement_rate_percentage).toBeGreaterThanOrEqual(0);
  });
});
