import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVpcDeletedEmail, sendCloudflareCleanupEmail } from '@/lib/email';
import fs from 'fs';
import path from 'path';
import { deleteFromRustFS } from '@/lib/rustfs';

export async function GET(req: Request) {
  try {
    // Authenticate cron requests via secret header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
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
      deleteFromRustFS(em.filename).catch(() => {});
      const candidateDirs = [
        path.join(process.cwd(), "storage", "secure-media"),
        path.join(process.cwd(), "apps", "web", "storage", "secure-media")
      ];
      for (const dir of candidateDirs) {
        const filePath = path.join(dir, em.filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
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
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;

    // 1. Delete domains that have been pending/inactive for > 3 days
    const staleDomains = await prisma.cloudflareDomain.findMany({
      where: {
        status: { notIn: ["active", "healthy"] },
        createdAt: { lt: threeDaysAgo }
      },
      include: { user: true }
    });

    for (const d of staleDomains) {
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
      console.log(`Auto-cleaned up stale pending domain: ${d.domain}`);
      if (d.user && d.user.email) {
        await sendCloudflareCleanupEmail(d.user.email, d.user.name || "Customer", d.domain, "Domain has been inactive/pending for more than 3 days.");
      }
    }

    // 2. Delete active domains that have been pointed for > 3 days but the user has NO tunnels (unused)
    const unusedActiveDomains = await prisma.cloudflareDomain.findMany({
      where: {
        status: "active",
        createdAt: { lt: threeDaysAgo },
        user: {
           cloudflareTunnels: { none: {} }
        }
      },
      include: { user: true }
    });

    for (const d of unusedActiveDomains) {
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
      console.log(`Auto-cleaned up unused active domain (no tunnels): ${d.domain}`);
      if (d.user && d.user.email) {
        await sendCloudflareCleanupEmail(d.user.email, d.user.name || "Customer", d.domain, "Domain was active but no tunnels were configured for more than 3 days.");
      }
    }

    // 3. Delete stale tunnels that haven't been used in 3 days
    let deletedCfTunnels = 0;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const staleDBTunnels = await prisma.cloudflareTunnel.findMany({
       where: {
          createdAt: { lt: threeDaysAgo }
       },
       include: { user: true }
    });

    for (const t of staleDBTunnels) {
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
               // Delete from CF
               await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${t.cfTunnelId}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' }
               });
               // Delete from DB
               await prisma.cloudflareTunnel.delete({ where: { id: t.id } });
               deletedCfTunnels++;
               console.log(`Auto-cleaned up stale tunnel: ${t.name}`);
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
