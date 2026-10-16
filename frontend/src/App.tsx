import { useEffect, useState, useCallback } from 'react';
import type { DashboardSummary, EnrichedTransaction } from './types';
import { fetchDashboardSummary, fetchTransactions, triggerReconciliation } from './api/client';
import { Navbar, type NavigationTab } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { StatusChart } from './components/StatusChart';
import { ReconciliationAction } from './components/ReconciliationAction';
import { TransactionTable } from './components/TransactionTable';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import {
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  FileCode,
  Info,
  ShieldAlert,
} from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [quickReconciling, setQuickReconciling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [summaryData, txnData] = await Promise.all([
        fetchDashboardSummary(),
        fetchTransactions(selectedStatus),
      ]);

      setSummary(summaryData);
      setTransactions(txnData);
    } catch (err: any) {
      console.error('Data loading error:', err);
      setError(err.message || 'Could not connect to the reconciliation backend API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickReconcile = async () => {
    try {
      setQuickReconciling(true);
      const res = await triggerReconciliation();
      showToast(
        `Batch reconciled: ${res.summary.matched_count} matched, ${res.summary.unmatched_records.length} orphans, ${res.summary.invalid_records.length} rejected.`
      );
      await loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Quick reconcile failed', 'error');
    } finally {
      setQuickReconciling(false);
    }
  };

  const criticalExceptions = transactions.filter(
    (t) => t.issue_flag === 'CRITICAL' || t.issue_flag === 'WARNING'
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold text-white ${
              toastMessage.type === 'error'
                ? 'bg-rose-600'
                : toastMessage.type === 'info'
                ? 'bg-blue-600'
                : 'bg-slate-900'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top App Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
        onQuickReconcile={handleQuickReconcile}
        reconciling={quickReconciling}
        criticalCount={summary?.critical_issues_count || 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Backend Connection Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>
                <b>Backend Connection Offline:</b> {error}. Verify that the Express server is running on port 5000.
              </span>
            </div>
            <button
              type="button"
              onClick={() => loadData(true)}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. OVERVIEW & ANALYTICS VIEW */}
        {currentTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Reconciliation Hero Callout */}
            <section>
              <ReconciliationAction
                onReconciliationComplete={() => {
                  loadData(true);
                  showToast('Reconciliation batch successfully completed!');
                }}
              />
            </section>

            {/* KPI Cards */}
            <section>
              <KPICards
                summary={summary}
                loading={loading}
                onNavigateToIssues={() => setCurrentTab('exceptions')}
              />
            </section>

            {/* Visual Charts */}
            {summary && (
              <section>
                <StatusChart
                  statusBreakdown={summary.status_breakdown}
                  onSelectStatus={(status) => {
                    setSelectedStatus(status);
                    setCurrentTab('ledger');
                  }}
                />
              </section>
            )}

            {/* Exceptions Alert Callout (if any critical or warning issues exist) */}
            {criticalExceptions.length > 0 && (
              <section className="bg-gradient-to-r from-rose-50/80 via-white to-amber-50/60 p-5 rounded-2xl border border-rose-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {summary?.critical_issues_count || 0} Critical Discrepancies & {summary?.warnings_count || 0} Warnings Detected
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                      Automated audit rules identified transactions with over-settlements, SLA breaches (&gt;7 days overdue), or settlement attempts on failed transactions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentTab('exceptions')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer self-start sm:self-auto"
                >
                  <span>Review Exceptions</span>
                  <ArrowRight size={14} />
                </button>
              </section>
            )}

            {/* Recent Transactions Table Preview */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Transaction Operations Ledger
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live view of current ledger entries and settlement transitions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentTab('ledger')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Ledger</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <TransactionTable
                transactions={transactions}
                loading={loading}
                selectedStatus={selectedStatus}
                onStatusChange={(status) => setSelectedStatus(status)}
                onSelectTransaction={(id) => setSelectedTxnId(id)}
              />
            </section>
          </div>
        )}

        {/* 2. TRANSACTIONS LEDGER VIEW */}
        {currentTab === 'ledger' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Transaction Ledger & Reconciliation Records
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive audit trail of all financial transactions, settlement statuses, and SLA compliance
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('ALL')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Show All Records
                </button>
              </div>
            </div>

            <TransactionTable
              transactions={transactions}
              loading={loading}
              selectedStatus={selectedStatus}
              onStatusChange={(status) => setSelectedStatus(status)}
              onSelectTransaction={(id) => setSelectedTxnId(id)}
            />
          </div>
        )}

        {/* 3. EXCEPTIONS & TRIAGE VIEW */}
        {currentTab === 'exceptions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-3 border-b border-slate-200">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Discrepancy Triage & Exception Management
              </h2>
              <p className="text-xs text-slate-500">
                Actionable dashboard of all flagged transactions requiring operational review or settlement clawback
              </p>
            </div>

            {/* Explanatory SLA & Rule Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                  <AlertOctagon size={16} />
                  <span>Critical: Over-Settlements</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Total settled funds exceed original transaction amount. Operations must audit duplicate batches and trigger clawbacks.
                </p>
              </div>

              <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                  <AlertOctagon size={16} />
                  <span>Critical: SLA Overdue (&gt; 7 Days)</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Pending settlements past 7 days from transaction date breach SLAs (e.g. TXN010). Gateway clearance inquiry needed.
                </p>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Info size={16} />
                  <span>Warning: Partial Settlements</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Debit settled is less than transaction amount with no credit refund. Monitor upcoming cycles for residual balance.
                </p>
              </div>
            </div>

            {/* Filtered Table showing ONLY Exceptions */}
            <TransactionTable
              transactions={criticalExceptions}
              loading={loading}
              selectedStatus="ALL"
              onStatusChange={() => {}}
              onSelectTransaction={(id) => setSelectedTxnId(id)}
              initialIssueFilter="ALL"
            />
          </div>
        )}

        {/* 4. RECONCILIATION STUDIO VIEW */}
        {currentTab === 'studio' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="pb-3 border-b border-slate-200">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Reconciliation Batch Studio
              </h2>
              <p className="text-xs text-slate-500">
                Execute reconciliation batches from local CSV reports or trigger the automated benchmark dataset
              </p>
            </div>

            {/* Standalone Reconciliation Action & Dropzone */}
            <ReconciliationAction
              standalone={true}
              onReconciliationComplete={() => {
                loadData(true);
                showToast('Batch reconciliation finished!');
              }}
            />

            {/* Specification Guidelines & Architecture reference */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileCode size={18} className="text-blue-600" />
                <span>Reconciliation Matching Engine Logic</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    1. Primary & Fallback Matching
                  </h4>
                  <p className="leading-relaxed">
                    Records with a non-empty <b>lifecycle_id</b> match directly to the transaction.
                    Records without lifecycle_id fallback to the composite key of <b>account_id + merchant_name + transaction_date</b>.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-indigo-600" />
                    2. Net Calculations & Refund Rules
                  </h4>
                  <p className="leading-relaxed">
                    Net settled total is calculated as <b>Σ(DEBIT) - Σ(CREDIT)</b>. When a credit refund reduces
                    net settlement below the transaction amount, status is classified as <b>REFUNDED</b> and
                    no warning is flagged per business scenario 3.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Transaction Detail Drawer */}
      <TransactionDetailModal
        transactionId={selectedTxnId}
        onClose={() => setSelectedTxnId(null)}
      />

      {/* Modern Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">ReconPulse</span>
            <span>&copy; 2026 Financial Operations Platform</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Inter Typography</span>
            <span>·</span>
            <span>Express & TypeScript</span>
            <span>·</span>
            <span>SQLite reconciliation.db</span>
            <span>·</span>
            <span>React 19 & Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
