import { useEffect, useState, type FC } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  Receipt,
  ShieldCheck,
  Store,
  User,
  X,
} from 'lucide-react';
import type { TransactionDetail } from '../types';
import { fetchTransactionDetail } from '../api/client';
import { StatusBadge } from './StatusBadge';
import { IssueBadge } from './IssueBadge';

interface TransactionDetailModalProps {
  transactionId: string | null;
  onClose: () => void;
}

export const TransactionDetailModal: FC<TransactionDetailModalProps> = ({
  transactionId,
  onClose,
}) => {
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!transactionId) {
      setDetail(null);
      return;
    }

    const loadDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTransactionDetail(transactionId);
        setDetail(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load transaction details');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [transactionId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!transactionId) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const remainingVariance = detail
    ? Math.round((detail.transaction_amount - detail.total_settled_amount) * 100) / 100
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Receipt size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 font-mono">
                    {transactionId}
                  </h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(transactionId)}
                    title="Copy Transaction ID"
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors"
                  >
                    {copiedId ? (
                      <Check size={14} className="text-emerald-600" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Transaction Audit Trail & Settlement Breakdown
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading && (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 size={36} className="animate-spin text-blue-600" />
                <span className="text-xs font-semibold text-slate-600">
                  Fetching ledger audit trail...
                </span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold">Unable to Load Transaction</h4>
                  <p className="mt-0.5 text-rose-700">{error}</p>
                </div>
              </div>
            )}

            {detail && !loading && (
              <>
                {/* Status & Issue Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Settlement Status:
                    </span>
                    <StatusBadge status={detail.settlement_status} size="lg" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Discrepancy Triage:
                    </span>
                    <IssueBadge flag={detail.issue_flag} size="lg" />
                  </div>
                </div>

                {/* Issue Details & Recommendations Panel */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    detail.issue_flag === 'CRITICAL'
                      ? 'bg-gradient-to-br from-rose-50/90 to-red-50/40 border-rose-200 text-rose-950 shadow-xs'
                      : detail.issue_flag === 'WARNING'
                      ? 'bg-gradient-to-br from-amber-50/90 to-yellow-50/40 border-amber-200 text-amber-950 shadow-xs'
                      : 'bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border-emerald-200 text-emerald-950 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        detail.issue_flag === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-600'
                          : detail.issue_flag === 'WARNING'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {detail.issue_flag === 'CRITICAL' ? (
                        <AlertCircle size={20} />
                      ) : detail.issue_flag === 'WARNING' ? (
                        <AlertTriangle size={20} />
                      ) : (
                        <ShieldCheck size={20} />
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider">
                          {detail.issue_flag === 'CRITICAL'
                            ? 'Critical Action Required'
                            : detail.issue_flag === 'WARNING'
                            ? 'Warning / Follow-Up Needed'
                            : 'Fully Reconciled & Compliant'}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            detail.issue_flag === 'CRITICAL'
                              ? 'bg-rose-200/80 text-rose-800'
                              : detail.issue_flag === 'WARNING'
                              ? 'bg-amber-200/80 text-amber-800'
                              : 'bg-emerald-200/80 text-emerald-800'
                          }`}
                        >
                          SLA Status
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed font-medium">
                        {detail.issue_description ||
                          'Transaction amounts perfectly match settled funds. No discrepancies found.'}
                      </p>

                      {detail.recommendation && (
                        <div className="mt-3 pt-3 border-t border-black/10">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 block mb-1">
                            Actionable Next Steps for Operations:
                          </span>
                          <p className="text-xs leading-relaxed italic bg-white/60 p-2.5 rounded-xl border border-black/5">
                            "{detail.recommendation}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Position Metric Highlights */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Transaction Amount
                    </span>
                    <span className="text-lg font-extrabold text-slate-900 font-mono">
                      {formatCurrency(detail.transaction_amount, detail.currency)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Total Settled Net
                    </span>
                    <span
                      className={`text-lg font-extrabold font-mono ${
                        detail.total_settled_amount > detail.transaction_amount
                          ? 'text-rose-600'
                          : detail.total_settled_amount === detail.transaction_amount
                          ? 'text-emerald-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(detail.total_settled_amount, detail.currency)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Variance
                    </span>
                    <span
                      className={`text-lg font-extrabold font-mono ${
                        remainingVariance > 0
                          ? 'text-amber-600'
                          : remainingVariance < 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {remainingVariance > 0
                        ? `-${formatCurrency(remainingVariance, detail.currency)}`
                        : remainingVariance < 0
                        ? `+${formatCurrency(Math.abs(remainingVariance), detail.currency)}`
                        : '$0.00'}
                    </span>
                  </div>
                </div>

                {/* Complete Transaction Metadata Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Hash size={13} className="text-blue-600" />
                      Transaction Metadata
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {detail.transaction_id}
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                        Merchant Name
                      </span>
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Store size={14} className="text-slate-400" />
                        {detail.merchant_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                        Account ID
                      </span>
                      <span className="font-mono font-semibold text-slate-900 flex items-center gap-1.5">
                        <User size={14} className="text-slate-400" />
                        {detail.account_id}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                        Lifecycle ID
                      </span>
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                        {detail.lifecycle_id || 'Not Assigned (Matched via Fallback)'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                        Gateway Status
                      </span>
                      <span
                        className={`font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded-md inline-block ${
                          detail.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {detail.status}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                        Transaction Date
                      </span>
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {detail.transaction_date}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] font-medium mb-0.5">
                        Last Settlement Date
                      </span>
                      <span className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {detail.last_settlement_date || 'No Settlements Processed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Settlement History Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={14} className="text-indigo-600" />
                        Settlement History Ledger ({detail.settlement_history.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Chronological record of debit clearance and credit refund events
                      </p>
                    </div>

                    <span className="text-[11px] font-mono font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                      Net: {formatCurrency(detail.total_settled_amount, detail.currency)}
                    </span>
                  </div>

                  {detail.settlement_history.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-2">
                      <HelpCircle size={28} className="mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        No settlements captured yet
                      </p>
                      <p className="text-slate-400 max-w-sm mx-auto">
                        This transaction is currently in {detail.settlement_status} status.
                        Run the reconciliation batch to process matching settlement reports.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3.5">Settlement ID</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3.5 text-right">Amount</th>
                            <th className="py-2.5 px-3.5 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detail.settlement_history.map((s) => (
                            <tr
                              key={s.settlement_id}
                              className="hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="py-3 px-3.5 font-mono font-semibold text-slate-800">
                                {s.settlement_id}
                              </td>
                              <td className="py-3 px-3 text-slate-600 font-mono">
                                {s.settlement_date}
                              </td>
                              <td className="py-3 px-3">
                                {s.settlement_type === 'DEBIT' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                    <ArrowDownLeft size={11} />
                                    DEBIT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
                                    <ArrowUpRight size={11} />
                                    CREDIT (Refund)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                                {s.settlement_type === 'CREDIT' ? '-' : '+'}
                                {formatCurrency(s.settlement_amount, s.currency)}
                              </td>
                              <td className="py-3 px-3.5 text-right text-slate-400 font-mono text-[11px]">
                                {s.processed_at
                                  ? new Date(s.processed_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">ESC</kbd> to exit
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
