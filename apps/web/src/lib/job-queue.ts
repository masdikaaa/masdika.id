import { prisma } from "@/lib/prisma";

export type JobType = 'PROVISION_VPS' | 'INSTALL_K3S' | 'REINSTALL_K3S';

export class JobQueueService {
  static async enqueue(type: JobType, payload: any) {
    return await prisma.backgroundJob.create({
      data: {
        type,
        payload: JSON.stringify(payload),
        status: 'PENDING'
      }
    });
  }

  // Atomically grab the next pending job safely (concurrency safe for multiple Docker containers)
  static async processNextJob() {
    // We use raw SQL with FOR UPDATE SKIP LOCKED to ensure atomic picking.
    // If multiple Docker containers try to fetch a job at the exact same millisecond,
    // the database will lock the row for the first one, and the second one will "SKIP LOCKED"
    // and grab the NEXT available job instead of blocking or picking the same one.
    const result = await prisma.$queryRaw<any[]>`
      UPDATE "BackgroundJob"
      SET 
        "status" = 'PROCESSING',
        "attempts" = "attempts" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = (
        SELECT id
        FROM "BackgroundJob"
        WHERE status = 'PENDING'
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *;
    `;

    if (!result || result.length === 0) return null;

    return result[0];
  }

  static async completeJob(jobId: number) {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED' }
    });
  }

  static async failJob(jobId: number, error: string) {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error }
    });
  }
}
