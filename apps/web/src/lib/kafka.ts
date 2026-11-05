import { Kafka, Producer, logLevel, Partitioners } from 'kafkajs';

export const KAFKA_TOPICS = {
  AUDIT_LOGS: 'masdika.audit-logs',
  USER_EVENTS: 'masdika.user-events',
  BILLING_EVENTS: 'masdika.billing-events',
  SYSTEM_EVENTS: 'masdika.system-events',
  SECURITY_ALERTS: 'masdika.security-alerts',
} as const;

export type KafkaTopicName = typeof KAFKA_TOPICS[keyof typeof KAFKA_TOPICS];

export interface KafkaEventPayload<T = any> {
  event: string;
  source?: string;
  userId?: number | string;
  timestamp?: string;
  data: T;
  meta?: Record<string, any>;
}

// Suppress default partitioner warning in KafkaJS v2
process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

// Global singleton to prevent connection leaks during Next.js HMR in dev
const globalForKafka = globalThis as unknown as {
  kafkaClient: Kafka | null;
  kafkaProducer: Producer | null;
  isConnectingProducer: boolean;
};

const rawBrokers = process.env.KAFKA_BROKERS || 
  (process.env.KUBERNETES_SERVICE_HOST ? 'masdika-kafka.masdika.svc.cluster.local:9092' : '127.0.0.1:9092');

const brokers = rawBrokers.split(',').map(b => b.trim()).filter(Boolean);
const clientId = process.env.KAFKA_CLIENT_ID || 'masdika-backend';
const enabled = process.env.USE_KAFKA !== 'false';

/**
 * Mendapatkan instance singleton Kafka Client
 */
export function getKafkaClient(): Kafka | null {
  if (!enabled || brokers.length === 0) return null;

  if (!globalForKafka.kafkaClient) {
    globalForKafka.kafkaClient = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.WARN,
      connectionTimeout: 4000,
      requestTimeout: 10000,
      retry: {
        initialRetryTime: 300,
        retries: 3,
      },
    });
  }

  return globalForKafka.kafkaClient;
}

/**
 * Mendapatkan instance singleton Kafka Producer yang sudah terkoneksi
 */
export async function getKafkaProducer(): Promise<Producer | null> {
  const client = getKafkaClient();
  if (!client) return null;

  if (globalForKafka.kafkaProducer) {
    return globalForKafka.kafkaProducer;
  }

  if (globalForKafka.isConnectingProducer) {
    // Tunggu koneksi in-flight
    await new Promise(r => setTimeout(r, 200));
    return globalForKafka.kafkaProducer;
  }

  try {
    globalForKafka.isConnectingProducer = true;
    const producer = client.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    await producer.connect();
    globalForKafka.kafkaProducer = producer;
    console.log(`🚀 [Kafka Producer] Connected successfully to brokers: ${brokers.join(', ')}`);
    return producer;
  } catch (error: any) {
    console.warn(`⚠️ [Kafka Producer] Connection notice: ${error?.message || error}`);
    return null;
  } finally {
    globalForKafka.isConnectingProducer = false;
  }
}

/**
 * Mempublikasikan event ke topik Kafka secara andal dan non-blocking
 */
export async function publishKafkaEvent<T = any>(
  topic: KafkaTopicName | string,
  event: KafkaEventPayload<T>,
  partitionKey?: string
): Promise<boolean> {
  try {
    const producer = await getKafkaProducer();
    if (!producer) {
      // Fallback graceful jika Kafka offline
      return false;
    }

    const key = partitionKey || (event.userId ? String(event.userId) : event.event);
    const payloadWithMeta = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      source: event.source || 'masdika-backend',
    };

    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(payloadWithMeta),
          headers: {
            'content-type': 'application/json',
            'x-event-type': event.event,
            'x-published-at': payloadWithMeta.timestamp,
          },
        },
      ],
    });

    return true;
  } catch (err: any) {
    console.warn(`[Kafka] Failed to publish event to ${topic}:`, err?.message || err);
    return false;
  }
}

/**
 * Helper terstandarisasi untuk mempublikasikan Audit Log Client ke Kafka
 */
export async function publishAuditEvent(data: {
  userId: number;
  description: string;
  username?: string;
  ipAddress?: string;
  category?: string;
  metadata?: any;
}): Promise<boolean> {
  return publishKafkaEvent(KAFKA_TOPICS.AUDIT_LOGS, {
    event: 'client.audit_log',
    userId: data.userId,
    data: {
      userId: data.userId,
      description: data.description,
      username: data.username || 'System',
      ipAddress: data.ipAddress || '127.0.0.1',
      category: data.category || 'system',
      metadata: data.metadata,
    },
  });
}
