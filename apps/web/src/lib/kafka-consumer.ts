import { Consumer } from 'kafkajs';
import { getKafkaClient, KAFKA_TOPICS, KafkaEventPayload } from '@/lib/kafka';
import { prisma } from '@/lib/prisma';

let activeConsumer: Consumer | null = null;
let isRunning = false;

/**
 * Memulai Kafka Consumer di latar belakang (digunakan oleh masdika-worker)
 */
export async function startKafkaConsumer(groupId = 'masdika-worker-group'): Promise<Consumer | null> {
  const client = getKafkaClient();
  if (!client) {
    console.log('ℹ️ [Kafka Consumer] Kafka client not enabled or brokers not configured. Skipping consumer startup.');
    return null;
  }

  if (activeConsumer && isRunning) {
    return activeConsumer;
  }

  try {
    const consumer = client.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      retry: {
        retries: 5,
        initialRetryTime: 500,
      },
    });

    await consumer.connect();
    console.log(`🎧 [Kafka Consumer] Connected to Kafka with Group ID: ${groupId}`);

    // Subscribe ke semua topik event inti Masdika
    await consumer.subscribe({
      topics: [
        KAFKA_TOPICS.AUDIT_LOGS,
        KAFKA_TOPICS.USER_EVENTS,
        KAFKA_TOPICS.BILLING_EVENTS,
        KAFKA_TOPICS.SYSTEM_EVENTS,
      ],
      fromBeginning: false,
    });

    await consumer.run({
      autoCommit: true,
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const rawValue = message.value?.toString('utf-8');
          if (!rawValue) return;

          const payload: KafkaEventPayload = JSON.parse(rawValue);
          const eventType = message.headers?.['x-event-type']?.toString() || payload.event;

          console.log(`📨 [Kafka Consumer] [${topic}|P${partition}] Received event: ${eventType} (Key: ${message.key?.toString() || 'none'})`);

          // Handler spesifik sesuai topik
          if (topic === KAFKA_TOPICS.AUDIT_LOGS) {
            await handleAuditLogMessage(payload);
          } else if (topic === KAFKA_TOPICS.BILLING_EVENTS) {
            console.log(`💳 [Kafka Consumer] Billing event acknowledged: ${eventType}`);
          } else if (topic === KAFKA_TOPICS.USER_EVENTS) {
            console.log(`👤 [Kafka Consumer] User event acknowledged: ${eventType}`);
          }
        } catch (msgErr: any) {
          console.error(`❌ [Kafka Consumer] Error processing message on topic ${topic}:`, msgErr?.message || msgErr);
        }
      },
    });

    activeConsumer = consumer;
    isRunning = true;
    return consumer;
  } catch (err: any) {
    console.warn(`⚠️ [Kafka Consumer] Failed to start consumer: ${err?.message || err}`);
    return null;
  }
}

/**
 * Memproses pesan Audit Log dari Kafka
 */
async function handleAuditLogMessage(payload: KafkaEventPayload) {
  const data = payload.data;
  if (!data || !data.userId || !data.description) return;

  // Jika payload memiliki flag persist=true atau direct stream, catat ke database
  if (data.persist !== false) {
    try {
      const metaString = typeof data.metadata === 'object' ? JSON.stringify(data.metadata) : data.metadata || null;

      await prisma.clientActivityLog.create({
        data: {
          userId: Number(data.userId),
          description: String(data.description).trim(),
          username: data.username || 'Kafka Consumer',
          ipAddress: data.ipAddress || '127.0.0.1',
          category: data.category || 'kafka-event',
          metadata: metaString,
        },
      });
      console.log(`✅ [Kafka Consumer] Audit log persisted to DB for User #${data.userId}: "${data.description}"`);
    } catch (dbErr: any) {
      console.warn(`⚠️ [Kafka Consumer] Could not persist audit log to DB:`, dbErr?.message || dbErr);
    }
  }
}

/**
 * Hentikan Kafka Consumer secara anggun saat shutdown sinyal SIGTERM/SIGINT
 */
export async function stopKafkaConsumer(): Promise<void> {
  if (activeConsumer) {
    try {
      console.log('🛑 [Kafka Consumer] Disconnecting gracefully...');
      await activeConsumer.disconnect();
      activeConsumer = null;
      isRunning = false;
      console.log('✅ [Kafka Consumer] Disconnected successfully');
    } catch (err: any) {
      console.warn('⚠️ [Kafka Consumer] Error during disconnect:', err?.message || err);
    }
  }
}

