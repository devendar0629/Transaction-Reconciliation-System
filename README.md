# Transaction Reconciliation System

A full-stack financial operations platform that reconciles transaction records with settlement reports, detects discrepancies and SLA breaches, flags critical issues with actionable recommendations, and provides real-time reporting dashboards for FinOps teams.

---

## 1. Architecture & Tech Stack

### Tech Stack
* **Backend**: Node.js with Express.js and TypeScript.
* **Database**: SQLite (`reconciliation.db`) via `better-sqlite3`.
* **Frontend**: React 19 with TypeScript, Tailwind CSS, Inter font typography, Lucide icons, and Recharts.
* **UI/UX**: Modern Fintech SaaS design language with multi-tab navigation (Overview, Ledger, Exceptions, Studio), interactive slide-over audit drawers, CSV drag-and-drop, and real-time SLA discrepancy triage.

### Project Structure
```text
TransactionReconciliationSystem/
├── backend/
│   ├── data/
│   │   └── settlement_report.csv          # Default settlement dataset (SET001 - SET020)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                      # SQLite schema initialization & connection lifecycle
│   │   │   └── seed.ts                    # Baseline seed data for 14 transactions (TXN001 - TXN016)
│   │   ├── services/
│   │   │   ├── csv-parser.service.ts      # CSV header/row validator & positive amount validation
│   │   │   ├── reconciliation.service.ts  # Primary/fallback matching, net calculation & issue triage
│   │   │   └── transaction.service.ts     # Aggregation metrics, chronological ledger queries
│   │   ├── routes/
│   │   │   ├── reconcile.router.ts        # POST /reconcile & POST /reconcile/reset
│   │   │   ├── transactions.router.ts     # GET /transactions & GET /transactions/:id
│   │   │   └── dashboard.router.ts        # GET /dashboard/summary
│   │   ├── types/
│   │   │   └── index.ts                   # Strict TypeScript domain interfaces
│   │   ├── app.ts                         # Express app configuration & middleware
│   │   ├── server.ts                      # Server bootstrap on port 5000
│   │   └── index.ts                       # Backend entry point
│   ├── tests/
│   │   ├── reconciliation.test.ts         # Scenarios 1 to 7 core business unit tests
│   │   └── api.test.ts                    # Supertest REST API integration tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts                  # Typed HTTP client for reconciliation API
│   │   ├── components/
│   │   │   ├── Navbar.tsx                 # Header, database connection indicator, refresh button
│   │   │   ├── KPICards.tsx               # Total volume, critical red flags, warnings, outstanding balances
│   │   │   ├── StatusChart.tsx            # Donut distribution & volume bar charts via Recharts
│   │   │   ├── ReconciliationAction.tsx   # Run default CSV, upload custom CSV, reset state modal
│   │   │   ├── TransactionTable.tsx       # Searchable, filterable interactive transaction ledger
│   │   │   ├── TransactionDetailModal.tsx # Full metadata, settlement history, & actionable recommendations
│   │   │   ├── StatusBadge.tsx            # Color-coded badges for all settlement statuses
│   │   │   └── IssueBadge.tsx             # Visual indicators for Critical / Warning / Healthy
│   │   ├── types/
│   │   │   └── index.ts                   # Frontend domain models
│   │   ├── App.tsx                        # Main dashboard layout and operational workflows
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── settlement_report.csv                  # Root reference settlement report
├── package.json                           # Root workspace convenience scripts
└── README.md                              # System documentation
```

---

## 2. Database Schema

The SQLite database (`reconciliation.db`) implements the following tables:

```sql
CREATE TABLE transactions (
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

CREATE TABLE settlement_history (
    settlement_id VARCHAR(50) PRIMARY KEY,
    transaction_id VARCHAR(50),
    lifecycle_id VARCHAR(50),
    settlement_date DATE NOT NULL,
    settlement_amount DECIMAL(10,2) NOT NULL,
    settlement_type VARCHAR(10) NOT NULL, -- 'DEBIT' or 'CREDIT'
    currency VARCHAR(3) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
);

CREATE TABLE invalid_settlement_attempts (
    settlement_id VARCHAR(50) PRIMARY KEY,
    transaction_id VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id)
);
```

---

## 3. Reconciliation & Issue Detection Engine

### 3.1 Matching Strategy
1. **Primary Match**: Match CSV record against `transactions` using `lifecycle_id` when present and non-empty.
2. **Fallback Match**: If `lifecycle_id` is empty or null, match using composite key `account_id` + `merchant_name` + `transaction_date`.
3. **Orphan Handling**: If no transaction matches, record in `unmatched_records` as an orphan settlement without aborting batch processing.
4. **Invalid Status Rejection**: If matched against a `FAILED` or `DECLINED` transaction (e.g. `SET017` -> `TXN015`), reject settlement capture, log to `invalid_settlement_attempts`, and flag the transaction as `CRITICAL`.
5. **Currency Consistency**: Ensure settlement currency matches transaction currency.

### 3.2 Settlement Calculations & Netting
Settlements are recorded in cents to prevent floating-point rounding errors:
$$\text{total\_settled\_amount} = \sum \text{DEBIT} - \sum \text{CREDIT}$$

* `last_settlement_date` is updated with $\max(\text{settlement\_date})$.

### 3.3 Settlement Status Transitions
* `PENDING`: No settlements captured yet (for `COMPLETED` transactions).
* `FULLY_SETTLED`: `total_settled_amount == transaction_amount`.
* `OVER_SETTLED`: `total_settled_amount > transaction_amount`.
* `REFUNDED`: Net `total_settled_amount < transaction_amount` AND transaction has one or more `CREDIT` (refund) settlements.
* `PARTIAL`: `total_settled_amount < transaction_amount` (and $> 0$) with ONLY `DEBIT` settlements.
* `NOT_APPLICABLE`: Default for `FAILED` or `DECLINED` transactions.

### 3.4 Issue Triage & Operational Recommendations
Every transaction is enriched with `issue_flag` (`CRITICAL`, `WARNING`, `NONE`), descriptive reason, and actionable recommendations:
* **Critical Issues (Red Flag)**:
  1. `OVER_SETTLED`: Total settled exceeds transaction amount.
     * *Action*: Audit settlement provider reports; initiate settlement clawback or investigate double-charging.
  2. Overdue Settlement (> 7 Days): `PENDING` transaction whose age exceeds 7 days relative to the reference settlement batch or current date (e.g. `TXN010` on `2025-08-07` compared against `2025-08-15`).
     * *Action*: Contact merchant acquirer or payment gateway operations to investigate pending clearance.
  3. Settlement on Inactive Transaction: Any `FAILED` or `DECLINED` transaction receiving a settlement attempt.
     * *Action*: Investigate gateway reconciliation logs immediately; confirm customer was not charged.
* **Warning Issues (Yellow Flag)**:
  * `PARTIAL`: Settled amount is less than transaction amount with debit-only settlements.
    * *Action*: Monitor upcoming settlement batches for the remaining balance or verify split capture.
* **Healthy / No Issues (`NONE`)**:
  * `FULLY_SETTLED` transactions.
  * `REFUNDED` transactions where `CREDIT` reduced net settlement (Scenario 3 / Scenario 7).
  * `PENDING` transactions within the 7-day SLA window.

---

## 4. REST API Documentation

### 4.1 `POST /reconcile`
Executes reconciliation against an uploaded CSV or the default `settlement_report.csv`.

* **Request**:
  * `multipart/form-data` with `file: <CSV file>` (optional). If omitted, processes `data/settlement_report.csv`.
* **Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Reconciliation process completed successfully.",
  "summary": {
    "total_records": 19,
    "processed_count": 19,
    "matched_count": 16,
    "unmatched_records": [
      {
        "settlement_id": "SET016",
        "lifecycle_id": "LC999",
        "account_id": "ACC199",
        "merchant_name": "Disney Plus",
        "settlement_amount": 99.99,
        "settlement_type": "DEBIT",
        "reason": "No matching transaction found in database via lifecycle_id or composite key..."
      },
      {
        "settlement_id": "SET018",
        "lifecycle_id": null,
        "account_id": "ACC777",
        "merchant_name": "Uber Taxi",
        "settlement_amount": 25.75,
        "settlement_type": "DEBIT",
        "reason": "No matching transaction found in database via lifecycle_id or composite key..."
      }
    ],
    "invalid_records": [
      {
        "settlement_id": "SET017",
        "transaction_id": "TXN015",
        "reason": "Settlement attempted on FAILED transaction (TXN: TXN015). Settlement rejected."
      }
    ],
    "duplicate_records": [],
    "updated_transactions_count": 11
  }
}
```

### 4.2 `GET /transactions`
Retrieves all transactions enriched with issue flags, reasons, and recommendations.

* **Query Parameters**:
  * `settlement_status` (optional): `PENDING`, `PARTIAL`, `FULLY_SETTLED`, `OVER_SETTLED`, `REFUNDED`, `NOT_APPLICABLE`.
* **Response (200 OK)**:
```json
{
  "status": "success",
  "count": 14,
  "data": [
    {
      "transaction_id": "TXN001",
      "lifecycle_id": "LC001",
      "account_id": "ACC123",
      "merchant_name": "Amazon.com",
      "transaction_date": "2025-08-14",
      "transaction_amount": 125.99,
      "currency": "USD",
      "status": "COMPLETED",
      "settlement_status": "FULLY_SETTLED",
      "total_settled_amount": 125.99,
      "last_settlement_date": "2025-08-15",
      "issue_flag": "NONE",
      "issue_description": null,
      "recommendation": null
    }
  ]
}
```

### 4.3 `GET /transactions/:id`
Retrieves a single transaction, its chronological settlement history, and detailed issue recommendations.

* **Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "transaction_id": "TXN004",
    "lifecycle_id": "LC004",
    "account_id": "ACC126",
    "merchant_name": "Best Buy",
    "transaction_date": "2025-08-14",
    "transaction_amount": 899.99,
    "currency": "USD",
    "status": "COMPLETED",
    "settlement_status": "REFUNDED",
    "total_settled_amount": 879.99,
    "last_settlement_date": "2025-08-15",
    "issue_flag": "NONE",
    "issue_description": null,
    "recommendation": null,
    "settlement_history": [
      {
        "settlement_id": "SET004",
        "transaction_id": "TXN004",
        "lifecycle_id": "LC004",
        "settlement_date": "2025-08-15",
        "settlement_amount": 899.99,
        "settlement_type": "DEBIT",
        "currency": "USD",
        "processed_at": "2026-10-16 11:30:00"
      },
      {
        "settlement_id": "SET005",
        "transaction_id": "TXN004",
        "lifecycle_id": "LC004",
        "settlement_date": "2025-08-15",
        "settlement_amount": 20.00,
        "settlement_type": "CREDIT",
        "currency": "USD",
        "processed_at": "2026-10-16 11:30:01"
      }
    ]
  }
}
```

### 4.4 `GET /dashboard/summary`
Retrieves aggregated metrics for the summary dashboard.

* **Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "total_transactions": 14,
    "total_settlements": 16,
    "status_breakdown": {
      "PENDING": 1,
      "PARTIAL": 1,
      "FULLY_SETTLED": 6,
      "OVER_SETTLED": 1,
      "REFUNDED": 3,
      "NOT_APPLICABLE": 2
    },
    "critical_issues_count": 3,
    "warnings_count": 1,
    "total_outstanding_amount": 25.99,
    "average_days_to_settle": 1.1,
    "settlement_rate_percentage": 75.0
  }
}
```

---

## 5. Setup & Run Instructions

### Prerequisites
* **Node.js** (v18+) or **Bun** (v1.1+) installed.

### 1. Install Dependencies
```bash
# Backend dependencies
cd backend
bun install

# Frontend dependencies
cd ../frontend
bun install
```

### 2. Seed Database
Initialize SQLite `reconciliation.db` with the 14 baseline test transactions:
```bash
cd backend
bun run seed
```

### 3. Start Backend Server
```bash
cd backend
bun start
# Server starts at http://localhost:5000
```

### 4. Launch React Frontend
```bash
cd frontend
bun run dev
# Dashboard launches at http://localhost:5173
```

### 5. Run Automated Test Suite
Run all 18 unit and integration tests:
```bash
cd backend
bun test
```

---

## 6. Business Scenarios & Verification Test Suite

The test suite in `backend/tests/reconciliation.test.ts` and `backend/tests/api.test.ts` verifies:
* **Scenario 1 — Perfect Match**: $100.00 transaction + $100.00 DEBIT $\rightarrow$ `FULLY_SETTLED`, `NONE`.
* **Scenario 2 — Partial Settlement**: $100.00 transaction + $80.00 DEBIT $\rightarrow$ `PARTIAL`, `WARNING`.
* **Scenario 3 — Over Settlement / Refund Netting**: $100.00 transaction + $100.00 DEBIT + $20.00 CREDIT $\rightarrow$ Net: $80.00, `REFUNDED`, `NONE`.
* **Scenario 4 — Over Settlement Critical**: $100.00 transaction + $120.00 DEBIT $\rightarrow$ `OVER_SETTLED`, `CRITICAL`.
* **Scenario 5 — Missing Lifecycle ID**: CSV record without `lifecycle_id` matching composite key (`account_id` + `merchant_name` + `transaction_date`) $\rightarrow$ Matched via fallback.
* **Scenario 6 — Status Transitions**: $100.00 `PENDING` $\rightarrow$ $50.00 DEBIT (`PARTIAL`) $\rightarrow$ $50.00 DEBIT (`FULLY_SETTLED`).
* **Scenario 7 — Complex Refund Case**: $100.00 transaction + $100.00 DEBIT + $30.00 CREDIT $\rightarrow$ Net: $70.00, `REFUNDED`.
* **SLA Overdue Flag**: `PENDING` transaction older than 7 days relative to settlement reference date $\rightarrow$ `CRITICAL`.
* **Invalid Transaction Settlement**: Settlement attempt on `FAILED`/`DECLINED` transaction rejected $\rightarrow$ `CRITICAL`.
* **Orphan Settlements**: Non-matching settlement records captured in summary without batch interruption.

---

## 7. Assumptions Made

1. **Orphan Settlements (`SET016`, `SET018`)**: Settlements that cannot be matched to any transaction in the database are treated as external orphans. They are not inserted into `settlement_history` to protect referential integrity, but are reported in `unmatched_records`.
2. **Settlements on Inactive Transactions (`SET017` $\rightarrow$ `TXN015`)**: Financial gateways occasionally misroute settlement batches for failed transactions. These settlements are rejected, recorded in `invalid_settlement_attempts`, and flag the target transaction as `CRITICAL` so operations can verify that customers were not debited.
3. **Reference Date for 7-Day Overdue Check**: When evaluating overdue transactions (such as `TXN010`), the reference date is taken as $\max(\text{settlement\_date})$ from the settlement history (e.g. `2025-08-15`), with a fallback to the current date, ensuring reproducible SLA checks across historical batches.
4. **Refund Status Nuance**: When a completed transaction has debit settlement followed by credit (refund) settlement resulting in net settled $< \text{transaction\_amount}$, status is `REFUNDED` and does **not** trigger a partial warning.

---

## 8. Known Limitations & Production Roadmap

1. **Large Batch Streaming**: The current CSV parser processes uploads in-memory. For enterprise files (> 1 million rows), a streaming pipeline (e.g. Node stream with `readline` or Worker threads) would optimize memory usage.
2. **Idempotency Keys**: Batch upload jobs can be assigned an `upload_batch_id` to allow point-in-time rollbacks.
3. **Multi-Currency FX Rates**: Currently currency consistency is strictly enforced (e.g. USD to USD). Production gateways could support dynamic FX conversions.
