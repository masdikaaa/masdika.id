import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVpcDeletedEmail, sendCloudflareCleanupEmail } from '@/lib/email';
import { userHasActiveVps, userVpsGracePeriodExpired } from '@/lib/cloudflare-cleanup';
import fs from 'fs';
import path from 'path';
import { deleteFromRustFS } from '@/lib/rustfs';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function GET(req: Request) {
  try {
    // Authenticate cron requests via constant-time secret header check
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const now = new Date();
    const expiredMedia = await prisma.secureMedia.findMany({
      where: {
        expiresAt: { lt: now }
      }
    });

    let deletedCount = 0;

    for (const em of expiredMedia) {
      if (em.filename) {
        deleteFromRustFS(em.filename).catch(() => {});
        const safeName = path.basename(em.filename);
        const candidateDirs = [
          path.join(process.cwd(), "storage", "secure-media"),
          path.join(process.cwd(), "apps", "web", "storage", "secure-media")
        ];
        for (const dir of candidateDirs) {
          const filePath = path.join(dir, safeName);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch {}
          }
        }
      }
      await prisma.secureMedia.delete({ where: { id: em.id } });
      deletedCount++;
    }

    // --- Smart VPC Cleanup Logic ---
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const unusedVpcs = await prisma.vpcNetwork.findMany({
      where: {
        lastUsedAt: { lt: threeDaysAgo },
        vpsServices: {
          none: {
            status: { notIn: ["TERMINATED", "TERMINATING"] }
          }
        }
      },
      include: { router: true, peeringsA: true, peeringsB: true, user: true }
    });

    let deletedVpcCount = 0;
    for (const vpc of unusedVpcs) {
      try {
        const { deleteVpcFromMikrotik, deleteVpcPeeringFromMikrotik } = await import('@/lib/mikrotik');
        
        // Clean up any peerings first to prevent lingering routes on the peer VPC
        const allPeerings = [...vpc.peeringsA, ...vpc.peeringsB];
        for (const peering of allPeerings) {
          try {
            await deleteVpcPeeringFromMikrotik(vpc.router, peering.id);
            // The peering DB record will be cascade deleted when the VPC is deleted, 
            // but we can safely delete it now just to be clean
            await prisma.vpcPeering.delete({ where: { id: peering.id } });
          } catch (peeringErr) {
            console.error(`Failed to auto-cleanup peering ${peering.id}:`, peeringErr);
          }
        }

        await deleteVpcFromMikrotik(vpc.router, vpc);
        await prisma.vpcNetwork.delete({ where: { id: vpc.id } });
        
        // Send email notification to user
        if (vpc.user && vpc.user.email) {
          await sendVpcDeletedEmail(vpc.user.email, vpc.user.name || "Customer", vpc.name, vpc.cidr);
        }

        deletedVpcCount++;
        console.log(`Auto-cleaned up unused VPC: ${vpc.name} (ID: ${vpc.id})`);
      } catch (err) {
        console.error(`Failed to auto-cleanup VPC ${vpc.id}:`, err);
      }
    }

    // --- Smart Cloudflare Cleanup Logic ---
    let deletedCfDomains = 0;
    let deletedCfTunnels = 0;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    // 1. Delete domains that have been pending/inactive for > 3 days
    // ONLY if the user has no active VPS. If user has active VPS, protect their domain.
    const staleDomains = await prisma.cloudflareDomain.findMany({
      where: {
        status: { notIn: ["active", "healthy"] },
        createdAt: { lt: threeDaysAgo }
      },
      include: { user: true }
    });

    for (const d of staleDomains) {
      const graceExpired = await userVpsGracePeriodExpired(d.userId);
      if (!graceExpired) {
        // User still has an active VPS or 3-day grace period after termination is still active
        continue;
      }

      if (cfToken) {
        try {
          await fetch(`https://api.cloudflare.com/client/v4/zones/${d.cfZoneId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
          });
        } catch(e) { console.error(`Failed to delete zone ${d.cfZoneId} from CF`, e); }
      }
      await prisma.cloudflareDomain.delete({ where: { id: d.id } });
      deletedCfDomains++;
      console.log(`Auto-cleaned up stale pending domain (grace period expired): ${d.domain}`);
      if (d.user && d.user.email) {
        await sendCloudflareCleanupEmail(d.user.email, d.user.name || "Customer", d.domain, "Domain has been inactive/pending for more than 3 days and no active VPS services exist on your account.");
      }
    }

    // 2. Delete active domains ONLY if the user has NO active VPS AND 3-day grace period expired
    // (If the user still has an active VPS, even if the VPS is turned off / offline, PRESERVE their domain!)
    const activeDomains = await prisma.cloudflareDomain.findMany({
      where: {
        status: "active",
        createdAt: { lt: threeDaysAgo },
      },
      include: { user: true }
    });

    for (const d of activeDomains) {
      const graceExpired = await userVpsGracePeriodExpired(d.userId);
      if (!graceExpired) {
        // User still has an active VPS or 3-day grace period is still active. DO NOT DELETE!
        continue;
      }

      if (cfToken) {
        try {
          await fetch(`https://api.cloudflare.com/client/v4/zones/${d.cfZoneId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
          });
        } catch(e) { console.error(`Failed to delete zone ${d.cfZoneId} from CF`, e); }
      }
      await prisma.cloudflareDomain.delete({ where: { id: d.id } });
      deletedCfDomains++;
      console.log(`Auto-cleaned up active domain (grace period expired): ${d.domain}`);
      if (d.user && d.user.email) {
        await sendCloudflareCleanupEmail(d.user.email, d.user.name || "Customer", d.domain, "Domain was removed because no associated active VPS services exist on your account.");
      }
    }

    // 3. Stale tunnels cleanup
    // CRITICAL: If the user still has an active VPS (even if turned off / mati / offline),
    // or is within the 3-day grace period, NEVER delete their tunnel.
    const staleDBTunnels = await prisma.cloudflareTunnel.findMany({
       where: {
          createdAt: { lt: threeDaysAgo }
       },
       include: { user: true }
    });

    for (const t of staleDBTunnels) {
      // Check if 3-day grace period has expired without active VPS
      const graceExpired = await userVpsGracePeriodExpired(t.userId);
      if (!graceExpired) {
        // User still has an active VPS (the VPS may simply be stopped / offline) or within grace period. DO NOT DELETE!
        continue;
      }

      // User has no active VPS: safe to cleanup
      if (cfToken && cfAccountId) {
         try {
           const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${t.cfTunnelId}`, {
             method: 'GET',
             headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
           });
           const data = await res.json();
           
           if (data.success && data.result) {
             const tunnelData = data.result;
             const isInactive = tunnelData.status === "inactive" || tunnelData.status === "down";
             const lastActive = tunnelData.conns_inactive_at ? new Date(tunnelData.conns_inactive_at) : new Date(tunnelData.created_at);
             
             if (isInactive && lastActive < threeDaysAgo) {
               // Disconnect connections
               await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${t.cfTunnelId}/connections`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
               }).catch(() => {});

               // Delete from CF
               await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${t.cfTunnelId}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
               });
               // Delete from DB
               await prisma.cloudflareTunnel.delete({ where: { id: t.id } });
               deletedCfTunnels++;
               console.log(`Auto-cleaned up stale tunnel (no active VPS): ${t.name}`);
             }
           } else if (data.errors && data.errors.length > 0 && data.errors[0].code === 1003) {
             // 1003 usually means tunnel not found in CF, clean up DB
             await prisma.cloudflareTunnel.delete({ where: { id: t.id } });
             deletedCfTunnels++;
             console.log(`Cleaned up orphaned DB tunnel: ${t.name}`);
           }
         } catch(e) { console.error(`Failed to check/delete tunnel ${t.cfTunnelId}`, e); }
      }
    }

    return NextResponse.json({ success: true, deletedMediaCount: deletedCount, deletedVpcCount, deletedCfDomains, deletedCfTunnels });
  } catch (error: any) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
