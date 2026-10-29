import { getDb, saveDb, MeterReadingEntity } from '../db';
import { baselineService, BaselineEvaluationResult } from './baselineService';
import { v4 as uuidv4 } from 'uuid';

export interface SubmitReadingRequest {
  propertyId: string;
  flowRate: number; // L/hour
  thresholdPercent?: number;
}

export interface SubmitReadingResponse {
  reading: MeterReadingEntity;
  evaluation: BaselineEvaluationResult;
}

export class MeterSeriesService {
  /**
   * Submits a new water flow reading and triggers the automated Baseline evaluation pipeline.
   */
  public async submitReading(
    request: SubmitReadingRequest,
    explicitEventId?: string
  ): Promise<SubmitReadingResponse> {
    const { propertyId, flowRate, thresholdPercent } = request;

    if (flowRate === undefined || flowRate === null || isNaN(flowRate) || flowRate < 0) {
      throw new Error('Invalid flowRate: must be a non-negative number.');
    }

    const db = getDb();
    const property = db.properties.find((p) => p.id === propertyId);
    if (!property) {
      throw new Error(`Property '${propertyId}' is not registered in the MeterSeries database.`);
    }

    // Step 2 & 3: Evaluate reading against baseline
    const evaluation = await baselineService.evaluateReading(
      propertyId,
      flowRate,
      thresholdPercent,
      explicitEventId
    );

    const readingEntity: MeterReadingEntity = {
      id: `reading-${uuidv4().slice(0, 8)}`,
      propertyId,
      timestamp: new Date().toISOString(),
      flowRate,
      evaluated: true,
      deviationPercentage: evaluation.deviationPercentage,
      isAnomaly: evaluation.isAnomaly,
    };

    db.readings.unshift(readingEntity);
    // Keep max 100 historical readings
    if (db.readings.length > 100) {
      db.readings = db.readings.slice(0, 100);
    }
    saveDb(db);

    return {
      reading: readingEntity,
      evaluation,
    };
  }

  public getReadingsForProperty(propertyId: string, limit: number = 24): MeterReadingEntity[] {
    const db = getDb();
    return db.readings
      .filter((r) => r.propertyId === propertyId)
      .slice(0, limit);
  }
}

export const meterSeriesService = new MeterSeriesService();
