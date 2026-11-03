import { prisma } from '@/lib/prisma';
import { sendCloudflareCleanupEmail } from '@/lib/email';

/**
 * Checks if a user has any existing, non-terminated VPS.
 * A VPS that is powered off / stopped still exists and has status != 'TERMINATED' and != 'TERMINATING'.
 */
export async function userHasActiveVps(userId: number): Promise<boolean> {
  const count = await prisma.vpsService.count({
    where: {
      userId,
      status: { notIn: ['TERMINATED', 'TERMINATING'] }
    }
  });
  return count > 0;
}

/**
 * Checks if a user's VPS termination grace period (default 3 days) has expired.
 * - If user still has an active VPS: returns false (protected).
 * - If user's latest VPS was terminated within the grace period (< 3 days ago): returns false (still in 3-day grace period).
 * - If user has no active VPS AND at least 3 days have elapsed since the latest termination (or user never had a VPS): returns true (ready for cleanup).
 */
export async function userVpsGracePeriodExpired(userId: number, graceDays = 3): Promise<boolean> {
  const hasActive = await userHasActiveVps(userId);
  if (hasActive) return false;

  const threshold = new Date();
  threshold.setDate(threshold.getDate() - graceDays);

  const recentlyTerminatedVps = await prisma.vpsService.findFirst({
    where: {
      userId,
      status: { in: ['TERMINATED', 'TERMINATING'] },
      OR: [
        { terminationDate: { gt: threshold } },
        { updatedAt: { gt: threshold } }
      ]
    }
  });

  if (recentlyTerminatedVps) {
    // Terminated recently (within 3 days) -> grace period is still active
    return false;
  }

  // Grace period expired (terminated > 3 days ago or never had VPS)
  return true;
}

/**
 * Automatically cleans up all Cloudflare Tunnels and Domains belonging to a user,
 * enforcing a 3-day grace period by default.
 *
 * Rules:
 * 1. If the user still has an active VPS service (even if turned off / offline / stopped),
 *    tunnels and domains are strictly PROTECTED and will NEVER be deleted.
 * 2. If the user's VPS was recently terminated (within 3 days),
 *    tunnels and domains are PROTECTED for the 3-day grace period.
 * 3. After 3 days without any active VPS, the resources are cleanly deleted.
 */
export async function cleanupUserCloudflareResourcesIfNoActiveVps(
  userId: number,
  options?: {
    reason?: string;
    enforceGracePeriod?: boolean;
    graceDays?: number;
  }
) {
  const enforceGracePeriod = options?.enforceGracePeriod ?? true;
  const graceDays = options?.graceDays ?? 3;
  const reason =
    options?.reason ||
    'All associated VPS services have been terminated or no longer exist (3-day grace period expired).';

  if (enforceGracePeriod) {
    const expired = await userVpsGracePeriodExpired(userId, graceDays);
    if (!expired) {
      return {
        success: true,
        skipped: true,
        message: 'User still has an active VPS or is within the 3-day termination grace period. Cloudflare tunnels and domains are preserved.',
        deletedTunnels: 0,
        deletedDomains: 0
      };
    }
  } else {
    const hasVps = await userHasActiveVps(userId);
    if (hasVps) {
      return {
        success: true,
        skipped: true,
        message: 'User still has an active VPS service. Cloudflare tunnels and domains are preserved.',
        deletedTunnels: 0,
        deletedDomains: 0
      };
    }
  }

  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  let deletedTunnels = 0;
  let deletedDomains = 0;

  // 1. Delete all Cloudflare Tunnels for this user
  const tunnels = await prisma.cloudflareTunnel.findMany({
    where: { userId }
  });

  for (const t of tunnels) {
    if (cfToken && cfAccountId) {
      try {
        // Disconnect connections first
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${t.cfTunnelId}/connections`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            }
          }
        ).catch(() => {});

        // Delete tunnel from Cloudflare
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${t.cfTunnelId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            }
          }
        ).catch(() => {});
      } catch (err) {
        console.error(`[Cloudflare Cleanup] Failed to delete CF tunnel ${t.cfTunnelId}:`, err);
      }
    }

    try {
      await prisma.cloudflareTunnel.delete({ where: { id: t.id } });
      deletedTunnels++;
      console.log(`[Cloudflare Cleanup] Deleted tunnel ${t.name} (ID: ${t.cfTunnelId}) for user ${userId}`);
    } catch (dbErr) {
      console.error(`[Cloudflare Cleanup] Failed to delete tunnel from DB:`, dbErr);
    }
  }

  // 2. Delete all Cloudflare Domains for this user
  const domains = await prisma.cloudflareDomain.findMany({
    where: { userId },
    include: { user: true }
  });

  for (const d of domains) {
    if (cfToken) {
      try {
        await fetch(`https://api.cloudflare.com/client/v4/zones/${d.cfZoneId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${cfToken}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => {});
      } catch (err) {
        console.error(`[Cloudflare Cleanup] Failed to delete CF zone ${d.cfZoneId}:`, err);
      }
    }

    try {
      await prisma.cloudflareDomain.delete({ where: { id: d.id } });
      deletedDomains++;
      console.log(`[Cloudflare Cleanup] Deleted domain ${d.domain} (Zone: ${d.cfZoneId}) for user ${userId}`);

      if (d.user && d.user.email) {
        try {
          await sendCloudflareCleanupEmail(d.user.email, d.user.name || 'Customer', d.domain, reason);
        } catch {}
      }
    } catch (dbErr) {
      console.error(`[Cloudflare Cleanup] Failed to delete domain from DB:`, dbErr);
    }
  }

  return {
    success: true,
    skipped: false,
    deletedTunnels,
    deletedDomains
  };
}
