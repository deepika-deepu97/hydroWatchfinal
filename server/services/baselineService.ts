import { getDb } from '../db';
import { kafkaBroker, KAFKA_TOPIC_SOA_EVENTS, NightFlowAnomalyDetectedPayload } from '../kafka';

export interface BaselineEvaluationResult {
  propertyId: string;
  propertyName: string;
  baselineFlow: number;
  currentFlow: number;
  deviationPercentage: number | null;
  thresholdPercent: number;
  isAnomaly: boolean;
  isPossibleLeak: boolean;
  severity: 'Normal' | 'Low' | 'Moderate' | 'High' | 'Severe';
  explanation: string;
  insufficientData: boolean;
  kafkaEventPublished: boolean;
  eventId?: string;
}

export class BaselineService {
  /**
   * Evaluates a water flow reading against property baseline and publishes Kafka event if anomalous.
   * Formula: deviation % = ((current flow - baseline) / baseline) * 100
   * Threshold: Flag if deviation > threshold.
   */
  public async evaluateReading(
    propertyId: string,
    currentFlow: number,
    customThreshold?: number,
    explicitEventId?: string
  ): Promise<BaselineEvaluationResult> {
    const db = getDb();
    const property = db.properties.find((p) => p.id === propertyId);

    if (!property) {
      throw new Error(`Property '${propertyId}' not found in Baseline service registry.`);
    }

    const baseline = property.baselineFlow;
    const threshold = customThreshold !== undefined ? customThreshold : property.thresholdPercent;

    // Handle zero or missing/uncalibrated baseline safely
    if (!baseline || baseline <= 0) {
      return {
        propertyId: property.id,
        propertyName: property.name,
        baselineFlow: 0,
        currentFlow,
        deviationPercentage: null,
        thresholdPercent: threshold,
        isAnomaly: false,
        isPossibleLeak: false,
        severity: 'Normal',
        explanation: 'Insufficient Baseline Data: The property normal baseline is not calibrated (0 L/h).',
        insufficientData: true,
        kafkaEventPublished: false,
      };
    }

    // Formula: ((current flow - baseline) / baseline) * 100
    const deviationPercentage = Number((((currentFlow - baseline) / baseline) * 100).toFixed(2));
    const isAnomaly = deviationPercentage > threshold;
    const isPossibleLeak = isAnomaly;

    let severity: 'Normal' | 'Low' | 'Moderate' | 'High' | 'Severe' = 'Normal';
    let anomalySeverity: 'Low' | 'Moderate' | 'High' | 'Severe' = 'Moderate';

    if (isAnomaly) {
      if (deviationPercentage > 300) {
        anomalySeverity = 'Severe';
      } else if (deviationPercentage > 150) {
        anomalySeverity = 'High';
      } else {
        anomalySeverity = 'Moderate';
      }
      severity = anomalySeverity;
    }

    let explanation = '';
    let kafkaEventPublished = false;
    let eventId: string | undefined;

    if (isAnomaly) {
      explanation = `Suspicious water usage detected: Current flow (${currentFlow.toFixed(1)} L/h) is +${deviationPercentage.toFixed(1)}% above normal baseline (${baseline.toFixed(1)} L/h), exceeding +${threshold}% threshold. Status: Possible Leak Detected.`;

      // Publish NightFlowAnomalyDetected event to Kafka topic soa.s10.t02.events
      const eventPayload: NightFlowAnomalyDetectedPayload = {
        propertyId: property.id,
        propertyName: property.name,
        address: property.address,
        currentFlow,
        baselineFlow: baseline,
        deviationPercentage,
        thresholdPercent: threshold,
        severity: anomalySeverity,
        timestamp: new Date().toISOString(),
      };

      const publishedMsg = await kafkaBroker.publish<NightFlowAnomalyDetectedPayload>(
        KAFKA_TOPIC_SOA_EVENTS,
        'NightFlowAnomalyDetected',
        eventPayload,
        explicitEventId
      );

      kafkaEventPublished = true;
      eventId = publishedMsg.eventId;
      console.log(`[Baseline Service] Anomaly flagged for ${property.name}. Published event ${eventId} to Kafka topic ${KAFKA_TOPIC_SOA_EVENTS}.`);
    } else {
      explanation = `Flow reading (${currentFlow.toFixed(1)} L/h) is normal (+${deviationPercentage.toFixed(1)}% vs ${baseline.toFixed(1)} L/h baseline, within +${threshold}% safe limit). Status: Normal Flow.`;
    }

    return {
      propertyId: property.id,
      propertyName: property.name,
      baselineFlow: baseline,
      currentFlow,
      deviationPercentage,
      thresholdPercent: threshold,
      isAnomaly,
      isPossibleLeak,
      severity,
      explanation,
      insufficientData: false,
      kafkaEventPublished,
      eventId,
    };
  }
}

export const baselineService = new BaselineService();
