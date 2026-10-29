import { getDb, saveDb, LeakCaseEntity } from '../db';
import { kafkaBroker, KAFKA_TOPIC_SOA_EVENTS, KafkaMessage, NightFlowAnomalyDetectedPayload } from '../kafka';

export class LeakCaseService {
  constructor() {
    this.initConsumer();
  }

  /**
   * Initializes Kafka consumer subscribing to soa.s10.t02.events.
   * Enforces idempotent event processing to prevent duplicate cases.
   */
  private initConsumer(): void {
    kafkaBroker.subscribe<NightFlowAnomalyDetectedPayload>(
      KAFKA_TOPIC_SOA_EVENTS,
      'leakcase-service-group',
      async (message: KafkaMessage<NightFlowAnomalyDetectedPayload>) => {
        await this.handleKafkaEvent(message);
      }
    );
  }

  /**
   * Idempotent event processing handler.
   */
  public async handleKafkaEvent(
    message: KafkaMessage<NightFlowAnomalyDetectedPayload>
  ): Promise<{ status: 'created' | 'duplicate_ignored'; case?: LeakCaseEntity }> {
    if (message.eventType !== 'NightFlowAnomalyDetected') {
      return { status: 'duplicate_ignored' };
    }

    const db = getDb();
    const eventId = message.eventId;

    // Idempotency check: verify if event was already processed
    const alreadyProcessed = db.processedEvents.some((pe) => pe.eventId === eventId);
    if (alreadyProcessed) {
      console.warn(`[LeakCase Service] IDEMPOTENCY GUARD: Event ${eventId} was already processed. Skipping duplicate case creation.`);
      return { status: 'duplicate_ignored' };
    }

    // Record processed event
    db.processedEvents.push({
      eventId,
      topic: message.topic,
      processedAt: new Date().toISOString(),
    });

    const payload = message.payload;
    const caseNumber = `HW-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCase: LeakCaseEntity = {
      id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      caseNumber,
      propertyId: payload.propertyId,
      propertyName: payload.propertyName,
      address: payload.address,
      currentFlow: payload.currentFlow,
      baselineFlow: payload.baselineFlow,
      deviationPercentage: payload.deviationPercentage,
      thresholdPercent: payload.thresholdPercent,
      severity: payload.severity,
      status: 'Open',
      detectedAt: payload.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eventId,
      notes: `Automated detection via Kafka event ${eventId} on topic ${message.topic}. Baseline: ${payload.baselineFlow} L/h, Observed: ${payload.currentFlow} L/h (+${payload.deviationPercentage}%).`,
    };

    // Prepend newest case first
    db.cases.unshift(newCase);
    saveDb(db);

    console.log(`[LeakCase Service] Investigation Case ${caseNumber} created and persisted for ${payload.propertyName}.`);

    // Broadcast to connected Utility Analyst browser sessions via Server-Sent Events
    kafkaBroker.broadcastSse('new-leak-case', {
      case: newCase,
      message: `New suspected leak alert: ${newCase.propertyName} (+${newCase.deviationPercentage}% deviation).`,
    });

    return { status: 'created', case: newCase };
  }

  public getAllCases(): LeakCaseEntity[] {
    const db = getDb();
    return db.cases;
  }

  public getCasesForProperty(propertyId: string): LeakCaseEntity[] {
    const db = getDb();
    return db.cases.filter((c) => c.propertyId === propertyId);
  }

  public getCaseById(caseId: string): LeakCaseEntity | undefined {
    const db = getDb();
    return db.cases.find((c) => c.id === caseId || c.caseNumber === caseId);
  }

  public updateCaseStatus(
    caseId: string,
    status: 'Open' | 'Under Investigation' | 'Resolved',
    notes?: string
  ): LeakCaseEntity {
    const db = getDb();
    const caseItem = db.cases.find((c) => c.id === caseId || c.caseNumber === caseId);

    if (!caseItem) {
      throw new Error(`Investigation case '${caseId}' not found.`);
    }

    caseItem.status = status;
    caseItem.updatedAt = new Date().toISOString();

    if (status === 'Under Investigation' && !caseItem.investigatedAt) {
      caseItem.investigatedAt = new Date().toISOString();
    }
    if (status === 'Resolved') {
      caseItem.resolvedAt = new Date().toISOString();
    }
    if (notes) {
      caseItem.notes = notes;
    }

    saveDb(db);
    console.log(`[LeakCase Service] Case ${caseItem.caseNumber} updated to status '${status}'.`);

    // Notify connected analysts about the update
    kafkaBroker.broadcastSse('case-updated', {
      case: caseItem,
      message: `Case ${caseItem.caseNumber} status updated to ${status}.`,
    });

    return caseItem;
  }

  public getMetrics() {
    const db = getDb();
    const totalProperties = db.properties.length;
    const openCases = db.cases.filter((c) => c.status === 'Open').length;
    const underInvestigationCases = db.cases.filter((c) => c.status === 'Under Investigation').length;
    const resolvedCases = db.cases.filter((c) => c.status === 'Resolved').length;

    // Suspected leaks: count of properties with an Open or Under Investigation case
    const propertiesWithActiveLeaks = new Set(
      db.cases
        .filter((c) => c.status === 'Open' || c.status === 'Under Investigation')
        .map((c) => c.propertyId)
    );

    const suspectedLeaksCount = propertiesWithActiveLeaks.size;
    const normalPropertiesCount = Math.max(0, totalProperties - suspectedLeaksCount);

    return {
      totalProperties,
      normalProperties: normalPropertiesCount,
      suspectedLeaks: suspectedLeaksCount,
      openCases,
      underInvestigationCases,
      resolvedCases,
      totalCases: db.cases.length,
    };
  }
}

export const leakCaseService = new LeakCaseService();
