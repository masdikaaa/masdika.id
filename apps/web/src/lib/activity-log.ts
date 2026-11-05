import { prisma } from '@/lib/prisma';
import { publishAuditEvent } from '@/lib/kafka';

export interface LogClientActivityParams {
  userId: number;
  description: string;
  username?: string;
  ipAddress?: string;
  category?: 'order' | 'invoice' | 'payment' | 'email' | 'service' | 'system' | 'auth';
  metadata?: Record<string, any> | string;
}

/**
 * Record an activity / audit log entry for a client (WHMCS-style Activity Log)
 */
export async function logClientActivity({
  userId,
  description,
  username = 'System',
  ipAddress = '127.0.0.1',
  category = 'system',
  metadata
}: LogClientActivityParams) {
  try {
    if (!userId || !description) return null;

    // 1. Stream ke Apache Kafka Event Bus secara asinkron (non-blocking)
    publishAuditEvent({
      userId,
      description,
      username,
      ipAddress,
      category,
      metadata: {
        ...(typeof metadata === 'object' ? metadata : { raw: metadata }),
        persist: false, // Sudah disimpan langsung ke database di bawah untuk respons instan
      },
    }).catch(() => {});

    const metaString = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata || null;

    return await prisma.clientActivityLog.create({
      data: {
        userId,
        description: description.trim(),
        username,
        ipAddress,
        category,
        metadata: metaString,
      }
    });
  } catch (err) {
    console.warn('Failed to record client activity log:', err);
    return null;
  }
}
