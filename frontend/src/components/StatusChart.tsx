import { useState, type FC } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { SettlementStatus } from '../types';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface StatusChartProps {
  statusBreakdown: Record<SettlementStatus, number>;
  onSelectStatus?: (status: SettlementStatus) => void;
}

const STATUS_CONFIG: Record<
  SettlementStatus,
  { label: string; color: string; bg: string; text: string }
> = {
  FULLY_SETTLED: {
    label: 'Fully Settled',
    color: '#10b981',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
  },
  PARTIAL: {
    label: 'Partial Settlement',
    color: '#f59e0b',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
  },
  OVER_SETTLED: {
    label: 'Over Settled',
    color: '#f43f5e',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
  },
  REFUNDED: {
    label: 'Refunded (Netted)',
    color: '#a855f7',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
  },
  PENDING: {
    label: 'Pending Settlement',
    color: '#0ea5e9',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
  },
  NOT_APPLICABLE: {
    label: 'Failed / Declined',
    color: '#94a3b8',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
  },
};

export const StatusChart: FC<StatusChartProps> = ({
  statusBreakdown,
  onSelectStatus,
}) => {
  const [activeChart, setActiveChart] = useState<'donut' | 'bar'>('donut');

  const chartData = (Object.keys(statusBreakdown) as SettlementStatus[])
    .map((key) => ({
      key,
      name: STATUS_CONFIG[key]?.label || key,
      value: statusBreakdown[key] || 0,
      color: STATUS_CONFIG[key]?.color || '#94a3b8',
      config: STATUS_CONFIG[key],
    }))
    .filter((item) => item.value > 0);

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-semibold">{data.name}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 pt-1 text-slate-300">
            <span>Volume:</span>
            <span className="font-mono font-bold text-white text-sm">
              {data.value} txns
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-4 text-slate-400 text-[11px]">
            <span>Share:</span>
            <span className="font-mono text-emerald-400">{pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Settlement Status Distribution
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {total} Total Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Visual breakdown of transaction lifecycle and settlement state clearance
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveChart('donut')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeChart === 'donut'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PieChartIcon size={14} />
            Donut
          </button>
          <button
            type="button"
            onClick={() => setActiveChart('bar')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeChart === 'bar'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={14} />
            Bars
          </button>
        </div>
      </div>

      {/* Main Chart Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-5">
        {/* Visual Chart Graphic (7 cols) */}
        <div className="lg:col-span-7 h-64 relative flex items-center justify-center">
          {activeChart === 'donut' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="#ffffff"
                      strokeWidth={2}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onClick={() => onSelectStatus && onSelectStatus(entry.key)}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 10, left: -25, bottom: 25 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 2, 2]}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.color}
                      className="cursor-pointer hover:opacity-85"
                      onClick={() => onSelectStatus && onSelectStatus(entry.key)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Center Donut Label */}
          {activeChart === 'donut' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {total}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total
              </span>
            </div>
          )}
        </div>

        {/* Legend / Metrics List (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5">
          {chartData.map((item) => {
            const pct =
              total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
            return (
              <div
                key={item.key}
                onClick={() => onSelectStatus && onSelectStatus(item.key)}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-md shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-950 transition-colors block">
                      {item.name}
                    </span>
                    <div className="w-28 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {item.value}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono ml-1.5">
                    ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
