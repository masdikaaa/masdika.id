import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';


export async function PUT(req: Request, props: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await props.params;
    const type = params.type;
    const id = parseInt(params.id);
    
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();
    const { suspend, reason } = body;

    if (typeof suspend !== 'boolean') {
      return NextResponse.json({ error: 'suspend must be a boolean' }, { status: 400 });
    }

    const statusValue = suspend ? 'SUSPENDED' : 'ACTIVE';
    const suspendReasonValue = suspend ? (reason || 'Suspended by Administrator') : null;
    let result = null;

    switch (type) {
      case 'subscriptions':
        result = await prisma.subscription.update({
          where: { id },
          data: { status: statusValue, suspendReason: suspendReasonValue }
        });
        break;

      case 'shortlinks':
        result = await prisma.shortLink.update({
          where: { id },
          data: { status: statusValue }
        });
        break;
      case 'apikeys':
        result = await prisma.apiKey.update({
          where: { id },
          data: { status: statusValue }
        });
        break;
      case 'vps': {
        const vps = await prisma.vpsService.findUnique({ where: { id } });
        if (vps && vps.vmid) {
          const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
          if (server) {
            const { ProxmoxClient } = await import('@/lib/proxmox');
            const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
            if (suspend) {
              await proxmox.stopVm(vps.node, vps.vmid!).catch(console.error);
            } else {
              await proxmox.startVm(vps.node, vps.vmid!).catch(console.error);
            }
          }
        }
        result = await prisma.vpsService.update({
          where: { id },
          data: { 
            status: statusValue === 'ACTIVE' ? 'RUNNING' : statusValue, 
            suspendReason: suspendReasonValue 
          }
        });
        break;
      }
      case 'kubernetes': {
        const cluster = await prisma.kubernetesCluster.findUnique({
          where: { id },
          include: { nodes: true }
        });
        
        if (cluster && cluster.nodes.length > 0) {
          const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
          if (server) {
            const { ProxmoxClient } = await import('@/lib/proxmox');
            const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
            for (const node of cluster.nodes) {
              if (node.vmid) {
                if (suspend) {
                  await proxmox.stopVm(node.node, node.vmid).catch(console.error);
                } else {
                  await proxmox.startVm(node.node, node.vmid).catch(console.error);
                }
              }
            }
          }
          
          await prisma.vpsService.updateMany({
            where: { kubernetesClusterId: id },
            data: { status: statusValue === 'ACTIVE' ? 'RUNNING' : statusValue, suspendReason: suspendReasonValue }
          });
        }
        
        result = await prisma.kubernetesCluster.update({
          where: { id },
          data: { 
            status: statusValue === 'ACTIVE' ? 'RUNNING' : statusValue,
          }
        });
        break;
      }
      case 'custom-services': {
        result = await prisma.customService.update({
          where: { id },
          data: { status: statusValue === 'ACTIVE' ? 'ACTIVE' : statusValue }
        });
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown service type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result, message: `Service ${statusValue.toLowerCase()}` });
  } catch (error: any) {
    console.error("Suspend Service Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
