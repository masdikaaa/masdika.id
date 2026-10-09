import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, snapname: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id, snapname } = await params;
    
    if (!snapname) {
        return NextResponse.json({ error: "Snapshot name required" }, { status: 400 });
    }

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

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const result = await proxmox.deleteVMSnapshot(vps.node, vps.vmid, snapname);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE VPS snapshot error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete snapshot" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string, snapname: string }> }) {
    // This will be for rollback action
    try {
      const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
      if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      const userId = auth.userId!;
      const user = auth.user!;
  
      const { id, snapname } = await params;
      
      if (!snapname) {
          return NextResponse.json({ error: "Snapshot name required" }, { status: 400 });
      }
  
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
  
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });
  
      const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
      const result = await proxmox.rollbackVMSnapshot(vps.node, vps.vmid, snapname);
  
      return NextResponse.json(result);
    } catch (error: any) {
      console.error("POST VPS snapshot rollback error:", error);
      return NextResponse.json({ error: error?.message || "Failed to rollback snapshot" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, snapname: string }> }) {
    try {
      const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
      if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
      const userId = auth.userId!;
      const user = auth.user!;
  
      const { id, snapname } = await params;
      const body = await req.json();
      
      if (!snapname) {
          return NextResponse.json({ error: "Snapshot name required" }, { status: 400 });
      }
  
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
  
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });
  
      const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
      const result = await proxmox.updateVMSnapshot(vps.node, vps.vmid, snapname, body.description || "");
  
      return NextResponse.json(result);
    } catch (error: any) {
      console.error("PUT VPS snapshot error:", error);
      return NextResponse.json({ error: error?.message || "Failed to update snapshot" }, { status: 500 });
    }
}
