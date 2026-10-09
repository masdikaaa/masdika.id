import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { requireAuth } from "@/lib/auth-middleware";
import { createVncSession } from "@/lib/vnc-session";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    // Rate Limit: Max 60 console requests per 5 minutes per user
    const allowed = await checkRateLimit("VPS_CONSOLE", user.id.toString(), 60, 300);
    if (!allowed) {
      return NextResponse.json({ error: "Too many console requests. Please wait a moment." }, { status: 429 });
    }

    const { vpsId } = await req.json();

    // Admin can access any VPS, users can only access their own
    const whereClause: any = { id: Number(vpsId) };
    if (user.role !== "ADMIN") {
      whereClause.userId = Number(user.id);
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause,
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "Proxmox server not configured" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const vncData = await proxmox.getVncProxy(vps.node, vps.vmid);
    const proxmoxBase = server.host.replace(/\/+$/, "");

    // Store credentials server-side and get a one-time session ID
    const vncSessionId = createVncSession({
      proxmoxHost: proxmoxBase,
      node: vps.node,
      vmid: vps.vmid,
      port: vncData.port,
      ticket: vncData.ticket,
      tokenId: server.tokenId,
      tokenSecret: server.tokenSecret,
      userId: Number(user.id),
    });


    // Set cookie for the WebSocket proxy to read securely
    const cookieStore = await cookies();
    cookieStore.set("VNC_SESSION_TOKEN", vncSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30, // 30 minutes
    });

    // 3. Build noVNC URL
    // Remove the session from query string since it's in the cookie
    // We pass the ticket as the 'password' parameter so noVNC uses it for Proxmox VNC Auth
    const proxyPath = `/api/ws/vnc`;
    const consolePageUrl = `/novnc-ui/vnc.html?path=${encodeURIComponent(proxyPath)}&password=${encodeURIComponent(vncData.ticket)}&title=${encodeURIComponent(vps.hostname + " Console")}&resize=remote&autoconnect=true&vpsId=${vps.id}`;

    return NextResponse.json({ 
      consolePageUrl,
      // Only return ticket for noVNC password field — this is a Proxmox VNC ticket, NOT the API token
      ticket: vncData.ticket, 
      port: vncData.port,
    });
  } catch (error: any) {
    console.error("VNC console error:", error);
    return NextResponse.json({ error: error.message || "Failed to get VNC console" }, { status: 500 });
  }
}
