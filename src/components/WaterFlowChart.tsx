import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { HourlyReading } from '../types';
import { Info, Clock } from 'lucide-react';

interface WaterFlowChartProps {
  data: HourlyReading[];
  baselineFlow: number;
  thresholdPercent: number;
  houseName: string;
  isLeakFlagged: boolean;
}

export const WaterFlowChart: React.FC<WaterFlowChartProps> = ({
  data,
  baselineFlow,
  thresholdPercent,
  houseName,
  isLeakFlagged,
}) => {
  const thresholdValue = baselineFlow > 0 ? baselineFlow * (1 + thresholdPercent / 100) : 0;

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const reading = payload[0].payload as HourlyReading;
      const isNight = reading.isNightWindow;
      const flow = reading.flow;
      const isExceeded = baselineFlow > 0 && flow > thresholdValue && isNight;

      return (
        <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              {label}
            </span>
            {isNight && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                Night Window
              </span>
            )}
          </div>
          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span>
                Observed Flow:
              </span>
              <span className="font-bold text-slate-900">{flow.toFixed(1)} L/h</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-blue-500 inline-block"></span>
                Normal Baseline:
              </span>
              <span className="font-medium">{baselineFlow.toFixed(1)} L/h</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 bg-amber-500 inline-block border-b border-dashed border-amber-500"></span>
                Warning Limit (+{thresholdPercent}%):
              </span>
              <span className="font-medium">{thresholdValue.toFixed(1)} L/h</span>
            </div>
          </div>
          {isNight && (
            <div
              className={`mt-1.5 pt-1.5 border-t text-[11px] font-medium ${
                isExceeded ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {isExceeded
                ? '⚠️ Night flow exceeds safe baseline'
                : '✓ Night flow within normal baseline'}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              24-Hour Water Flow Profile
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
              {houseName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Continuous meter flow in Liters/Hour with shaded nighttime leak evaluation period (1 AM – 5 AM)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Night Window: 01:00 – 05:00
          </div>
          {isLeakFlagged && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60 font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Elevated Night Consumption
            </div>
          )}
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-72 sm:h-80 md:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 16, left: -10, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            {/* Highlighted nighttime window from 1 AM to 5 AM */}
            <ReferenceArea
              x1="01:00"
              x2="05:00"
              stroke="#93c5fd"
              strokeOpacity={0.3}
              fill="#38bdf8"
              fillOpacity={0.12}
              label={{
                value: 'Night Window (01:00 – 05:00)',
                position: 'insideTop',
                fill: '#0284c7',
                fontSize: 11,
                fontWeight: 600,
                offset: 10,
              }}
            />

            {/* Normal baseline horizontal reference line */}
            {baselineFlow > 0 && (
              <ReferenceLine
                y={baselineFlow}
                stroke="#2563eb"
                strokeWidth={1.8}
                strokeDasharray="5 5"
                label={{
                  value: `Baseline (${baselineFlow.toFixed(0)} L/h)`,
                  position: 'right',
                  fill: '#2563eb',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Warning threshold horizontal reference line */}
            {thresholdValue > 0 && (
              <ReferenceLine
                y={thresholdValue}
                stroke="#e11d48"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: `Threshold (+${thresholdPercent}%: ${thresholdValue.toFixed(1)} L/h)`,
                  position: 'insideTopRight',
                  fill: '#e11d48',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              unit=" L/h"
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="plainline"
              formatter={(value) => (
                <span className="text-xs font-medium text-slate-700">{value}</span>
              )}
            />

            <Line
              name="Observed Water Flow"
              type="monotone"
              dataKey="flow"
              stroke="#0284c7"
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (!payload) return null;
                // Highlight night window data points
                if (payload.isNightWindow) {
                  const isOver = baselineFlow > 0 && payload.flow > thresholdValue;
                  return (
                    <circle
                      key={`dot-${payload.hour}`}
                      cx={cx}
                      cy={cy}
                      r={isOver ? 5 : 4}
                      fill={isOver ? '#e11d48' : '#0284c7'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }
                return null;
              }}
              activeDot={{ r: 6, fill: '#0369a1', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart explanation banner for beginners */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            <strong>Why night flow?</strong> Water usage normally drops to near-zero between 1:00 AM and 5:00 AM when occupants sleep. Elevated flow here is the primary indicator of silent leaks.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1 font-medium text-blue-700">
            <span className="w-2.5 h-0.5 bg-blue-600 inline-block"></span> Normal Baseline
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-rose-600">
            <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span> Warning Limit
          </span>
        </div>
      </div>
    </div>
  );
};
