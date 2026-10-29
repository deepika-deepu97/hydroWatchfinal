import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

export const KAFKA_TOPIC_SOA_EVENTS = 'soa.s10.t02.events';

export interface NightFlowAnomalyDetectedPayload {
  propertyId: string;
  propertyName: string;
  address: string;
  currentFlow: number;
  baselineFlow: number;
  deviationPercentage: number;
  thresholdPercent: number;
  severity: 'Low' | 'Moderate' | 'High' | 'Severe';
  timestamp: string;
}

export interface KafkaMessage<T = any> {
  eventId: string;
  eventType: string;
  topic: string;
  partition: number;
  offset: number;
  timestamp: string;
  payload: T;
}

class KafkaBrokerEmulator {
  private emitter = new EventEmitter();
  private messageLog: KafkaMessage[] = [];
  private currentOffset = 1000;
  private sseClients: Set<Response> = new Set();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  /**
   * Publishes a message to a Kafka topic.
   */
  public async publish<T>(
    topic: string,
    eventType: string,
    payload: T,
    explicitEventId?: string
  ): Promise<KafkaMessage<T>> {
    const eventId = explicitEventId || `evt-${uuidv4().slice(0, 8)}`;
    this.currentOffset += 1;

    const message: KafkaMessage<T> = {
      eventId,
      eventType,
      topic,
      partition: 0,
      offset: this.currentOffset,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.messageLog.push(message);
    console.log(`[Kafka Producer] Published event ${eventType} (${eventId}) to topic ${topic} [offset=${message.offset}]`);

    // Asynchronously dispatch to consumers registered for this topic
    setImmediate(() => {
      this.emitter.emit(topic, message);
    });

    return message;
  }

  /**
   * Subscribes a consumer group callback to a Kafka topic.
   */
  public subscribe<T>(
    topic: string,
    consumerGroupId: string,
    handler: (message: KafkaMessage<T>) => Promise<void> | void
  ): void {
    console.log(`[Kafka ConsumerGroup ${consumerGroupId}] Subscribed to topic ${topic}`);
    this.emitter.on(topic, async (message: KafkaMessage<T>) => {
      try {
        await handler(message);
      } catch (err) {
        console.error(`[Kafka ConsumerGroup ${consumerGroupId}] Error processing message ${message.eventId}:`, err);
      }
    });
  }

  /**
   * Register an SSE client for real-time frontend notifications (Utility Analyst Dashboard).
   */
  public registerSseClient(res: Response): () => void {
    this.sseClients.add(res);
    return () => {
      this.sseClients.delete(res);
    };
  }

  /**
   * Broadcast an event to all connected Utility Analyst SSE clients.
   */
  public broadcastSse(eventName: string, data: any): void {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  public getMessageLog(): KafkaMessage[] {
    return [...this.messageLog];
  }
}

export const kafkaBroker = new KafkaBrokerEmulator();
