import type { FC } from 'react';
import {
  AlertOctagon,
  Database,
  FileSpreadsheet,
  LayoutDashboard,
  Play,
  Receipt,
  RefreshCw,
  Scale,
} from 'lucide-react';

export type NavigationTab = 'overview' | 'ledger' | 'studio' | 'exceptions';

interface NavbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onQuickReconcile: () => void;
  reconciling: boolean;
  criticalCount: number;
}

export const Navbar: FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onRefresh,
  refreshing,
  onQuickReconcile,
  reconciling,
  criticalCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                  ReconPulse
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wider">
                  FinOps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Transaction Reconciliation & Settlement Ledger
              </p>
            </div>
          </div>

          {/* Navigation Tabs (Centered / Main) */}
          <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => onTabChange('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard size={14} className="shrink-0" />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt size={14} className="shrink-0" />
              <span>Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('exceptions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentTab === 'exceptions'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertOctagon size={14} className={criticalCount > 0 ? 'text-rose-600 shrink-0' : 'shrink-0'} />
              <span>Exceptions</span>
              {criticalCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {criticalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentTab === 'studio'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet size={14} className="shrink-0" />
              <span>Reconcile Studio</span>
            </button>
          </nav>

          {/* Quick Actions & DB Indicator */}
          <div className="flex items-center gap-2.5">
            {/* Quick Reconcile CTA button */}
            <button
              type="button"
              onClick={onQuickReconcile}
              disabled={reconciling}
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Play size={13} className="fill-current" />
              <span>Run Reconcile</span>
            </button>

            {/* DB Health Pill */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <Database size={13} className="text-emerald-600" />
              <span className="font-mono text-[11px]">reconciliation.db</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh ledger data"
              className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin text-blue-600' : ''}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
