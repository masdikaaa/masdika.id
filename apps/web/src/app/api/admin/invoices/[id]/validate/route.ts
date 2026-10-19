import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { subscription: { include: { plan: true } }, vpsService: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // SECURITY: Use atomic updateMany to prevent Race Condition with incoming Webhooks
    const updatedInvoice = await prisma.invoice.updateMany({
      where: { id, status: { not: 'PAID' } },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        reference: 'MANUAL_VALIDATION'
      }
    });

    if (updatedInvoice.count === 0) {
      return NextResponse.json({ error: 'Invoice already paid or processed concurrently' }, { status: 400 });
    }

    if (invoice.type === 'TOP_UP') {
      let fee = 0;
      if (invoice.paymentMethod) {
        const pm = await prisma.paymentMethod.findFirst({ where: { name: invoice.paymentMethod } });
        if (pm) fee = pm.fee;
      }
      const netAmount = Math.max(0, invoice.amount - fee);
      
      await prisma.user.update({
        where: { id: invoice.userId },
        data: { balance: { increment: netAmount } }
      });
    } else if (invoice.subscriptionId && invoice.subscription) {
      await prisma.subscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: 'ACTIVE' }
      });

      // Cancel previous active subscriptions for the same service
      await prisma.subscription.updateMany({
        where: {
          userId: invoice.userId,
          status: 'ACTIVE',
          id: { not: invoice.subscriptionId },
          plan: { service: invoice.subscription.plan.service }
        },
        data: { status: 'UPGRADED' }
      });
    } else if (invoice.type === 'VPS' && invoice.vpsServiceId && invoice.vpsService) {
      const vps = invoice.vpsService;
      const now = new Date();
      
      if (vps.status === 'PENDING_PAYMENT') {
        const newExpires = new Date();
        newExpires.setMonth(newExpires.getMonth() + 1);

        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { 
            status: 'PENDING',
            expiresAt: newExpires 
          }
        });
        
        import('@/lib/vps-provisioning').then(({ VpsProvisioningService }) => {
          VpsProvisioningService.provisionVps(vps.id)
            .catch(err => console.error(`VPS Provisioning failed for VPS ID ${vps.id}:`, err));
        });
      } else {
        // Renewal
        const newExpires = new Date(vps.expiresAt || now);
        if (newExpires < now) {
          newExpires.setTime(now.getTime());
        }
        newExpires.setMonth(newExpires.getMonth() + 1);

        const updateData: any = { expiresAt: newExpires };
        
        if (vps.status === 'SUSPENDED') {
          updateData.status = 'STOPPED';
          updateData.suspendReason = null;
        }
        
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: updateData
        });

        // Automatically start VM if it was suspended
        if (vps.status === 'SUSPENDED') {
          const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
          if (server && vps.vmid) {
            import('@/lib/proxmox').then(async ({ ProxmoxClient }) => {
              const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
              await proxmox.startVm(vps.node, vps.vmid!).catch(console.error);
              
              await prisma.vpsService.update({
                where: { id: vps.id },
                data: { status: 'RUNNING' }
              });
            });
          }
        }
      }
    } else if (invoice.type === 'VPS_UPGRADE' && invoice.vpsServiceId && invoice.details) {
        const details = JSON.parse(invoice.details);
        const vps = await prisma.vpsService.findUnique({ where: { id: invoice.vpsServiceId } });
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });

        if (vps && server) {
          import('@/lib/proxmox').then(async ({ ProxmoxClient }) => {
            try {
              const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
              
              // Upgrade CPU and RAM if changed
              if ((details.newCpu > vps.cpuCores || details.newRam > vps.ramGb) && vps.vmid) {
                await proxmox.configVm(vps.node, vps.vmid, {
                  cores: details.newCpu,
                  memory: details.newRam * 1024,
                });
              }
          
              // Expand Disk if changed
              if (details.newDisk > vps.diskGb && vps.vmid) {
                try {
                  const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
                  let targetDisk = "scsi0";
                  for (const key of Object.keys(vmConfig)) {
                      if (/^(scsi|virtio|sata|ide)\d+$/.test(key)) {
                          if (vmConfig[key] && !vmConfig[key].includes("media=cdrom") && !vmConfig[key].includes("cloudinit")) {
                              targetDisk = key;
                              break;
                          }
                      }
                  }
                  await proxmox.resizeVmDisk(vps.node, vps.vmid, targetDisk, `${details.newDisk}G`);
                } catch (resizeErr) {
                  console.error(`Auto disk resize failed for VMID ${vps.vmid}:`, resizeErr);
                }
              }
              
              // Network Upgrades (Add IPs)
              let networkConfigUpdate: any = {};
              if (details.addIpv4Count > 0 || details.addIpv6Count > 0) {
                const { VpsProvisioningService } = await import('@/lib/vps-provisioning');
                const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid!);
                
                let nextNetIndex = 0;
                for (let i = 0; i < 10; i++) {
                   if (vmConfig[`net${i}`] !== undefined) {
                       nextNetIndex = i + 1;
                   }
                }

                const provisionIps = async (count: number, ipVersion: number) => {
                   if (!count) return;
                   const pool = await prisma.ipPool.findFirst({ where: { version: ipVersion, type: 'PUBLIC' } });
                   if (!pool) return;

                   for (let i = 0; i < count; i++) {
                      try {
                         const ipAddress = await VpsProvisioningService.allocateIp(pool.id);
                         await prisma.vpsIpAssignment.create({
                           data: { vpsId: vps.id, ipPoolId: pool.id, ipAddress: ipAddress, isPrimary: false }
                         });

                         const cidrSuffix = pool.network.split('/')[1] || (ipVersion === 4 ? '24' : '64');
                         const ipKey = ipVersion === 4 ? 'ip' : 'ip6';
                         const gwKey = ipVersion === 4 ? 'gw' : 'gw6';
                         
                         const bridgeToUse = pool.type === 'PUBLIC' && server.publicNetworkBridge
                           ? server.publicNetworkBridge
                           : vps.networkBridge;

                         networkConfigUpdate[`net${nextNetIndex}`] = `virtio,bridge=${bridgeToUse},firewall=1`;
                         networkConfigUpdate[`ipconfig${nextNetIndex}`] = `${ipKey}=${ipAddress}/${cidrSuffix},${gwKey}=${pool.gateway}`;
                         
                         nextNetIndex++;
                      } catch (e) {
                         console.error(`Failed to provision IP version ${ipVersion} for VPS ${vps.id}`, e);
                      }
                   }
                };

                await provisionIps(details.addIpv4Count, 4);
                await provisionIps(details.addIpv6Count, 6);
                
                if (Object.keys(networkConfigUpdate).length > 0) {
                    await proxmox.configVm(vps.node, vps.vmid!, networkConfigUpdate);
                }
              }

              // Update Database
              await prisma.vpsService.update({
                where: { id: vps.id },
                data: {
                  cpuCores: details.newCpu,
                  ramGb: details.newRam,
                  diskGb: details.newDisk,
                  backupGb: details.newBackup !== undefined ? details.newBackup : vps.backupGb,
                  hourlyRate: details.newHourlyRate
                }
              });
            } catch (err) {
              console.error(`Failed to process VPS upgrade callback for invoice ${invoice.invoiceNumber}:`, err);
            }
          });
        }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
