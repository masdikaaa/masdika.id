import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpsId = parseInt(resolvedParams.id);
    if (isNaN(vpsId)) return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: auth.user?.role === 'ADMIN' ? undefined : auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const rules = await proxmox.getFirewallRules(vps.node, vps.vmid);

    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    console.error("Failed to get firewall rules:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpsId = parseInt(resolvedParams.id);
    if (isNaN(vpsId)) return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });

    const rawBody = await req.json();

    // Security: Whitelist only known valid Proxmox firewall fields to prevent
    // arbitrary API injection (e.g., user injecting 'node', 'vmid', or other internal fields)
    const ALLOWED_FIREWALL_FIELDS = ['action', 'type', 'dport', 'sport', 'proto', 'source', 'dest', 'comment', 'enable', 'log', 'macro', 'iface'] as const;
    const VALID_ACTIONS = ['ACCEPT', 'DROP', 'REJECT'] as const;
    const VALID_PROTOS = ['tcp', 'udp', 'icmp', 'any', 'igmp'] as const;
    const VALID_TYPES = ['in', 'out', 'group'] as const;

    const body: Record<string, any> = {};
    for (const field of ALLOWED_FIREWALL_FIELDS) {
      if (rawBody[field] !== undefined) {
        body[field] = rawBody[field];
      }
    }

    // Validate critical fields
    if (body.action && !VALID_ACTIONS.includes(body.action)) {
      return NextResponse.json({ error: "Invalid firewall action. Must be ACCEPT, DROP, or REJECT." }, { status: 400 });
    }
    if (body.proto && !VALID_PROTOS.includes(body.proto)) {
      return NextResponse.json({ error: "Invalid protocol." }, { status: 400 });
    }
    if (body.type && !VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Invalid rule type." }, { status: 400 });
    }
    // Validate port ranges (e.g., "80", "80:443", "80-443")
    if (body.dport && !/^[\d,:*-]+$/.test(String(body.dport))) {
      return NextResponse.json({ error: "Invalid destination port format." }, { status: 400 });
    }
    if (body.sport && !/^[\d,:*-]+$/.test(String(body.sport))) {
      return NextResponse.json({ error: "Invalid source port format." }, { status: 400 });
    }
    // Limit comment length
    if (body.comment && String(body.comment).length > 255) {
      return NextResponse.json({ error: "Comment is too long (max 255 chars)." }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: auth.user?.role === 'ADMIN' ? undefined : auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    // Pass only the sanitized, whitelisted fields to Proxmox
    const newRule = await proxmox.createFirewallRule(vps.node, vps.vmid, body);

    return NextResponse.json({ success: true, rule: newRule });
  } catch (error: any) {
    console.error("Failed to create firewall rule:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
