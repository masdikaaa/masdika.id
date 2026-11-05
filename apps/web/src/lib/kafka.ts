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
  lastConnectionAttemptFailed: number;
};

// -----------------------------------------------------------------------------
// ENVIRONMENT DETECTION: SAFE FOR LOCAL DEV, ACTIVE IN PROD / K8S / DOCKER
// -----------------------------------------------------------------------------
const isKubernetes = Boolean(process.env.KUBERNETES_SERVICE_HOST);
const isExplicitlyEnabled = process.env.USE_KAFKA === 'true';
const isExplicitlyDisabled = process.env.USE_KAFKA === 'false';
const hasExplicitBrokers = Boolean(process.env.KAFKA_BROKERS);

/**
 * Aturan aktivasi Kafka:
 * 1. Di klaster Kubernetes atau Production: Otomatis AKTIF (kecuali diset USE_KAFKA=false)
 * 2. Di Local Development: HANYA aktif jika KAFKA_BROKERS atau USE_KAFKA=true didefinisikan secara eksplisit.
 *    Ini mencegah error koneksi / timeout ke 127.0.0.1:9092 jika Kafka lokal tidak dinyalakan.
 */
export const isKafkaEnabled = !isExplicitlyDisabled && (
  isExplicitlyEnabled ||
  hasExplicitBrokers ||
  isKubernetes
);

const rawBrokers = process.env.KAFKA_BROKERS || 
  (isKubernetes ? 'masdika-kafka.masdika.svc.cluster.local:9092' : '127.0.0.1:9092');

const brokers = rawBrokers.split(',').map(b => b.trim()).filter(Boolean);
const clientId = process.env.KAFKA_CLIENT_ID || 'masdika-backend';

// Cooldown period (30 detik): Jika koneksi gagal, jangan ulangi setiap request agar tidak ada latency hang
const CONNECTION_COOLDOWN_MS = 30000;

/**
 * Mendapatkan instance singleton Kafka Client
 */
export function getKafkaClient(): Kafka | null {
  if (!isKafkaEnabled || brokers.length === 0) return null;

  if (!globalForKafka.kafkaClient) {
    globalForKafka.kafkaClient = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.WARN,
      connectionTimeout: 3000,
      requestTimeout: 8000,
      retry: {
        initialRetryTime: 250,
        retries: 2,
      },
    });
  }

  return globalForKafka.kafkaClient;
}

/**
 * Mendapatkan instance singleton Kafka Producer yang sudah terkoneksi
 */
export async function getKafkaProducer(): Promise<Producer | null> {
  if (!isKafkaEnabled) return null;

  const client = getKafkaClient();
  if (!client) return null;

  if (globalForKafka.kafkaProducer) {
    return globalForKafka.kafkaProducer;
  }

  // Circuit breaker: jika koneksi baru saja gagal dalam 30s terakhir, fallback langsung tanpa delay
  const now = Date.now();
  if (globalForKafka.lastConnectionAttemptFailed && (now - globalForKafka.lastConnectionAttemptFailed < CONNECTION_COOLDOWN_MS)) {
    return null;
  }

  if (globalForKafka.isConnectingProducer) {
    // Tunggu koneksi in-flight singkat
    await new Promise(r => setTimeout(r, 150));
    return globalForKafka.kafkaProducer;
  }

  try {
    globalForKafka.isConnectingProducer = true;
    const producer = client.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
      allowAutoTopicCreation: true,
      transactionTimeout: 15000,
    });

    await producer.connect();
    globalForKafka.kafkaProducer = producer;
    globalForKafka.lastConnectionAttemptFailed = 0;
    console.log(`🚀 [Kafka Producer] Connected successfully to brokers: ${brokers.join(', ')}`);
    return producer;
  } catch (error: any) {
    globalForKafka.lastConnectionAttemptFailed = Date.now();
    // Hanya log peringatan sekali saat gagal, tidak crash
    console.warn(`⚠️ [Kafka Producer] Unavailable (${error?.message || error}). Entering ${CONNECTION_COOLDOWN_MS / 1000}s cooldown.`);
    return null;
  } finally {
    globalForKafka.isConnectingProducer = false;
  }
}

/**
 * Mempublikasikan event ke topik Kafka secara andal, aman, dan non-blocking
 */
export async function publishKafkaEvent<T = any>(
  topic: KafkaTopicName | string,
  event: KafkaEventPayload<T>,
  partitionKey?: string
): Promise<boolean> {
  if (!isKafkaEnabled) {
    // Di development tanpa Kafka, langsung return true tanpa delay
    return true;
  }

  try {
    const producer = await getKafkaProducer();
    if (!producer) {
      // Fallback graceful jika Kafka sedang offline / cooldown
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
