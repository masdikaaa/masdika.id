import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!cfToken || !cfAccountId) {
      return NextResponse.json({ error: "Cloudflare credentials not configured" }, { status: 500 });
    }

    // Get only this user's tunnels from our database
    const userTunnels = await prisma.cloudflareTunnel.findMany({
      where: { userId: Number(user.id) },
      orderBy: { createdAt: "desc" },
    });

    // Check if user has an active VPS
    const vpsCount = await prisma.vpsService.count({
      where: {
        userId: Number(user.id),
        status: { notIn: ["TERMINATED", "SUSPENDED", "PENDING"] }
      }
    });

    if (userTunnels.length === 0) {
      return NextResponse.json({ tunnels: [], total: 0, vpsCount });
    }

    // Fetch live status from Cloudflare API for each user-owned tunnel
    const tunnels = [];
    for (const dbTunnel of userTunnels) {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${dbTunnel.cfTunnelId}`,
          {
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const data = await res.json();

        if (data.success && data.result) {
          const t = data.result;
          let connections = t.connections || [];
          try {
            const connsRes = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${dbTunnel.cfTunnelId}/connections`,
              {
                headers: {
                  'Authorization': `Bearer ${cfToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            const connsData = await connsRes.json();
            if (connsData.success && Array.isArray(connsData.result)) {
              connections = connsData.result;
            }
          } catch { /* fallback to connections from tunnel response if available */ }

          // Enrich connections with arch/platform from connector details
          const enrichedConnections = [...connections];
          const seenClientIds = new Set<string>();
          for (const conn of connections) {
            const clientId = conn.id || conn.client_id;
            
            // Try to infer hostname from origin IP using our DB
            let inferredHostname = "";
            const originIp = conn.origin_ip || conn.conns?.[0]?.origin_ip;
            if (originIp) {
              try {
                const vps = await prisma.vpsService.findFirst({
                  where: { 
                    userId: Number(user.id),
                    assignedIps: {
                      some: {
                        OR: [
                          { ipAddress: originIp },
                          { publicIp: originIp }
                        ]
                      }
                    }
                  }
                });
                if (vps) {
                  inferredHostname = vps.hostname; // Note: VpsService uses 'hostname' not 'name'
                }
              } catch (e) {
                console.error("Failed to lookup VPS for hostname inference", e);
              }
            }

            if (clientId && !seenClientIds.has(clientId)) {
              seenClientIds.add(clientId);
              try {
                const hostname = inferredHostname;
                for (const c of enrichedConnections) {
                  if ((c.id || c.client_id) === clientId) {
                    c._hostname = hostname || "";
                  }
                }
              } catch { /* ignore connector detail fetch errors */ }
            }
          }

          tunnels.push({
            id: t.id,
            name: t.name,
            status: t.status,
            createdAt: t.created_at,
            connections: enrichedConnections,
            connsActiveAt: t.conns_active_at,
          });
        } else {
          // Tunnel might have been deleted from Cloudflare directly, 
          // still show from DB but mark as unknown
          tunnels.push({
            id: dbTunnel.cfTunnelId,
            name: dbTunnel.name,
            status: "unknown",
            createdAt: dbTunnel.createdAt.toISOString(),
            connections: [],
            connsActiveAt: null,
          });
        }
      } catch {
        // If CF API fails for this tunnel, show from DB
        tunnels.push({
          id: dbTunnel.cfTunnelId,
          name: dbTunnel.name,
          status: "unknown",
          createdAt: dbTunnel.createdAt.toISOString(),
          connections: [],
          connsActiveAt: null,
        });
      }
    }

    return NextResponse.json({ tunnels, total: tunnels.length, vpsCount });
  } catch (error: any) {
    console.error("Failed to list tunnels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
