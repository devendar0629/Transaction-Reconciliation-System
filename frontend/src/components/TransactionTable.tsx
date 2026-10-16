import { useState, useMemo, type FC } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Search,
  Store,
  X,
} from 'lucide-react';
import type { EnrichedTransaction, IssueFlag, SettlementStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { IssueBadge } from './IssueBadge';

interface TransactionTableProps {
  transactions: EnrichedTransaction[];
  loading?: boolean;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onSelectTransaction: (txnId: string) => void;
  initialIssueFilter?: 'ALL' | IssueFlag;
}

const STATUS_TABS: { key: string; label: string; countKey?: SettlementStatus }[] = [
  { key: 'ALL', label: 'All Records' },
  { key: 'PENDING', label: 'Pending', countKey: 'PENDING' },
  { key: 'PARTIAL', label: 'Partial', countKey: 'PARTIAL' },
  { key: 'FULLY_SETTLED', label: 'Fully Settled', countKey: 'FULLY_SETTLED' },
  { key: 'OVER_SETTLED', label: 'Over Settled', countKey: 'OVER_SETTLED' },
  { key: 'REFUNDED', label: 'Refunded', countKey: 'REFUNDED' },
  { key: 'NOT_APPLICABLE', label: 'Failed/Declined', countKey: 'NOT_APPLICABLE' },
];

export const TransactionTable: FC<TransactionTableProps> = ({
  transactions,
  loading,
  selectedStatus,
  onStatusChange,
  onSelectTransaction,
  initialIssueFilter = 'ALL',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [issueFilter, setIssueFilter] = useState<'ALL' | IssueFlag>(
    initialIssueFilter
  );
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute status counts for tab badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: transactions.length };
    for (const t of transactions) {
      counts[t.settlement_status] = (counts[t.settlement_status] || 0) + 1;
    }
    return counts;
  }, [transactions]);

  // Filtered & sorted records
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((txn) => {
        // Search filter
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !query ||
          txn.transaction_id.toLowerCase().includes(query) ||
          txn.merchant_name.toLowerCase().includes(query) ||
          txn.account_id.toLowerCase().includes(query) ||
          (txn.lifecycle_id && txn.lifecycle_id.toLowerCase().includes(query));

        // Issue flag filter
        const matchesIssue =
          issueFilter === 'ALL' || txn.issue_flag === issueFilter;

        return matchesSearch && matchesIssue;
      })
      .sort((a, b) => {
        if (sortBy === 'amount-desc') return b.transaction_amount - a.transaction_amount;
        if (sortBy === 'amount-asc') return a.transaction_amount - b.transaction_amount;
        if (sortBy === 'date-asc') return a.transaction_date.localeCompare(b.transaction_date);
        return b.transaction_date.localeCompare(a.transaction_date);
      });
  }, [transactions, searchTerm, issueFilter, sortBy]);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = [
      'Transaction ID',
      'Lifecycle ID',
      'Account ID',
      'Merchant',
      'Date',
      'Amount',
      'Currency',
      'Gateway Status',
      'Settlement Status',
      'Settled Amount',
      'Issue Flag',
      'Issue Description',
    ];
    const rows = filteredTransactions.map((t) => [
      t.transaction_id,
      t.lifecycle_id || '',
      t.account_id,
      `"${t.merchant_name}"`,
      t.transaction_date,
      t.transaction_amount,
      t.currency,
      t.status,
      t.settlement_status,
      t.total_settled_amount,
      t.issue_flag,
      `"${t.issue_description || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reconciliation_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Controls Bar */}
      <div className="p-5 border-b border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Transaction Operations Ledger
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {filteredTransactions.length} of {transactions.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive ledger with multi-level filtering, discrepancy indicators, and full audit drilldown
            </p>
          </div>

          {/* Search, Filter & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search box */}
            <div className="relative flex-1 sm:flex-initial">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search TXN, merchant, account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Issue Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter size={13} className="text-slate-400" />
              <select
                value={issueFilter}
                onChange={(e) => setIssueFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL">All Issue Severities</option>
                <option value="CRITICAL">Critical Red Flags</option>
                <option value="WARNING">Warnings</option>
                <option value="NONE">Healthy Only</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="date-desc">Newest Date First</option>
                <option value="date-asc">Oldest Date First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>

            {/* Export CSV button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              title="Export visible records to CSV"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Download size={13} />
              Export
            </button>
          </div>
        </div>

        {/* Status Filter Tabs Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar border-t border-slate-100">
          {STATUS_TABS.map((tab) => {
            const active = selectedStatus === tab.key;
            const count = tab.key === 'ALL' ? transactions.length : statusCounts[tab.key] || 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onStatusChange(tab.key)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    active
                      ? 'bg-blue-700/80 text-white font-bold'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-5">Transaction ID</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Merchant & Account</th>
              <th className="py-3 px-4 text-right">Transaction Amount</th>
              <th className="py-3 px-4 text-center">Settlement Status</th>
              <th className="py-3 px-4 text-right">Settled Amount</th>
              <th className="py-3 px-4 text-center">Issue Flag</th>
              <th className="py-3 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="py-4 px-5">
                    <div className="h-4 bg-slate-100 rounded-md w-full" />
                  </td>
                </tr>
              ))
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    No transactions match your criteria
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try adjusting the search query or settlement status filters
                  </p>
                  {(searchTerm || issueFilter !== 'ALL' || selectedStatus !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setIssueFilter('ALL');
                        onStatusChange('ALL');
                      }}
                      className="mt-3 px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn) => {
                const variance =
                  Math.round(
                    (txn.transaction_amount - txn.total_settled_amount) * 100
                  ) / 100;
                return (
                  <tr
                    key={txn.transaction_id}
                    onClick={() => onSelectTransaction(txn.transaction_id)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                  >
                    {/* Transaction ID & Lifecycle */}
                    <td className="py-3.5 px-5 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {txn.transaction_id}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => copyToClipboard(txn.transaction_id, e)}
                          title="Copy ID"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition-opacity"
                        >
                          {copiedId === txn.transaction_id ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      {txn.lifecycle_id ? (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {txn.lifecycle_id}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Fallback match
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar size={13} className="text-slate-400" />
                        {txn.transaction_date}
                      </span>
                    </td>

                    {/* Merchant & Account */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Store size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{txn.merchant_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {txn.account_id}
                      </div>
                    </td>

                    {/* Transaction Amount */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(txn.transaction_amount, txn.currency)}
                    </td>

                    {/* Settlement Status */}
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={txn.settlement_status} />
                    </td>

                    {/* Settled Amount */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div
                        className={`font-bold ${
                          txn.settlement_status === 'OVER_SETTLED'
                            ? 'text-rose-600'
                            : txn.settlement_status === 'FULLY_SETTLED'
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(txn.total_settled_amount, txn.currency)}
                      </div>
                      {variance !== 0 && txn.settlement_status === 'PARTIAL' && (
                        <div className="text-[10px] text-amber-600 font-medium">
                          -{formatCurrency(variance, txn.currency)} rem
                        </div>
                      )}
                    </td>

                    {/* Issue Flag */}
                    <td className="py-3.5 px-4 text-center">
                      <IssueBadge flag={txn.issue_flag} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all">
                        Details
                        <ChevronRight size={14} />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            Displaying <b>{filteredTransactions.length}</b> transactions
          </span>
          {issueFilter !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[11px] font-semibold">
              Filter: {issueFilter}
            </span>
          )}
        </div>
        <span className="text-[11px] text-slate-400">
          Click any transaction row to open the complete audit trail and recommendations drawer
        </span>
      </div>
    </div>
  );
};
