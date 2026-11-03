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
 * Automatically cleans up all Cloudflare Tunnels and Domains belonging to a user,
 * BUT ONLY IF the user has NO active (non-terminated) VPS services remaining.
 *
 * If the user still has at least one VPS service (even if the VPS is turned off /
 * powered down / inactive), their tunnels and domains are strictly PROTECTED
 * and will NEVER be deleted automatically.
 */
export async function cleanupUserCloudflareResourcesIfNoActiveVps(
  userId: number,
  reason = 'All associated VPS services have been terminated or no longer exist.'
) {
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
