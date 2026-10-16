import type { FC } from 'react';
import type { SettlementStatus } from '../types';

interface StatusBadgeProps {
  status: SettlementStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const StatusBadge: FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const getBadgeStyle = (s: SettlementStatus) => {
    switch (s) {
      case 'FULLY_SETTLED':
        return 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 ring-emerald-500/10 shadow-2xs';
      case 'PARTIAL':
        return 'bg-amber-50/90 text-amber-700 border-amber-200/80 ring-amber-500/10 shadow-2xs';
      case 'OVER_SETTLED':
        return 'bg-rose-50/90 text-rose-700 border-rose-200/80 ring-rose-500/10 shadow-2xs';
      case 'REFUNDED':
        return 'bg-purple-50/90 text-purple-700 border-purple-200/80 ring-purple-500/10 shadow-2xs';
      case 'PENDING':
        return 'bg-sky-50/90 text-sky-700 border-sky-200/80 ring-sky-500/10 shadow-2xs';
      case 'NOT_APPLICABLE':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/10';
    }
  };

  const getDotColor = (s: SettlementStatus) => {
    switch (s) {
      case 'FULLY_SETTLED':
        return 'bg-emerald-500';
      case 'PARTIAL':
        return 'bg-amber-500';
      case 'OVER_SETTLED':
        return 'bg-rose-500 animate-pulse';
      case 'REFUNDED':
        return 'bg-purple-500';
      case 'PENDING':
        return 'bg-sky-500';
      case 'NOT_APPLICABLE':
      default:
        return 'bg-slate-400';
    }
  };

  const getLabel = (s: SettlementStatus) => {
    switch (s) {
      case 'FULLY_SETTLED':
        return 'Fully Settled';
      case 'PARTIAL':
        return 'Partial';
      case 'OVER_SETTLED':
        return 'Over Settled';
      case 'REFUNDED':
        return 'Refunded';
      case 'PENDING':
        return 'Pending';
      case 'NOT_APPLICABLE':
        return 'Failed / Declined';
      default:
        return s;
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs font-semibold'
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ring-1 ring-inset font-medium tracking-tight whitespace-nowrap transition-all ${getBadgeStyle(
        status
      )} ${sizeClasses}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(status)}`} />
      )}
      <span>{getLabel(status)}</span>
    </span>
  );
};
