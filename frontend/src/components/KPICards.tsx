import type { FC } from 'react';
import type { DashboardSummary } from '../types';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  DollarSign,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface KPICardsProps {
  summary: DashboardSummary | null;
  loading?: boolean;
  onNavigateToIssues?: (severity?: 'CRITICAL' | 'WARNING') => void;
}

export const KPICards: FC<KPICardsProps> = ({
  summary,
  loading,
  onNavigateToIssues,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-36 bg-white/60 rounded-2xl border border-slate-200/80 p-5 space-y-3"
          >
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-8 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const hasCritical = summary.critical_issues_count > 0;
  const hasWarnings = summary.warnings_count > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Transactions & Settlement Volume */}
      <div className="relative group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Ledger Volume
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/10">
            <Layers size={18} />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {summary.total_transactions}
            </span>
            <span className="text-xs font-medium text-slate-500">transactions</span>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Settlements Captured
            </span>
            <span className="font-semibold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
              {summary.total_settlements} records
            </span>
          </div>
        </div>
      </div>

      {/* 2. Critical Exceptions & Discrepancies */}
      <div
        onClick={() => onNavigateToIssues && onNavigateToIssues('CRITICAL')}
        className={`relative group bg-white rounded-2xl p-5 border transition-all duration-200 overflow-hidden cursor-pointer ${
          hasCritical
            ? 'border-rose-200 bg-gradient-to-b from-rose-50/40 to-white shadow-xs hover:shadow-rose-500/10 hover:shadow-md hover:border-rose-300'
            : 'border-slate-200/80 shadow-xs hover:shadow-md'
        }`}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            hasCritical
              ? 'bg-gradient-to-r from-rose-500 to-red-600'
              : 'bg-gradient-to-r from-emerald-400 to-teal-500'
          }`}
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              hasCritical ? 'text-rose-700' : 'text-slate-500'
            }`}
          >
            Exceptions & Triage
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${
              hasCritical
                ? 'bg-rose-100/80 text-rose-600 ring-rose-500/20'
                : 'bg-emerald-50 text-emerald-600 ring-emerald-500/10'
            }`}
          >
            <AlertOctagon size={18} />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight font-mono ${
                hasCritical ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {summary.critical_issues_count}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                hasCritical
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {hasCritical ? 'Critical Flags' : 'Zero Critical'}
            </span>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <AlertTriangle
                size={13}
                className={hasWarnings ? 'text-amber-500' : 'text-slate-400'}
              />
              Warnings
            </span>
            <span className="font-semibold text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
              {summary.warnings_count} flagged
            </span>
          </div>
        </div>
      </div>

      {/* 3. Total Outstanding Unreconciled Amount */}
      <div className="relative group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outstanding Unreconciled
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-500/10">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {formatCurrency(summary.total_outstanding_amount)}
            </span>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock size={13} className="text-amber-500" />
              SLA Window
            </span>
            <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Pending / Partial
            </span>
          </div>
        </div>
      </div>

      {/* 4. Settlement Performance Metrics */}
      <div className="relative group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Settlement Rate
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/10">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
                {summary.settlement_rate_percentage}%
              </span>
              <span className="text-xs font-medium text-emerald-600">reconciled</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              Avg {summary.average_days_to_settle}d
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, summary.settlement_rate_percentage)}%` }}
            />
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-500" />
              Speed to Settle
            </span>
            <span className="font-semibold text-slate-800 font-mono">
              {summary.average_days_to_settle} days
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
