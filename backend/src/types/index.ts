export type TransactionStatus = 'COMPLETED' | 'FAILED' | 'DECLINED';

export type SettlementStatus =
  | 'PENDING'
  | 'PARTIAL'
  | 'FULLY_SETTLED'
  | 'OVER_SETTLED'
  | 'REFUNDED'
  | 'NOT_APPLICABLE';

export type SettlementType = 'DEBIT' | 'CREDIT';

export type IssueFlag = 'CRITICAL' | 'WARNING' | 'NONE';

export interface Transaction {
  transaction_id: string;
  lifecycle_id: string | null;
  account_id: string;
  merchant_name: string;
  transaction_date: string;
  transaction_amount: number;
  currency: string;
  status: TransactionStatus;
  settlement_status: SettlementStatus;
  total_settled_amount: number;
  last_settlement_date: string | null;
  created_at?: string;
  settlement_attempt_on_invalid?: number; // 1 if FAILED/DECLINED txn received an invalid settlement attempt
}

export interface SettlementHistory {
  settlement_id: string;
  transaction_id: string | null;
  lifecycle_id: string | null;
  settlement_date: string;
  settlement_amount: number;
  settlement_type: SettlementType;
  currency: string;
  processed_at?: string;
}

export interface EnrichedTransaction extends Transaction {
  issue_flag: IssueFlag;
  issue_description: string | null;
  recommendation: string | null;
}

export interface TransactionDetail extends EnrichedTransaction {
  settlement_history: SettlementHistory[];
}

export interface CSVSettlementRecord {
  settlement_id: string;
  lifecycle_id: string | null;
  account_id: string;
  merchant_name: string;
  transaction_date: string;
  settlement_date: string;
  settlement_amount: number;
  settlement_type: SettlementType;
  currency: string;
}

export interface UnmatchedRecord {
  settlement_id: string;
  lifecycle_id: string | null;
  account_id: string;
  merchant_name: string;
  settlement_amount: number;
  settlement_type: string;
  reason: string;
}

export interface InvalidRecord {
  settlement_id: string;
  transaction_id: string;
  reason: string;
}

export interface DuplicateRecord {
  settlement_id: string;
  reason: string;
}

export interface ReconciliationSummary {
  total_records: number;
  processed_count: number;
  matched_count: number;
  unmatched_records: UnmatchedRecord[];
  invalid_records: InvalidRecord[];
  duplicate_records: DuplicateRecord[];
  updated_transactions_count: number;
}

export interface DashboardSummary {
  total_transactions: number;
  total_settlements: number;
  status_breakdown: Record<SettlementStatus, number>;
  critical_issues_count: number;
  warnings_count: number;
  total_outstanding_amount: number;
  average_days_to_settle: number;
  settlement_rate_percentage: number;
}
