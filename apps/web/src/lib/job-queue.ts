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

  /**
   * Recovers jobs that got stuck in 'PROCESSING' state due to a worker container restart or crash.
   * - Jobs with attempts < 3 are reset to 'PENDING' so they can be re-executed.
   * - Jobs with attempts >= 3 are marked 'FAILED' to avoid endless loops.
   */
  static async recoverStaleJobs(staleMinutes: number = 10): Promise<number> {
    const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

    const staleJobs = await prisma.backgroundJob.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: cutoff }
      }
    });

    if (staleJobs.length === 0) return 0;

    let recovered = 0;
    for (const job of staleJobs) {
      if (job.attempts < 3) {
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: 'PENDING',
            updatedAt: new Date()
          }
        });
        console.log(`[JobQueue] Auto-recovered stuck job #${job.id} (${job.type}) -> PENDING for retry`);
        recovered++;
      } else {
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            error: 'Job exceeded maximum retry attempts after unexpected worker restart'
          }
        });
        console.warn(`[JobQueue] Marked stuck job #${job.id} (${job.type}) as FAILED (max attempts reached)`);
      }
    }

    return recovered;
  }
}
