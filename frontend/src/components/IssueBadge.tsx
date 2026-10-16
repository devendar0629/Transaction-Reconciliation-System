import type { FC } from 'react';
import type { IssueFlag } from '../types';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface IssueBadgeProps {
  flag: IssueFlag;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const IssueBadge: FC<IssueBadgeProps> = ({
  flag,
  size = 'md',
  showIcon = true,
}) => {
  const iconSize = size === 'sm' ? 11 : size === 'lg' ? 14 : 12;

  if (flag === 'CRITICAL') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ring-1 ring-rose-500/10 shadow-2xs ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[11px]'
            : size === 'lg'
            ? 'px-3 py-1.5 text-xs'
            : 'px-2.5 py-1 text-xs'
        }`}
      >
        {showIcon && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
          </span>
        )}
        <AlertCircle size={iconSize} className="text-rose-600 shrink-0" />
        <span>Critical</span>
      </span>
    );
  }

  if (flag === 'WARNING') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ring-1 ring-amber-500/10 shadow-2xs ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[11px]'
            : size === 'lg'
            ? 'px-3 py-1.5 text-xs'
            : 'px-2.5 py-1 text-xs'
        }`}
      >
        {showIcon && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        )}
        <AlertTriangle size={iconSize} className="text-amber-600 shrink-0" />
        <span>Warning</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 ring-1 ring-emerald-500/10 shadow-2xs ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[11px]'
          : size === 'lg'
          ? 'px-3 py-1.5 text-xs'
          : 'px-2.5 py-1 text-xs'
      }`}
    >
      {showIcon && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      )}
      <CheckCircle2 size={iconSize} className="text-emerald-600 shrink-0" />
      <span>Healthy</span>
    </span>
  );
};
