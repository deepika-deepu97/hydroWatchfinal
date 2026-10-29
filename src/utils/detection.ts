import { EvaluationResult, HourlyReading, LeakSeverity } from '../types';

/**
 * Calculates water flow deviation and evaluates leak status based on positive baselines.
 *
 * Formula:
 * Deviation percentage = ((Current Flow - Normal Baseline) / Normal Baseline) * 100
 *
 * Condition:
 * If deviation > threshold, status is "Possible Leak Detected".
 * Otherwise, status is "Normal Flow".
 */
export function evaluateFlow(
  currentFlow: number,
  baselineFlow: number,
  thresholdPercent: number = 55
): EvaluationResult {
  // Handle zero or negative/missing baseline safely
  if (!baselineFlow || baselineFlow <= 0) {
    return {
      isPossibleLeak: false,
      isAnomaly: false,
      deviationPercentage: null,
      insufficientData: true,
      explanation: 'Insufficient Baseline Data: The property normal baseline is not calibrated (0 L/h). Cannot calculate reliable percentage deviation.',
      severity: 'Normal',
      thresholdPercent,
    };
  }

  const deviation = Number((((currentFlow - baselineFlow) / baselineFlow) * 100).toFixed(2));
  const isPossibleLeak = deviation > thresholdPercent;
  const isAnomaly = isPossibleLeak;

  let severity: LeakSeverity = 'Normal';
  if (isPossibleLeak) {
    if (deviation > 300) {
      severity = 'Severe';
    } else if (deviation > 150) {
      severity = 'High';
    } else {
      severity = 'Moderate';
    }
  }

  let explanation = '';
  if (isPossibleLeak) {
    const formattedDeviation = deviation.toFixed(1);
    explanation = `Current flow (${currentFlow.toFixed(1)} L/h) is +${formattedDeviation}% above the normal baseline (${baselineFlow.toFixed(1)} L/h), exceeding the +${thresholdPercent}% warning threshold. Status: Possible Leak Detected.`;
  } else if (deviation >= 0) {
    explanation = `Current flow (${currentFlow.toFixed(1)} L/h) is within normal operating range (+${deviation.toFixed(1)}% vs ${baselineFlow.toFixed(1)} L/h baseline, below +${thresholdPercent}% threshold). Status: Normal Flow.`;
  } else {
    explanation = `Current flow (${currentFlow.toFixed(1)} L/h) is lower than the typical night baseline (${deviation.toFixed(1)}% vs ${baselineFlow.toFixed(1)} L/h). Status: Normal Flow.`;
  }

  return {
    isPossibleLeak,
    isAnomaly,
    deviationPercentage: deviation,
    insufficientData: false,
    explanation,
    severity,
    thresholdPercent,
  };
}

/**
 * Generates a representative 24-hour flow curve for the graph.
 * Nighttime window from 1 AM to 5 AM highlights the minimum night flow.
 */
export function generate24HourFlowData(
  baseline: number,
  currentNightFlow: number,
  thresholdPercent: number = 55
): HourlyReading[] {
  const thresholdVal = baseline > 0 ? baseline * (1 + thresholdPercent / 100) : 0;
  const hours: HourlyReading[] = [];

  // Typical diurnal multiplier curve for residential homes
  // Night window is 01:00 to 05:00
  const diurnalMultipliers = [
    1.15, // 00:00 - late night
    1.0,  // 01:00 - night window starts
    1.0,  // 02:00 - deep night
    1.0,  // 03:00 - deep night
    1.0,  // 04:00 - deep night
    1.1,  // 05:00 - end of night window
    2.2,  // 06:00 - wake up
    4.5,  // 07:00 - morning rush (showers/breakfast)
    5.0,  // 08:00 - morning peak
    3.2,  // 09:00 - post rush
    2.0,  // 10:00 - daytime low
    2.1,  // 11:00 - midday
    2.5,  // 12:00 - lunch
    2.0,  // 13:00 - afternoon
    1.9,  // 14:00
    2.1,  // 15:00
    2.6,  // 16:00
    3.8,  // 17:00 - evening arrival
    4.8,  // 18:00 - dinner/cooking peak
    4.5,  // 19:00 - dinner dishes
    3.8,  // 20:00 - family evening
    3.0,  // 21:00 - wind down
    2.0,  // 22:00 - bedtime
    1.4,  // 23:00 - late night
  ];

  for (let i = 0; i < 24; i++) {
    const isNightWindow = i >= 1 && i <= 5;
    const hourLabel = `${i.toString().padStart(2, '0')}:00`;

    let observedFlow: number;

    if (baseline <= 0) {
      observedFlow = currentNightFlow;
    } else if (isNightWindow) {
      // For night window, reflect the current evaluated night flow
      const hourOffset = (i === 3) ? 1.0 : (i === 2 || i === 4 ? 0.98 : 0.95);
      observedFlow = Number((currentNightFlow * hourOffset).toFixed(1));
    } else {
      // Day usage scales with baseline + daytime multiplier
      const dayBase = baseline * diurnalMultipliers[i];
      // If there is an active leak, continuous background flow adds to daytime usage
      const leakOffset = Math.max(0, currentNightFlow - baseline);
      observedFlow = Number((dayBase + leakOffset * 0.75).toFixed(1));
    }

    hours.push({
      hour: hourLabel,
      hourNum: i,
      flow: Math.max(0, observedFlow),
      baseline: Number(baseline.toFixed(1)),
      threshold: Number(thresholdVal.toFixed(1)),
      isNightWindow,
    });
  }

  return hours;
}
