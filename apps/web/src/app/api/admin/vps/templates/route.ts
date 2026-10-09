import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const templates = await prisma.vpsTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("GET templates error:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const server = await prisma.proxmoxServer.findFirst();
    if (!server || !server.host || !server.tokenId || !server.tokenSecret) {
      return NextResponse.json({ error: "Proxmox Server is not configured properly." }, { status: 400 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    // Fetch nodes dynamically instead of hardcoding "proxmox"
    const nodes = await proxmox.getNodes();
    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ error: "No nodes found on Proxmox server" }, { status: 404 });
    }
    const targetNode = nodes[0].node;
    
    // Fetch all VMs from the target node
    const vms = await proxmox.getVms(targetNode);
    
    // Filter out only templates (template === 1)
    const templatesFromProxmox = vms.filter((vm: any) => vm.template === 1);
    const syncedVmids = templatesFromProxmox.map((tpl: any) => tpl.vmid);
    
    // Upsert to database
    for (const tpl of templatesFromProxmox) {
      const existing = await prisma.vpsTemplate.findUnique({ where: { vmid: tpl.vmid } });
      
      await prisma.vpsTemplate.upsert({
        where: { vmid: tpl.vmid },
        update: {
          name: tpl.name,
        },
        create: {
          vmid: tpl.vmid,
          name: tpl.name,
          osType: "l26", // Defaulting to Linux for now, can be updated manually
          isActive: true,
        },
      });

      // Cascade update to VpsService if the template name changed
      if (existing && existing.name !== tpl.name) {
        await prisma.vpsService.updateMany({
          where: { osTemplate: existing.name },
          data: { osTemplate: tpl.name }
        });
      }
    }

    // Delete templates that are no longer on Proxmox
    if (syncedVmids.length > 0) {
      await prisma.vpsTemplate.deleteMany({
        where: { vmid: { notIn: syncedVmids } }
      });
    } else {
      // If 0 templates from Proxmox, delete all in DB
      await prisma.vpsTemplate.deleteMany();
    }
    
    // Fetch fresh list from DB to return
    const allTemplates = await prisma.vpsTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ 
      success: true, 
      count: allTemplates.length,
      templates: allTemplates
    });
  } catch (error: any) {
    console.error("Sync templates error:", error);
    return NextResponse.json({ error: error.message || "Failed to sync templates" }, { status: 500 });
  }
}
