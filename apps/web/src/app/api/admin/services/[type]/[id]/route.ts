import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

import { ProxmoxClient } from '@/lib/proxmox';

export async function DELETE(req: Request, props: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await props.params;
    const type = params.type;
    const id = parseInt(params.id);
    const { searchParams } = new URL(req.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';
    
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const statusValue = 'TERMINATED';
    let result = null;

    if (hardDelete) {
      switch (type) {
        case 'subscriptions': 
          result = await prisma.subscription.delete({ where: { id } }); 
          break;
        case 'shortlinks': result = await prisma.shortLink.delete({ where: { id } }); break;
        case 'apikeys': result = await prisma.apiKey.delete({ where: { id } }); break;
        case 'vps': 
          const vpsHard = await prisma.vpsService.findUnique({ where: { id } });
          if (vpsHard && vpsHard.vmid) {
            const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
            if (server) {
              const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
              try {
                await proxmox.stopVm(vpsHard.node, vpsHard.vmid);
                await proxmox.deleteVm(vpsHard.node, vpsHard.vmid);
              } catch (e: any) {
                if (e && !String(e.message).includes("does not exist")) {
                  throw new Error(`Failed to delete VMID ${vpsHard.vmid} from Proxmox: ${e.message}`);
                }
              }
            }
          }
          await prisma.vpsIpAssignment.deleteMany({ where: { vpsId: id } });
          result = await prisma.vpsService.delete({ where: { id } }); 
          break;
        case 'kubernetes': 
          await prisma.vpsService.deleteMany({ where: { kubernetesClusterId: id } });
          result = await prisma.kubernetesCluster.delete({ where: { id } }); 
          break;
        default: return NextResponse.json({ error: 'Unknown service type' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Service deleted permanently' });
    }

    switch (type) {
        case 'subscriptions':
        result = await prisma.subscription.update({
          where: { id },
          data: { status: statusValue, terminationDate: new Date() }
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
        const vpsSoft = await prisma.vpsService.findUnique({ where: { id } });
        if (vpsSoft && vpsSoft.vmid) {
          const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
          if (server) {
            const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
            try {
              await proxmox.stopVm(vpsSoft.node, vpsSoft.vmid);
              await proxmox.deleteVm(vpsSoft.node, vpsSoft.vmid);
            } catch (e: any) {
              if (e && !String(e.message).includes("does not exist")) {
                throw new Error(`Failed to delete VMID ${vpsSoft.vmid} from Proxmox: ${e.message}`);
              }
            }
          }
        }
        await prisma.vpsIpAssignment.deleteMany({ where: { vpsId: id } });
        await prisma.reservedIp.updateMany({ where: { vpsId: id }, data: { isAttached: false, vpsId: null } });
        result = await prisma.vpsService.update({
          where: { id },
          data: { status: statusValue, vmid: null, vpcIp: null, vpcId: null, terminationDate: new Date() }
        });
        break;
      }
      case 'kubernetes': {
        const cluster = await prisma.kubernetesCluster.findUnique({ where: { id }, include: { nodes: true } });
        if (cluster) {
          const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
          if (server) {
            const { ProxmoxClient } = await import('@/lib/proxmox');
            const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
            for (const node of cluster.nodes) {
              if (node.vmid) {
                try {
                  await proxmox.stopVm(node.node, node.vmid);
                  await proxmox.deleteVm(node.node, node.vmid);
                } catch (err) {
                  console.error(`Failed to delete k8s VM ${node.vmid}:`, err);
                }
              }
            }
          }
          await prisma.vpsService.updateMany({
            where: { kubernetesClusterId: id },
            data: { status: statusValue, vmid: null, vpcId: null, vpcIp: null }
          });
          const nodesWithVpc = cluster.nodes.filter(n => n.vpcId);
          if (nodesWithVpc.length > 0) {
            const vpcIds = [...new Set(nodesWithVpc.map(n => n.vpcId!))];
            for (const vId of vpcIds) {
              await prisma.vpcNetwork.update({
                where: { id: vId },
                data: { lastUsedAt: new Date() }
              });
            }
          }
          result = await prisma.kubernetesCluster.update({
            where: { id },
            data: { status: statusValue }
          });
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown service type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Service terminated successfully', data: result });
  } catch (error: any) {
    console.error('Service termination error:', error);
    return NextResponse.json({ error: error.message || 'Failed to terminate service' }, { status: 500 });
  }
}
