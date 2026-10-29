import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Flame, Droplet, ArrowRight, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { House, EvaluationResult, User } from '../types';

interface TestSimulatorProps {
  currentUser: User;
  currentHouse: House;
  houses: House[];
  onSelectHouse: (houseId: string) => void;
  currentFlow: number;
  onSimulate: (testFlow: number) => Promise<void>;
  lastEvaluation: EvaluationResult | null;
  thresholdPercent: number;
  caseCreatedMessage: string | null;
  isEvaluating: boolean;
}

export const TestSimulator: React.FC<TestSimulatorProps> = ({
  currentUser,
  currentHouse,
  houses,
  onSelectHouse,
  currentFlow,
  onSimulate,
  lastEvaluation,
  thresholdPercent,
  caseCreatedMessage,
  isEvaluating,
}) => {
  const isAnalyst = currentUser.role === 'UTILITY_ANALYST';
  const [candidateFlow, setCandidateFlow] = useState<number>(currentFlow);
  const [selectedScenarioType, setSelectedScenarioType] = useState<string | null>(null);

  // Quick preset generators for the 3 main buttons
  const handleScenarioPreset = (type: 'normal' | 'leak' | 'severe') => {
    setSelectedScenarioType(type);
    let sampleVal = 0;
    if (type === 'normal') {
      // Normal flow: around 80% of baseline (e.g. 8 L/h for Home A)
      sampleVal = currentHouse.baselineFlow > 0 ? Number((currentHouse.baselineFlow * 0.8).toFixed(1)) : 8;
    } else if (type === 'leak') {
      // Possible leak: e.g. 17 L/h (+70%) or 35 L/h (+250%) for Home A
      sampleVal = currentHouse.baselineFlow === 10 ? 17 : Number((currentHouse.baselineFlow * 2.5).toFixed(1));
    } else if (type === 'severe') {
      // Severe leak: high continuous flow
      sampleVal = currentHouse.baselineFlow > 0 ? Number((currentHouse.baselineFlow * 7.0).toFixed(1)) : 75;
    }
    setCandidateFlow(sampleVal);
  };

  const handleEvaluate = async () => {
    await onSimulate(candidateFlow);
  };

  // Hackathon Benchmark Scenarios (Feature 6 & 11)
  const runScenarioNormal = async () => {
    if (isAnalyst) onSelectHouse('home-a');
    setCandidateFlow(8.0);
    setSelectedScenarioType('normal');
    await onSimulate(8.0);
  };

  const runScenarioLeak17 = async () => {
    if (isAnalyst) onSelectHouse('home-a');
    setCandidateFlow(17.0);
    setSelectedScenarioType('leak');
    await onSimulate(17.0);
  };

  const runScenarioLeak35 = async () => {
    if (isAnalyst) onSelectHouse('home-a');
    setCandidateFlow(35.0);
    setSelectedScenarioType('leak');
    await onSimulate(35.0);
  };

  const runScenarioHomeB35 = async () => {
    if (isAnalyst) {
      onSelectHouse('home-b');
      setCandidateFlow(35.0);
      setSelectedScenarioType('normal');
      await onSimulate(35.0);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
      {/* Header of Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Droplet className="w-5 h-5 text-blue-600" />
            Backend Leak Simulator &amp; Evaluation Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Submit meter readings to Baseline Service, trigger Kafka event publishing, and evaluate against {currentHouse.name} baseline ({currentHouse.baselineFlow} L/h).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
            Threshold: +{thresholdPercent}%
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            Topic: soa.s10.t02.events
          </span>
        </div>
      </div>

      {/* Simulator Buttons & Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Step 1: Scenario Buttons */}
        <div className="lg:col-span-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            1. Select Flow Scenario Preset
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleScenarioPreset('normal')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                selectedScenarioType === 'normal'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200 font-bold'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
              <span className="text-xs">Normal Flow</span>
              <span className="text-[10px] text-slate-500">
                {currentHouse.baselineFlow > 0 ? `~${(currentHouse.baselineFlow * 0.8).toFixed(0)} L/h` : '8 L/h'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleScenarioPreset('leak')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                selectedScenarioType === 'leak'
                  ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200 font-bold'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-xs">Possible Leak</span>
              <span className="text-[10px] text-slate-500">
                {currentHouse.baselineFlow === 10 ? '17 L/h (+70%)' : 'Elevated'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleScenarioPreset('severe')}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                selectedScenarioType === 'severe'
                  ? 'border-red-600 bg-red-50 text-red-900 ring-2 ring-red-300 font-bold'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
              }`}
            >
              <Flame className="w-5 h-5 text-rose-600 mb-1" />
              <span className="text-xs">Severe Leak</span>
              <span className="text-[10px] text-slate-500">
                {currentHouse.baselineFlow > 0 ? `~${(currentHouse.baselineFlow * 7.0).toFixed(0)} L/h` : '75+ L/h'}
              </span>
            </button>
          </div>
        </div>

        {/* Step 2: Flow Value & Evaluate Action */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="candidate-flow-input"
              className="text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              2. Test Flow Reading (L/hour)
            </label>
            <span className="text-xs text-slate-500">
              Enter value or drag slider
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-36 shrink-0">
              <input
                id="candidate-flow-input"
                type="number"
                min="0"
                max="250"
                step="0.5"
                value={candidateFlow}
                onChange={(e) => {
                  setSelectedScenarioType(null);
                  setCandidateFlow(Math.max(0, parseFloat(e.target.value) || 0));
                }}
                className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
              <span className="absolute right-3 top-3 text-xs font-semibold text-slate-400">
                L/h
              </span>
            </div>

            <button
              type="button"
              disabled={isEvaluating}
              onClick={handleEvaluate}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-98 disabled:opacity-50 transition cursor-pointer"
            >
              {isEvaluating ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Evaluating via Backend...
                </span>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Simulate Reading &amp; Evaluate</span>
                </>
              )}
            </button>
          </div>

          <input
            type="range"
            min="0"
            max="120"
            step="1"
            value={candidateFlow}
            onChange={(e) => {
              setSelectedScenarioType(null);
              setCandidateFlow(Number(e.target.value));
            }}
            className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg mt-2"
          />
        </div>
      </div>

      {/* College Hackathon Benchmark Test Presets */}
      <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Hackathon Verification Presets (Sections 5, 6 &amp; 11)
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            1-click demonstrations to prove required baseline formulas to judges
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {/* Preset 1: Home A 8 L/h */}
          <button
            type="button"
            onClick={runScenarioNormal}
            className="text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-emerald-700">
              <span>Home A (8 L/h)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Normal (-20%)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Baseline 10 L/h vs 8 L/h → Safe night flow.
            </p>
          </button>

          {/* Preset 2: Home A 17 L/h (+70%) */}
          <button
            type="button"
            onClick={runScenarioLeak17}
            className="text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-rose-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-rose-700">
              <span>Home A (17 L/h)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                Flagged (+70%)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Baseline 10 L/h vs 17 L/h → Exceeds 50% limit.
            </p>
          </button>

          {/* Preset 3: Home A 35 L/h (+250%) */}
          <button
            type="button"
            onClick={runScenarioLeak35}
            className="text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-rose-400 hover:shadow-xs transition group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-rose-700">
              <span>Home A (35 L/h)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                Flagged (+250%)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Baseline 10 L/h vs 35 L/h → High leak anomaly.
            </p>
          </button>

          {/* Preset 4: Home B 35 L/h (+16.67%) */}
          <button
            type="button"
            disabled={!isAnalyst}
            onClick={runScenarioHomeB35}
            className={`text-left p-2.5 rounded-lg bg-white border border-slate-200 transition group ${
              isAnalyst
                ? 'hover:border-cyan-400 hover:shadow-xs cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-cyan-800">
              <span>Home B (35 L/h)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Normal (+16.7%)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Baseline 30 L/h vs 35 L/h → Same flow, NOT flagged!
            </p>
          </button>
        </div>
      </div>

      {/* Backend Evaluation Results Banner */}
      {lastEvaluation && (
        <div
          className={`p-4 rounded-xl border transition-all ${
            lastEvaluation.insufficientData
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : lastEvaluation.isPossibleLeak
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-lg mt-0.5 ${
                lastEvaluation.insufficientData
                  ? 'bg-slate-200 text-slate-700'
                  : lastEvaluation.isPossibleLeak
                  ? 'bg-rose-200 text-rose-700 animate-pulse'
                  : 'bg-emerald-200 text-emerald-700'
              }`}
            >
              {lastEvaluation.insufficientData ? (
                <AlertTriangle className="w-5 h-5" />
              ) : lastEvaluation.isPossibleLeak ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold">
                  {lastEvaluation.insufficientData
                    ? 'Evaluation Inconclusive'
                    : lastEvaluation.isPossibleLeak
                    ? '⚠️ Possible Leak Flagged by Baseline Service!'
                    : '✓ Normal Water Flow Confirmed'}
                </h4>
                {lastEvaluation.deviationPercentage !== null && (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      lastEvaluation.isPossibleLeak
                        ? 'bg-rose-200 text-rose-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    Deviation: {lastEvaluation.deviationPercentage >= 0 ? '+' : ''}
                    {lastEvaluation.deviationPercentage.toFixed(2)}%
                  </span>
                )}
              </div>

              <p className="text-xs leading-relaxed opacity-90">
                {lastEvaluation.explanation}
              </p>

              {/* Kafka & Case Created confirmation */}
              {caseCreatedMessage && (
                <div className="mt-2 text-xs font-semibold text-rose-800 flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-lg border border-rose-200">
                  <Send className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{caseCreatedMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer & Educational Note */}
      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
        <Droplet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-950">
            Important Notice on Water Usage Detection:
          </p>
          <p className="text-slate-600 leading-normal">
            HydroWatch evaluates minimum nighttime flow to detect <em>suspicious water usage</em> and does <strong>not confirm a physical pipe leak</strong>. Nighttime water usage can also stem from automated garden irrigation, water softener regeneration cycles, or running toilet flappers.
          </p>
        </div>
      </div>
    </div>
  );
};
