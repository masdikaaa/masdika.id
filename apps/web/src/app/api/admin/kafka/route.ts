import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getKafkaClient, publishKafkaEvent, KAFKA_TOPICS } from '@/lib/kafka';

export const dynamic = 'force-dynamic';

/**
 * GET: Mengambil status koneksi Kafka, daftar topik, dan metadata broker
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = getKafkaClient();
    if (!client) {
      return NextResponse.json({
        status: 'disabled_or_misconfigured',
        message: 'Kafka client is disabled or KAFKA_BROKERS not configured',
      }, { status: 503 });
    }

    const admin = client.admin();
    await admin.connect();

    try {
      const cluster = await admin.describeCluster();
      const topics = await admin.listTopics();

      await admin.disconnect();

      return NextResponse.json({
        status: 'healthy',
        clusterId: cluster.clusterId,
        controller: cluster.controller,
        brokers: cluster.brokers,
        topicsCount: topics.length,
        topics,
        availableTopicsConfigured: KAFKA_TOPICS,
      });
    } catch (adminErr: any) {
      await admin.disconnect().catch(() => {});
      throw adminErr;
    }
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err?.message || 'Failed to connect to Kafka cluster',
    }, { status: 500 });
  }
}

/**
 * POST: Mengirim pesan uji (smoke test) ke Kafka melalui backend Masdika
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const topic = body.topic || KAFKA_TOPICS.SYSTEM_EVENTS;
    const testMessage = body.message || 'Kafka smoke test triggered from Masdika Admin API';

    const startTime = Date.now();
    const published = await publishKafkaEvent(topic, {
      event: 'admin.smoke_test',
      source: 'masdika-admin-api',
      userId: auth.user.id,
      data: {
        message: testMessage,
        triggeredBy: auth.user.email,
        timestamp: new Date().toISOString(),
      },
    });

    const durationMs = Date.now() - startTime;

    if (!published) {
      return NextResponse.json({
        success: false,
        message: 'Failed to publish event to Kafka (producer returned false)',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      topic,
      durationMs,
      message: 'Event published to Kafka successfully',
      event: 'admin.smoke_test',
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || 'Internal Server Error',
    }, { status: 500 });
  }
}

