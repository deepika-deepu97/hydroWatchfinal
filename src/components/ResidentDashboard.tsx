import React, { useState, useEffect } from 'react';
import {
  Home,
  Droplet,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Clock,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  Lock,
} from 'lucide-react';
import { Property, EvaluationResult, HourlyReading } from '../types';
import { getResidentProperty, submitResidentReading } from '../services/api';
import { SummaryCards } from './SummaryCards';
import { WaterFlowChart } from './WaterFlowChart';
import { generate24HourFlowData, evaluateFlow } from '../utils/detection';

export const ResidentDashboard: React.FC = () => {
  const [property, setProperty] = useState<Property | null>(null);
  const [currentFlow, setCurrentFlow] = useState<number>(8.0);
  const [candidateFlow, setCandidateFlow] = useState<number>(40.0); // Default to test scenario: 40 L/h
  const [thresholdPercent, setThresholdPercent] = useState<number>(55.0); // Configured 55%
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch authorized property on mount
  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        const prop = await getResidentProperty();
        setProperty(prop);
        const initialThreshold = prop.thresholdPercent || 55.0;
        setThresholdPercent(initialThreshold);
        // Initial normal evaluation for 8.0 L/h vs 10 L/h baseline
        const initialEval = evaluateFlow(8.0, prop.baselineFlow, initialThreshold);
        setEvaluation(initialEval);
      } catch (err: any) {
        setError(err.message || 'Failed to load authorized property.');
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, []);

  const handleSimulate = async (flowValue: number) => {
    if (!property) return;
    setEvaluating(true);
    setBackendMessage(null);
    setError(null);

    try {
      const response = await submitResidentReading(flowValue, thresholdPercent);
      setCurrentFlow(flowValue);

      // Consistent frontend/backend evaluation sync
      const isZeroBaseline = property.baselineFlow <= 0;
      let calculatedDev: number | null = null;
      let isLeak = false;

      if (!isZeroBaseline) {
        calculatedDev = Number((((flowValue - property.baselineFlow) / property.baselineFlow) * 100).toFixed(2));
        isLeak = calculatedDev > thresholdPercent;
      }

      const unifiedEval: EvaluationResult = {
        ...response.evaluation,
        deviationPercentage: calculatedDev !== null ? calculatedDev : response.evaluation.deviationPercentage,
        isPossibleLeak: isLeak,
        isAnomaly: isLeak,
        insufficientData: isZeroBaseline,
        thresholdPercent,
      };

      setEvaluation(unifiedEval);

      if (isLeak) {
        setBackendMessage(
          `Suspected leak detected! Backend Baseline service published 'NightFlowAnomalyDetected' event (${response.evaluation.eventId || 'evt'}) to Kafka topic 'soa.s10.t02.events'. The Utility Analyst dashboard has been automatically notified in real time.`
        );
      } else if (isZeroBaseline) {
        setBackendMessage(
          `Insufficient Baseline Data: Property baseline is missing or 0 L/h. Cannot calculate reliable deviation.`
        );
      } else {
        setBackendMessage(
          `Reading evaluated by backend: Flow rate (${flowValue.toFixed(1)} L/h) is within normal baseline parameters (${calculatedDev}% vs +${thresholdPercent}% limit). No leak alert dispatched.`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit reading to backend.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleThresholdChange = (newThreshold: number) => {
    setThresholdPercent(newThreshold);
    // Avoid stale state: re-evaluate current flow with new threshold immediately
    if (property && evaluation) {
      if (property.baselineFlow <= 0) {
        setEvaluation({
          ...evaluation,
          thresholdPercent: newThreshold,
          insufficientData: true,
          isPossibleLeak: false,
          isAnomaly: false,
        });
      } else {
        const dev = Number((((currentFlow - property.baselineFlow) / property.baselineFlow) * 100).toFixed(2));
        const isLeak = dev > newThreshold;
        setEvaluation({
          ...evaluation,
          thresholdPercent: newThreshold,
          deviationPercentage: dev,
          isPossibleLeak: isLeak,
          isAnomaly: isLeak,
          severity: isLeak ? (dev > 300 ? 'Severe' : dev > 150 ? 'High' : 'Moderate') : 'Normal',
        });
      }
    }
  };

  const setPreset = (type: 'normal' | 'spec40' | 'spec17' | 'severe') => {
    if (!property) return;
    let flow = 8.0;
    if (type === 'normal') flow = 8.0;
    else if (type === 'spec40') flow = 40.0; // 40 L/h (+300% deviation!)
    else if (type === 'spec17') flow = 17.0; // 17 L/h (+70% deviation)
    else if (type === 'severe') flow = 75.0; // 75 L/h (+650% deviation)
    setCandidateFlow(flow);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <Droplet className="w-10 h-10 text-blue-500 animate-bounce mb-3" />
        <p className="font-semibold text-sm">Loading authorized property credentials...</p>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm">
        <div className="font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <span>Access Denied</span>
        </div>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  const isLeakFlagged = Boolean(
    evaluation &&
      !evaluation.insufficientData &&
      evaluation.deviationPercentage !== null &&
      evaluation.deviationPercentage > thresholdPercent
  );

  const chartData: HourlyReading[] = property
    ? generate24HourFlowData(property.baselineFlow, currentFlow, thresholdPercent)
    : [];

  return (
    <div className="space-y-6">
      {/* Property Authorization Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {property?.name} — Resident Water Monitor
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Lock className="w-3 h-3" />
                JWT Scoped Property
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {property?.address} • {property?.occupants} Residents • Established Baseline: <strong>{property?.baselineFlow} L/hour</strong>
            </p>
          </div>
        </div>

        {/* Security badge: Residents can view only their own property */}
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl">
          <span className="font-semibold text-slate-700">Resident Authorization:</span>
          <div className="text-[11px] text-slate-500">
            Restricted to Home A records only (RBAC Enforced)
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      {property && evaluation && (
        <SummaryCards
          baselineFlow={property.baselineFlow}
          currentFlow={currentFlow}
          evaluation={evaluation}
          thresholdPercent={thresholdPercent}
        />
      )}

      {/* 24-Hour Water Flow Chart */}
      {property && (
        <WaterFlowChart
          data={chartData}
          baselineFlow={property.baselineFlow}
          thresholdPercent={thresholdPercent}
          houseName={property.name}
          isLeakFlagged={isLeakFlagged}
        />
      )}

      {/* Test Simulator Section */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-600" />
              Resident Meter Reading Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Simulate water meter telemetry during the 01:00 – 05:00 night window to test the automated backend detection pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Configured Threshold: +{thresholdPercent}%
            </span>
          </div>
        </div>

        {/* Simulator Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Quick Scenario Buttons */}
          <div className="lg:col-span-6 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              1. Quick Scenario Selection
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPreset('normal')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  candidateFlow === 8.0
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-[11px] font-bold">Normal</div>
                <div className="text-[10px] text-slate-500">8 L/h (-20%)</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('spec40')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  candidateFlow === 40.0
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                <div className="text-[11px] font-bold">40 L/h Leak</div>
                <div className="text-[10px] text-rose-600 font-semibold">+300%</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('spec17')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  candidateFlow === 17.0
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-200'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <div className="text-[11px] font-bold">17 L/h Leak</div>
                <div className="text-[10px] text-rose-600 font-semibold">+70%</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('severe')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  candidateFlow === 75.0
                    ? 'border-red-600 bg-red-50 text-red-900 font-bold ring-2 ring-red-300'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Flame className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                <div className="text-[11px] font-bold">Severe</div>
                <div className="text-[10px] text-slate-500">75 L/h (+650%)</div>
              </button>
            </div>
          </div>

          {/* Test Reading Input & Submit Button */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold uppercase tracking-wider text-slate-700">
                2. Test Flow Reading (L/hour)
              </label>
              <span className="text-slate-400">Baseline: {property?.baselineFlow} L/h</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-36 shrink-0">
                <input
                  type="number"
                  min="0"
                  max="150"
                  step="0.5"
                  value={candidateFlow}
                  onChange={(e) => setCandidateFlow(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full rounded-xl bg-slate-50 border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <span className="absolute right-3 top-3 text-xs font-semibold text-slate-400">
                  L/h
                </span>
              </div>

              <button
                type="button"
                disabled={evaluating}
                onClick={() => handleSimulate(candidateFlow)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 active:scale-98 transition disabled:opacity-50 cursor-pointer"
              >
                {evaluating ? (
                  <span className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 animate-spin" />
                    <span>Evaluating with Backend...</span>
                  </span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Simulate Reading &amp; Evaluate</span>
                  </>
                )}
              </button>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={candidateFlow}
              onChange={(e) => setCandidateFlow(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg mt-2"
            />
          </div>
        </div>

        {/* Threshold Adjustment for Testing */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Alert Threshold Setting:</span>
            <span className="font-extrabold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
              +{thresholdPercent}%
            </span>
            <span className="text-slate-400 font-normal">(Default +55% per specification)</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={thresholdPercent}
              onChange={(e) => handleThresholdChange(Number(e.target.value))}
              className="w-40 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Backend Pipeline Feedback */}
        {backendMessage && (
          <div
            className={`p-4 rounded-xl border text-xs sm:text-sm ${
              isLeakFlagged
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                  isLeakFlagged
                    ? 'bg-rose-200 text-rose-700 animate-pulse'
                    : 'bg-emerald-200 text-emerald-700'
                }`}
              >
                {isLeakFlagged ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm">
                  {isLeakFlagged
                    ? '⚠️ Possible Leak Flagged by Backend Service'
                    : '✓ Reading Normal — Flow Within Operating Limits'}
                </div>
                <p className="text-xs leading-relaxed">{backendMessage}</p>

                {/* Mathematical calculation steps */}
                {property && evaluation && evaluation.deviationPercentage !== null && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white/80 border border-slate-200 text-[11px] font-mono text-slate-700 space-y-0.5">
                    <div className="font-bold text-slate-900">Backend Calculation Formula:</div>
                    <div>
                      deviation % = (({currentFlow.toFixed(1)} - {property.baselineFlow.toFixed(1)}) / {property.baselineFlow.toFixed(1)}) × 100 ={' '}
                      <span className="font-bold text-blue-700">
                        {evaluation.deviationPercentage >= 0 ? '+' : ''}
                        {evaluation.deviationPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Comparison: {evaluation.deviationPercentage.toFixed(1)}% vs Threshold +{thresholdPercent}% →{' '}
                      <strong>{isLeakFlagged ? 'EXCEEDED (Possible Leak Detected)' : 'SAFE (Normal Flow)'}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resident Notice */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-blue-950">Zero Effort Resident Protection: </span>
            <span className="text-slate-600">
              When an anomaly is detected, HydroWatch automatically dispatches the alert to the Utility Analyst dashboard via Kafka event streaming. You do not need to call customer service or manually submit an investigation ticket.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
