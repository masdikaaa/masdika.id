import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { cleanupUserCloudflareResourcesIfNoActiveVps } from '@/lib/cloudflare-cleanup';
import { ProxmoxClient } from '@/lib/proxmox';
import { sendTerminationEmail } from '@/lib/email';

export async function DELETE(req: Request, props: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await props.params;
    const type = params.type.toLowerCase();
    const id = parseInt(params.id, 10);
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
        case 'apikeys': 
          result = await prisma.apiKey.delete({ where: { id } }); 
          break;
        case 'vps': {
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
          if (vpsHard && vpsHard.userId) {
            cleanupUserCloudflareResourcesIfNoActiveVps(vpsHard.userId).catch((err) => {
              console.error("[Auto-Cleanup] Failed to cleanup Cloudflare resources after admin VPS hard delete:", err);
            });
          }
          break;
        }
        case 'database': {
          const dbHard = await prisma.databaseService.findUnique({ where: { id } });
          if (dbHard) {
            try {
              const { deleteDatabase } = await import('@/lib/k8s-database');
              await deleteDatabase(id, dbHard.k8sNamespace || 'managed-db');
            } catch (k8sErr) {
              console.warn(`[K8s-Cleanup] Failed to delete database ${id} resources:`, k8sErr);
            }
          }
          result = await prisma.databaseService.delete({ where: { id } });
          break;
        }
        case 'apps':
        case 'app': {
          const appHard = await prisma.appService.findUnique({ where: { id } });
          if (appHard) {
            try {
              const { deleteAppService } = await import('@/lib/k8s-app');
              await deleteAppService(appHard as any);
            } catch (k8sErr) {
              console.warn(`[K8s-Cleanup] Failed to delete app ${id} resources:`, k8sErr);
            }
          }
          result = await prisma.appService.delete({ where: { id } });
          break;
        }
        case 'kubernetes': 
          await prisma.vpsService.deleteMany({ where: { kubernetesClusterId: id } });
          result = await prisma.kubernetesCluster.delete({ where: { id } }); 
          break;
        default: 
          return NextResponse.json({ error: 'Unknown service type' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Service deleted permanently' });
    }

    // Soft termination (stop & remove compute/pod resources, set TERMINATED status)
    switch (type) {
      case 'subscriptions': {
        const sub = await prisma.subscription.findUnique({
          where: { id },
          include: { plan: true, user: true }
        });
        result = await prisma.subscription.update({
          where: { id },
          data: { status: statusValue, terminationDate: new Date() }
        });
        if (sub?.user) {
          sendTerminationEmail(
            sub.user.email,
            sub.user.name || 'Customer',
            sub.plan?.name || 'Subscription',
            sub.plan?.service || 'Subscription'
          ).catch(console.error);
        }
        break;
      }
      case 'apikeys': {
        result = await prisma.apiKey.update({
          where: { id },
          data: { status: statusValue }
        });
        break;
      }
      case 'vps': {
        const vpsSoft = await prisma.vpsService.findUnique({ 
          where: { id },
          include: { user: true }
        });
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
        if (vpsSoft && vpsSoft.user) {
          sendTerminationEmail(
            vpsSoft.user.email,
            vpsSoft.user.name || 'Customer',
            `${vpsSoft.cpuCores}C/${vpsSoft.ramGb}G`,
            vpsSoft.hostname
          ).catch(console.error);
          cleanupUserCloudflareResourcesIfNoActiveVps(vpsSoft.userId).catch((err) => {
            console.error("[Auto-Cleanup] Failed to cleanup Cloudflare resources after admin VPS termination:", err);
          });
        }
        break;
      }
      case 'database': {
        const dbSoft = await prisma.databaseService.findUnique({
          where: { id },
          include: { user: true }
        });
        if (dbSoft) {
          try {
            const { deleteDatabase } = await import('@/lib/k8s-database');
            await deleteDatabase(id, dbSoft.k8sNamespace || 'managed-db');
          } catch (k8sErr) {
            console.warn(`[K8s-Cleanup] Failed to delete database ${id} resources:`, k8sErr);
          }
        }
        result = await prisma.databaseService.update({
          where: { id },
          data: { status: statusValue, terminationDate: new Date() }
        });
        if (dbSoft?.user) {
          sendTerminationEmail(
            dbSoft.user.email,
            dbSoft.user.name || 'Customer',
            dbSoft.planName,
            dbSoft.name
          ).catch(console.error);
        }
        break;
      }
      case 'apps':
      case 'app': {
        const appSoft = await prisma.appService.findUnique({
          where: { id },
          include: { user: true }
        });
        if (appSoft) {
          try {
            const { deleteAppService } = await import('@/lib/k8s-app');
            await deleteAppService(appSoft as any);
          } catch (k8sErr) {
            console.warn(`[K8s-Cleanup] Failed to delete app ${id} resources:`, k8sErr);
          }
        }
        result = await prisma.appService.update({
          where: { id },
          data: { status: statusValue, terminationDate: new Date() }
        });
        if (appSoft?.user) {
          sendTerminationEmail(
            appSoft.user.email,
            appSoft.user.name || 'Customer',
            appSoft.planName,
            appSoft.name
          ).catch(console.error);
        }
        break;
      }
      case 'kubernetes': {
        const cluster = await prisma.kubernetesCluster.findUnique({ 
          where: { id }, 
          include: { nodes: true, user: true } 
        });
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
          if (cluster.user) {
            sendTerminationEmail(
              cluster.user.email,
              cluster.user.name || 'Customer',
              cluster.version || 'Kubernetes',
              cluster.name
            ).catch(console.error);
          }
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown service type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Service terminated successfully', data: result });
  } catch (error: any) {
    console.error('Service termination error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
