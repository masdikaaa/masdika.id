import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import {
  sendVpsSuspendedGracePeriodEmail,
  sendAppSuspendedGracePeriodEmail,
  sendReactivatedEmail,
  sendAdminServiceSuspendedEmail,
  sendAdminServiceReactivatedEmail,
} from '@/lib/email';

export async function PUT(req: Request, props: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await props.params;
    const type = params.type.toLowerCase();
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();
    const { suspend, reason } = body;

    if (typeof suspend !== 'boolean') {
      return NextResponse.json({ error: 'suspend must be a boolean' }, { status: 400 });
    }

    const statusValue = suspend ? 'SUSPENDED' : 'ACTIVE';
    const suspendReasonValue = suspend ? (reason || 'Suspended by Administrator') : null;
    const gracePeriodDeadline = suspend ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null;
    let result = null;

    switch (type) {
      case 'subscriptions': {
        const sub = await prisma.subscription.findUnique({
          where: { id },
          include: { plan: true, user: true }
        });
        if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

        result = await prisma.subscription.update({
          where: { id },
          data: { status: statusValue, suspendReason: suspendReasonValue }
        });

        if (sub.user) {
          const isCdn = sub.plan?.service === 'CDN';
          const serviceType = isCdn ? 'File CDN' : `API Hub (${sub.plan?.service || 'API'})`;
          const serviceName = sub.plan ? `${sub.plan.name} (${sub.plan.service})` : serviceType;
          if (suspend) {
            const { sendPaygSuspendedEmail } = await import('@/lib/email');
            sendPaygSuspendedEmail(sub.user.email, sub.user.name || 'Customer', sub.plan?.name || 'Subscription', sub.plan?.service || 'Subscription').catch(console.error);
            sendAdminServiceSuspendedEmail(sub.user.name || 'Customer', sub.user.email, serviceName, serviceType).catch(console.error);
          } else {
            sendReactivatedEmail(sub.user.email, sub.user.name || 'Customer', sub.plan?.name || 'Subscription', serviceName).catch(console.error);
            sendAdminServiceReactivatedEmail(sub.user.name || 'Customer', sub.user.email, serviceName, serviceType).catch(console.error);
          }
        }
        break;
      }

      case 'apikeys': {
        const key = await prisma.apiKey.findUnique({
          where: { id },
          include: { user: true }
        });
        if (!key) return NextResponse.json({ error: 'API Key not found' }, { status: 404 });

        result = await prisma.apiKey.update({
          where: { id },
          data: { status: statusValue }
        });

        if (key.user) {
          const keyLabel = `API Key (${key.service || key.name || 'Global'})`;
          if (suspend) {
            sendAdminServiceSuspendedEmail(key.user.name || 'Customer', key.user.email, keyLabel, 'API Hub Key').catch(console.error);
          } else {
            sendReactivatedEmail(key.user.email, key.user.name || 'Customer', 'API Key', keyLabel).catch(console.error);
            sendAdminServiceReactivatedEmail(key.user.name || 'Customer', key.user.email, keyLabel, 'API Hub Key').catch(console.error);
          }
        }
        break;
      }

      case 'vps': {
        const vps = await prisma.vpsService.findUnique({
          where: { id },
          include: { user: true, vpc: true }
        });
        if (!vps) return NextResponse.json({ error: 'VPS not found' }, { status: 404 });

        if (vps.vmid) {
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
            status: suspend ? 'SUSPENDED' : 'RUNNING', 
            suspendReason: suspendReasonValue,
            terminationDate: gracePeriodDeadline
          }
        });

        if (vps.user) {
          if (suspend) {
            sendVpsSuspendedGracePeriodEmail({
              email: vps.user.email,
              userName: vps.user.name || 'Customer',
              vpsHostname: vps.hostname,
              terminationDate: gracePeriodDeadline!,
              hourlyRate: vps.hourlyRate,
              reason: suspendReasonValue || 'Administrative suspension',
              vpcName: vps.vpc?.name
            }).catch(console.error);
            sendAdminServiceSuspendedEmail(vps.user.name || 'Customer', vps.user.email, vps.hostname, 'Cloud VPS').catch(console.error);
          } else {
            sendReactivatedEmail(vps.user.email, vps.user.name || 'Customer', `${vps.cpuCores}C/${vps.ramGb}G`, vps.hostname).catch(console.error);
            sendAdminServiceReactivatedEmail(vps.user.name || 'Customer', vps.user.email, vps.hostname, 'Cloud VPS').catch(console.error);
          }
        }
        break;
      }

      case 'database': {
        const db = await prisma.databaseService.findUnique({
          where: { id },
          include: { user: true }
        });
        if (!db) return NextResponse.json({ error: 'Database service not found' }, { status: 404 });

        // Physical shutdown/startup on Kubernetes cluster
        try {
          const { stopDatabase, startDatabase } = await import('@/lib/k8s-database');
          if (suspend) {
            await stopDatabase(db.id, db.k8sNamespace || 'managed-db');
          } else {
            await startDatabase(db.id, db.k8sNamespace || 'managed-db');
          }
        } catch (k8sErr) {
          console.error(`Failed to update K8s deployment for database ${db.id}:`, k8sErr);
        }

        result = await prisma.databaseService.update({
          where: { id },
          data: {
            status: suspend ? 'SUSPENDED' : 'RUNNING',
            suspendReason: suspendReasonValue,
            terminationDate: gracePeriodDeadline
          }
        });

        if (db.user) {
          if (suspend) {
            sendAppSuspendedGracePeriodEmail({
              email: db.user.email,
              userName: db.user.name || 'Customer',
              appName: db.name,
              appType: `Database (${db.type})`,
              terminationDate: gracePeriodDeadline!,
              hourlyRate: db.hourlyRate,
              reason: suspendReasonValue || 'Administrative suspension'
            }).catch(console.error);
            sendAdminServiceSuspendedEmail(db.user.name || 'Customer', db.user.email, db.name, 'Managed Database').catch(console.error);
          } else {
            sendReactivatedEmail(db.user.email, db.user.name || 'Customer', db.planName, db.name).catch(console.error);
            sendAdminServiceReactivatedEmail(db.user.name || 'Customer', db.user.email, db.name, 'Managed Database').catch(console.error);
          }
        }
        break;
      }

      case 'apps':
      case 'app': {
        const app = await prisma.appService.findUnique({
          where: { id },
          include: { user: true }
        });
        if (!app) return NextResponse.json({ error: 'Managed application not found' }, { status: 404 });

        // Physical shutdown/startup on Kubernetes cluster
        try {
          const { stopAppService, startAppService } = await import('@/lib/k8s-app');
          if (suspend) {
            await stopAppService(app as any);
          } else {
            await startAppService(app as any);
          }
        } catch (k8sErr) {
          console.error(`Failed to update K8s deployment for app ${app.id}:`, k8sErr);
        }

        result = await prisma.appService.update({
          where: { id },
          data: {
            status: suspend ? 'SUSPENDED' : 'RUNNING',
            suspendReason: suspendReasonValue,
            terminationDate: gracePeriodDeadline
          }
        });

        if (app.user) {
          if (suspend) {
            sendAppSuspendedGracePeriodEmail({
              email: app.user.email,
              userName: app.user.name || 'Customer',
              appName: app.name,
              appType: `Managed App (${app.appType})`,
              terminationDate: gracePeriodDeadline!,
              hourlyRate: app.hourlyRate,
              reason: suspendReasonValue || 'Administrative suspension'
            }).catch(console.error);
            sendAdminServiceSuspendedEmail(app.user.name || 'Customer', app.user.email, app.name, 'Managed App').catch(console.error);
          } else {
            sendReactivatedEmail(app.user.email, app.user.name || 'Customer', app.planName, app.name).catch(console.error);
            sendAdminServiceReactivatedEmail(app.user.name || 'Customer', app.user.email, app.name, 'Managed App').catch(console.error);
          }
        }
        break;
      }

      case 'kubernetes': {
        const cluster = await prisma.kubernetesCluster.findUnique({
          where: { id },
          include: { nodes: true, user: true }
        });
        if (!cluster) return NextResponse.json({ error: 'Kubernetes cluster not found' }, { status: 404 });
        
        if (cluster.nodes.length > 0) {
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
            data: { 
              status: suspend ? 'SUSPENDED' : 'RUNNING', 
              suspendReason: suspendReasonValue,
              terminationDate: gracePeriodDeadline
            }
          });
        }
        
        result = await prisma.kubernetesCluster.update({
          where: { id },
          data: { 
            status: suspend ? 'SUSPENDED' : 'RUNNING',
          }
        });

        if (cluster.user) {
          if (suspend) {
            sendAdminServiceSuspendedEmail(cluster.user.name || 'Customer', cluster.user.email, cluster.name, 'Kubernetes Cluster').catch(console.error);
          } else {
            sendReactivatedEmail(cluster.user.email, cluster.user.name || 'Customer', cluster.version || 'Kubernetes', cluster.name).catch(console.error);
            sendAdminServiceReactivatedEmail(cluster.user.name || 'Customer', cluster.user.email, cluster.name, 'Kubernetes Cluster').catch(console.error);
          }
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown service type' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      data: result, 
      message: `Service ${suspend ? 'suspended' : 'unsuspended'} successfully` 
    });
  } catch (error: any) {
    console.error("Suspend Service Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
