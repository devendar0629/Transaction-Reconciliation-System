import { useRef, useState, type FC, type ChangeEvent, type DragEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  HelpCircle,
  Loader2,
  Play,
  RotateCcw,
  UploadCloud,
  X,
} from 'lucide-react';
import type { ReconciliationSummary } from '../types';
import { resetDatabase, triggerReconciliation } from '../api/client';

interface ReconciliationActionProps {
  onReconciliationComplete: () => void;
  standalone?: boolean;
}

export const ReconciliationAction: FC<ReconciliationActionProps> = ({
  onReconciliationComplete,
  standalone = false,
}) => {
  const [running, setRunning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRunDefault = async () => {
    try {
      setRunning(true);
      setError(null);
      const res = await triggerReconciliation();
      setSummary(res.summary);
      setShowSummaryModal(true);
      onReconciliationComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to execute reconciliation');
    } finally {
      setRunning(false);
    }
  };

  const handleExecuteUpload = async (fileToUpload?: File) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    try {
      setRunning(true);
      setError(null);
      const res = await triggerReconciliation(file);
      setSummary(res.summary);
      setShowSummaryModal(true);
      setSelectedFile(null);
      onReconciliationComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to process uploaded settlement file');
    } finally {
      setRunning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleExecuteUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      handleExecuteUpload(file);
    } else {
      setError('Please upload a valid .csv settlement file.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset database to initial baseline transactions? This clears settlement history.')) {
      return;
    }
    try {
      setResetting(true);
      setError(null);
      await resetDatabase();
      setSummary(null);
      setSelectedFile(null);
      onReconciliationComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to reset database');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <div
        className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs transition-all ${
          standalone ? 'p-6 sm:p-8' : 'p-5'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Information & Description */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Settlement Reconciliation Studio
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                Match incoming settlement reports against the transaction ledger using primary
                lifecycle IDs and composite key fallbacks. Automatically computes net debits/credits
                and flags discrepancy exceptions.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />

            {/* Custom CSV Upload Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={running || resetting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
            >
              <FileUp size={15} className="text-slate-500" />
              <span>Upload CSV File</span>
            </button>

            {/* Run Default Settlement CSV Button */}
            <button
              type="button"
              onClick={handleRunDefault}
              disabled={running || resetting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              {running ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Processing Batch...</span>
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current" />
                  <span>Run Default Settlement Report</span>
                </>
              )}
            </button>

            {/* Reset State Button */}
            <button
              type="button"
              onClick={handleReset}
              disabled={running || resetting}
              title="Reset database to initial seed state"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} />
              <span>Reset State</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Zone (displayed in standalone mode or expanded view) */}
        {standalone && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-6 border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-blue-600">
              <UploadCloud size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Drop your settlement CSV report here
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supports standard settlement reports containing settlement_id, lifecycle_id, account_id,
              merchant_name, settlement_amount, settlement_type, and currency.
            </p>
            <span className="inline-block mt-3 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Or click to browse files from your computer
            </span>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-700 p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Reconciliation Run Summary Modal */}
      {showSummaryModal && summary && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reconciliation Batch Completed
                  </h3>
                  <p className="text-xs text-slate-500">
                    Batch ledger matching results and discrepancy triage summary
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto py-5 space-y-5 flex-1 pr-1">
              {/* Metric stats 3-grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-2xl font-black text-slate-900 font-mono block">
                    {summary.processed_count}
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    Total Processed
                  </span>
                </div>
                <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-2xl font-black text-emerald-700 font-mono block">
                    {summary.matched_count}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">
                    Matched & Settled
                  </span>
                </div>
                <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-100 text-center">
                  <span className="text-2xl font-black text-amber-700 font-mono block">
                    {summary.unmatched_records.length + summary.invalid_records.length}
                  </span>
                  <span className="text-[11px] text-amber-600 font-semibold uppercase tracking-wider">
                    Exceptions / Orphans
                  </span>
                </div>
              </div>

              {/* Invalid Settlements (e.g. FAILED/DECLINED attempts) */}
              {summary.invalid_records.length > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                    <AlertCircle size={15} className="text-rose-600" />
                    <span>
                      Rejected Inactive Settlements ({summary.invalid_records.length})
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Settlements matching <b>FAILED</b> or <b>DECLINED</b> transactions were rejected
                    to protect ledger balance, and the target transaction was flagged as critical:
                  </p>
                  <div className="space-y-1.5 mt-2">
                    {summary.invalid_records.map((inv, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-white p-3 rounded-xl border border-rose-200/80 text-rose-900 flex items-start justify-between shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 font-mono font-bold">
                            <span>{inv.settlement_id}</span>
                            <ArrowRight size={13} className="text-slate-400" />
                            <span>{inv.transaction_id}</span>
                          </div>
                          <p className="text-slate-600 mt-1 font-normal text-[11px]">
                            {inv.reason}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md uppercase">
                          REJECTED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched Orphan Settlements */}
              {summary.unmatched_records.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                    <HelpCircle size={15} className="text-amber-600" />
                    <span>
                      Unmatched Orphan Settlements ({summary.unmatched_records.length})
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    These settlement records had no matching transaction in the database via
                    primary lifecycle_id or composite fallback key:
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto mt-2 pr-1">
                    {summary.unmatched_records.map((unm, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-white p-3 rounded-xl border border-amber-200/80 text-slate-800 flex items-start justify-between shadow-2xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{unm.settlement_id}</span>
                            {unm.lifecycle_id && (
                              <span className="text-slate-400 font-normal">
                                ({unm.lifecycle_id})
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            {unm.merchant_name} · Acct {unm.account_id} · ${unm.settlement_amount} ({unm.settlement_type})
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md uppercase">
                          ORPHAN
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Updated {summary.updated_transactions_count} ledger transactions
              </span>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                Close & View Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
