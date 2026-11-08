import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

const ALLOWED_FIREWALL_FIELDS = ['action', 'type', 'dport', 'sport', 'proto', 'source', 'dest', 'comment', 'enable', 'log', 'macro', 'iface', 'digest', 'moveto'] as const;
const VALID_ACTIONS = ['ACCEPT', 'DROP', 'REJECT'] as const;
const VALID_PROTOS = ['tcp', 'udp', 'icmp', 'any', 'igmp'] as const;

function isSystemManagedRule(rule: any): boolean {
  const comment = String(rule?.comment || '');
  return comment.startsWith('Allow internal VPC') || comment.startsWith('[SYSTEM]') || comment.startsWith('K3s');
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, pos: string }> }) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (!/^\d+$/.test(resolvedParams.id) || !/^\d+$/.test(resolvedParams.pos)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    const vpsId = parseInt(resolvedParams.id, 10);
    const pos = parseInt(resolvedParams.pos, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0 || !Number.isSafeInteger(pos) || pos < 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const isAdmin = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN';
    const rawBody = await req.json();
    const validTypes = isAdmin ? (['in', 'out', 'group'] as const) : (['in', 'out'] as const);

    const body: Record<string, any> = {};
    for (const field of ALLOWED_FIREWALL_FIELDS) {
      if (rawBody[field] !== undefined) {
        body[field] = rawBody[field];
      }
    }

    if (body.action && !VALID_ACTIONS.includes(body.action)) {
      return NextResponse.json({ error: "Invalid firewall action. Must be ACCEPT, DROP, or REJECT." }, { status: 400 });
    }
    if (body.proto && !VALID_PROTOS.includes(body.proto)) {
      return NextResponse.json({ error: "Invalid protocol." }, { status: 400 });
    }
    if (body.type && !(validTypes as readonly string[]).includes(body.type)) {
      return NextResponse.json({ error: "Invalid rule type." }, { status: 400 });
    }
    if (body.dport && !/^[\d,:*-]+$/.test(String(body.dport))) {
      return NextResponse.json({ error: "Invalid destination port format." }, { status: 400 });
    }
    if (body.sport && !/^[\d,:*-]+$/.test(String(body.sport))) {
      return NextResponse.json({ error: "Invalid source port format." }, { status: 400 });
    }
    if (body.comment && String(body.comment).length > 255) {
      return NextResponse.json({ error: "Comment is too long (max 255 chars)." }, { status: 400 });
    }
    if (body.moveto !== undefined && (!Number.isSafeInteger(Number(body.moveto)) || Number(body.moveto) < 0)) {
      return NextResponse.json({ error: "Invalid moveto position." }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: isAdmin ? undefined : auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    if (!isAdmin) {
      const existingRules = await proxmox.getFirewallRules(vps.node, vps.vmid);
      const targetRule = (existingRules || []).find((r: any) => Number(r.pos) === pos);
      if (targetRule && isSystemManagedRule(targetRule)) {
        return NextResponse.json({ error: "System-managed VPC/K3s firewall rules cannot be modified." }, { status: 403 });
      }
    }

    const updatedRule = await proxmox.updateFirewallRule(vps.node, vps.vmid, pos, body);

    return NextResponse.json({ success: true, rule: updatedRule });
  } catch (error: any) {
    console.error("Failed to update firewall rule:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, pos: string }> }) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (!/^\d+$/.test(resolvedParams.id) || !/^\d+$/.test(resolvedParams.pos)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    const vpsId = parseInt(resolvedParams.id, 10);
    const pos = parseInt(resolvedParams.pos, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0 || !Number.isSafeInteger(pos) || pos < 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const isAdmin = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN';

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: isAdmin ? undefined : auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    if (!isAdmin) {
      const existingRules = await proxmox.getFirewallRules(vps.node, vps.vmid);
      const targetRule = (existingRules || []).find((r: any) => Number(r.pos) === pos);
      if (targetRule && isSystemManagedRule(targetRule)) {
        return NextResponse.json({ error: "System-managed VPC/K3s firewall rules cannot be deleted." }, { status: 403 });
      }
    }

    await proxmox.deleteFirewallRule(vps.node, vps.vmid, pos);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete firewall rule:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
