import type {
  DashboardSummary,
  EnrichedTransaction,
  ReconciliationSummary,
  TransactionDetail,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard summary (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchTransactions(
  statusFilter?: string
): Promise<EnrichedTransaction[]> {
  const url = new URL(`${API_BASE_URL}/transactions`);
  if (statusFilter && statusFilter !== 'ALL') {
    url.searchParams.set('settlement_status', statusFilter);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to fetch transactions (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchTransactionDetail(id: string): Promise<TransactionDetail> {
  const res = await fetch(`${API_BASE_URL}/transactions/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch transaction detail (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

export async function triggerReconciliation(
  file?: File
): Promise<{ message: string; summary: ReconciliationSummary }> {
  let options: RequestInit = {
    method: 'POST',
  };

  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    options.body = formData;
  }

  const res = await fetch(`${API_BASE_URL}/reconcile`, options);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Reconciliation failed');
  }
  return json;
}

export async function resetDatabase(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/reconcile/reset`, {
    method: 'POST',
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || 'Reset failed');
  }
  return json;
}
