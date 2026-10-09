import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const tunnels = await prisma.cloudflareTunnel.findMany({
      include: {
        user: { select: { name: true, email: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const domains = await prisma.cloudflareDomain.findMany({
      include: {
        user: { select: { name: true, email: true, image: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const decryptedTunnels = tunnels.map(t => ({
      ...t,
      user: t.user ? {
        ...t.user,
        email: decryptDeterministic(t.user.email),
        name: t.user.name ? decryptDeterministic(t.user.name) : t.user.name
      } : null
    }));

    const decryptedDomains = domains.map(d => ({
      ...d,
      user: d.user ? {
        ...d.user,
        email: decryptDeterministic(d.user.email),
        name: d.user.name ? decryptDeterministic(d.user.name) : d.user.name
      } : null
    }));

    // Fetch real data from Cloudflare
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    
    let cfTunnelsData: any[] = [];
    if (accountId && cfToken) {
      try {
        const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel`, {
          headers: { 'Authorization': `Bearer ${cfToken}` },
          next: { revalidate: 0 }
        });
        const cfJson = await cfRes.json();
        if (cfJson.success) {
          cfTunnelsData = cfJson.result;
        }
      } catch(e) {
        console.error("Failed to fetch CF tunnels", e);
      }
    }

    // Merge CF real data into tunnels
    const mergedTunnels = decryptedTunnels.map(t => {
      const cfTunnel = cfTunnelsData.find((cf: any) => cf.id === t.cfTunnelId);
      let connectors = 0;
      if (cfTunnel && cfTunnel.connections) {
        const uniqueConnectors = new Set();
        for (const conn of cfTunnel.connections) {
          const clientId = conn.client_id;
          if (clientId) uniqueConnectors.add(clientId);
        }
        connectors = uniqueConnectors.size;
      }
      return {
        ...t,
        cfStatus: cfTunnel ? cfTunnel.status : 'unknown',
        connectors: connectors,
        cfData: cfTunnel || null
      };
    });

    return NextResponse.json({ success: true, tunnels: mergedTunnels, domains: decryptedDomains });
  } catch (error) {
    console.error("Fetch Cloudflared Data Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
