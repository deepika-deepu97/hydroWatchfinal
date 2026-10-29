import React from 'react';
import { Moon, Activity, Percent, ShieldCheck, AlertOctagon, HelpCircle } from 'lucide-react';
import { EvaluationResult } from '../types';

interface SummaryCardsProps {
  baselineFlow: number;
  currentFlow: number;
  evaluation: EvaluationResult;
  thresholdPercent: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  baselineFlow,
  currentFlow,
  evaluation,
  thresholdPercent,
}) => {
  // Safe baseline check
  const isZeroOrMissingBaseline = !baselineFlow || baselineFlow <= 0 || evaluation.insufficientData;

  // Calculate deviation from current evaluated reading and baseline
  let deviationPercentage: number | null = null;
  if (!isZeroOrMissingBaseline) {
    if (evaluation.deviationPercentage !== null && evaluation.deviationPercentage !== undefined) {
      deviationPercentage = evaluation.deviationPercentage;
    } else {
      deviationPercentage = Number((((currentFlow - baselineFlow) / baselineFlow) * 100).toFixed(2));
    }
  }

  // Unified evaluation logic:
  // If deviation is greater than configured threshold, show "Possible Leak Detected". Otherwise, show "Normal Flow".
  const isPossibleLeak =
    !isZeroOrMissingBaseline &&
    deviationPercentage !== null &&
    (deviationPercentage > thresholdPercent ||
      evaluation.isPossibleLeak === true ||
      evaluation.isAnomaly === true);

  // Formatting deviation card
  const formatDeviation = () => {
    if (isZeroOrMissingBaseline || deviationPercentage === null) {
      return { text: 'N/A', subtext: 'Insufficient baseline data', isPositive: false, isExceeded: false };
    }
    const sign = deviationPercentage >= 0 ? '+' : '';
    const text = `${sign}${deviationPercentage.toFixed(1)}%`;
    const isExceeded = deviationPercentage > thresholdPercent;
    const subtext = isExceeded
      ? `Exceeds threshold (+${thresholdPercent}%)`
      : deviationPercentage >= 0
      ? `Within safe limit (+${thresholdPercent}%)`
      : 'Below normal baseline';
    return { text, subtext, isPositive: deviationPercentage >= 0, isExceeded };
  };

  const devInfo = formatDeviation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Card 1: Normal Night Flow */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Normal Night Flow
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Moon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {baselineFlow > 0 ? baselineFlow.toFixed(1) : '0.0'}
          </span>
          <span className="text-sm font-semibold text-slate-500">L/hour</span>
        </div>
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
          Baseline night flow (01:00 – 05:00)
        </p>
      </div>

      {/* Card 2: Current Night Flow */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current Night Flow
          </span>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {currentFlow.toFixed(1)}
          </span>
          <span className="text-sm font-semibold text-slate-500">L/hour</span>
        </div>
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-500"></span>
          Latest evaluated meter reading
        </p>
      </div>

      {/* Card 3: Flow Deviation */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Flow Deviation
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isZeroOrMissingBaseline
                ? 'bg-slate-100 text-slate-500'
                : devInfo.isExceeded
                ? 'bg-rose-50 text-rose-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <Percent className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-extrabold tracking-tight ${
              isZeroOrMissingBaseline
                ? 'text-slate-500'
                : devInfo.isExceeded
                ? 'text-rose-600'
                : 'text-emerald-600'
            }`}
          >
            {devInfo.text}
          </span>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500">
          {devInfo.subtext}
        </p>
      </div>

      {/* Card 4: Leak Status */}
      <div
        className={`rounded-2xl p-5 border transition-all shadow-xs hover:shadow-md ${
          isZeroOrMissingBaseline
            ? 'bg-slate-50/90 border-slate-200 text-slate-800'
            : isPossibleLeak
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Leak Status
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isZeroOrMissingBaseline
                ? 'bg-slate-200 text-slate-600'
                : isPossibleLeak
                ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-300 ring-offset-1 animate-pulse'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isZeroOrMissingBaseline ? (
              <HelpCircle className="w-5 h-5" />
            ) : isPossibleLeak ? (
              <AlertOctagon className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isZeroOrMissingBaseline
                ? 'bg-slate-400'
                : isPossibleLeak
                ? 'bg-rose-600 animate-ping'
                : 'bg-emerald-500'
            }`}
          ></span>
          <h3 className="text-xl font-bold tracking-tight">
            {isZeroOrMissingBaseline
              ? 'Insufficient Baseline Data'
              : isPossibleLeak
              ? 'Possible Leak Detected'
              : 'Normal Flow'}
          </h3>
        </div>

        <p className="mt-2 text-xs font-medium opacity-75">
          {isZeroOrMissingBaseline
            ? 'Baseline missing or zero (0 L/h)'
            : isPossibleLeak
            ? `Abnormal night flow exceeds +${thresholdPercent}%`
            : `Flow is within expected +${thresholdPercent}% limits`}
        </p>
      </div>
    </div>
  );
};
