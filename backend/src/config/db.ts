import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export type DatabaseInstance = Database.Database;

let dbInstance: DatabaseInstance | null = null;

export function getDatabasePath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  return path.resolve(process.cwd(), 'reconciliation.db');
}

export function initDatabase(customPath?: string): DatabaseInstance {
  const dbPath = customPath || getDatabasePath();

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Create tables as per specification
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id VARCHAR(50) PRIMARY KEY,
      lifecycle_id VARCHAR(50),
      account_id VARCHAR(50) NOT NULL,
      merchant_name VARCHAR(100) NOT NULL,
      transaction_date DATE NOT NULL,
      transaction_amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) NOT NULL,
      status VARCHAR(20) NOT NULL,
      settlement_status VARCHAR(20) DEFAULT 'PENDING',
      total_settled_amount DECIMAL(10,2) DEFAULT 0.00,
      last_settlement_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settlement_history (
      settlement_id VARCHAR(50) PRIMARY KEY,
      transaction_id VARCHAR(50),
      lifecycle_id VARCHAR(50),
      settlement_date DATE NOT NULL,
      settlement_amount DECIMAL(10,2) NOT NULL,
      settlement_type VARCHAR(10) NOT NULL,
      currency VARCHAR(3) NOT NULL,
      processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
    );

    CREATE TABLE IF NOT EXISTS invalid_settlement_attempts (
      settlement_id VARCHAR(50) PRIMARY KEY,
      transaction_id VARCHAR(50) NOT NULL,
      reason TEXT NOT NULL,
      attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
    );
  `);

  dbInstance = db;
  return db;
}

export function getDatabase(): DatabaseInstance {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
