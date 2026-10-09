import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { encryptDeterministic } from "@/lib/encryption";

// Security: Hostname validation regex (RFC 1123)
const HOSTNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id } = await params;
    const whereClause: any = { id: parseInt(id) };
    if (user?.role !== "ADMIN") {
        whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }

    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    }

    const body = await req.json();
    const { action, hostname, password } = body;

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });
    
    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    if (action === "change_hostname") {
        if (!hostname) return NextResponse.json({ error: "Hostname is required" }, { status: 400 });
        if (!HOSTNAME_REGEX.test(hostname) || hostname.length > 63) {
          return NextResponse.json({ error: "Invalid hostname. Use only letters, numbers, and hyphens (max 63 chars)." }, { status: 400 });
        }
        
        await proxmox.configVm(vps.node, vps.vmid, { name: hostname });
        
        // Update database
        await prisma.vpsService.update({
            where: { id: vps.id },
            data: { hostname }
        });
        
        return NextResponse.json({ message: "Hostname updated successfully. A reboot is required for changes to take effect fully." });
    }
    
    if (action === "change_password") {
        if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });
        if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
          return NextResponse.json({ error: "Password must contain both letters and numbers." }, { status: 400 });
        }
        
        await proxmox.configVm(vps.node, vps.vmid, { cipassword: password });
        
        // Store encrypted in database
        await prisma.vpsService.update({
            where: { id: vps.id },
            data: { rootPassword: encryptDeterministic(password) }
        });
        
        return NextResponse.json({ message: "Password updated successfully. Reboot the VPS for changes to apply via Cloud-Init." });
    }

    if (action === "change_ssh") {
        const { sshKey } = body;
        if (!sshKey) return NextResponse.json({ error: "SSH Key is required" }, { status: 400 });
        
        let sshKeys = sshKey.trim() + "\n";
        try {
          const systemKeyPath = require("path").join(process.cwd(), "storage", "ssh", "id_rsa.pub");
          if (require("fs").existsSync(systemKeyPath)) {
            const systemKey = require("fs").readFileSync(systemKeyPath, "utf-8").trim();
            sshKeys += systemKey + "\n";
          }
        } catch (err) { }

        await proxmox.configVm(vps.node, vps.vmid, { sshkeys: encodeURIComponent(sshKeys.trim()) });
        
        // Update database
        await prisma.vpsService.update({
            where: { id: vps.id },
            data: { sshKey: sshKey.trim() }
        });
        
        return NextResponse.json({ message: "SSH Key updated successfully. Reboot the VPS for changes to apply via Cloud-Init." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("VPS Settings Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
