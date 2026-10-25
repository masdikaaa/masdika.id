import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCallbackSignature } from '@/lib/duitku';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';
import { 
  sendCustomerPaymentSuccessEmail, 
  sendAdminNewOrderEmail, 
  sendReactivatedEmail,
  sendAdminServiceReactivatedEmail
} from '@/lib/email';


export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    
    // Duitku sends data either as x-www-form-urlencoded or json. Usually x-www-form-urlencoded
    const isUrlEncoded = req.headers.get('content-type')?.includes('application/x-www-form-urlencoded');
    
    let data: any;
    if (isUrlEncoded) {
      const params = new URLSearchParams(body);
      data = Object.fromEntries(params.entries());
    } else {
      data = JSON.parse(body);
    }

    const {
      merchantCode,
      amount,
      merchantOrderId,
      signature,
      reference,
      resultCode
    } = data;

    // Strict Type Checking to prevent Prisma injection and unexpected behavior
    if (
      !merchantCode || typeof merchantCode !== 'string' ||
      !amount || (typeof amount !== 'string' && typeof amount !== 'number') ||
      !merchantOrderId || typeof merchantOrderId !== 'string' ||
      !signature || typeof signature !== 'string'
    ) {
      return NextResponse.json({ error: 'Bad Request: Invalid parameter types' }, { status: 400 });
    }

    const isValid = validateCallbackSignature(amount, merchantOrderId, signature);
    if (!isValid) {
      console.error('Invalid Duitku Callback Signature');
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { merchantOrderId },
      include: { subscription: { include: { plan: true } }, user: true }
    });

    if (!invoice) {
      console.error('Invoice not found:', merchantOrderId);
      return NextResponse.json({ error: 'Invoice Not Found' }, { status: 404 });
    }
    
    // SECURITY: Strictly verify that the paid amount from gateway matches the generated invoice amount!
    // This prevents partial payment exploits where a user tricks the gateway into accepting less,
    // but gets full balance/services activated.
    if (Number(amount) !== invoice.amount) {
      console.error(`[SECURITY] Amount mismatch for ${merchantOrderId}: Expected ${invoice.amount}, got ${amount}`);
      return NextResponse.json({ error: 'Amount Mismatch' }, { status: 400 });
    }

    // resultCode "00" means Success in Duitku
    if (resultCode === '00') {
      // SECURITY: Atomic Update to prevent High-Concurrency Race Conditions.
      // We use updateMany with 'status: PENDING' so the database itself guarantees
      // that only ONE thread can ever successfully change the status to PAID.
      const updatedInvoice = await prisma.invoice.updateMany({
        where: { id: invoice.id, status: { not: 'PAID' } },
        data: {
          status: 'PAID',
          reference,
          paidAt: new Date()
        }
      });

      if (updatedInvoice.count === 0) {
        // Another thread already processed this invoice
        return NextResponse.json({ success: true, message: 'Invoice already processed concurrently' });
      }

      // Decrypt user info for emails
      let customerName = 'Customer';
      let customerEmail = '';
      try {
        customerName = invoice.user?.name ? decryptDeterministic(invoice.user.name) : 'Customer';
        customerEmail = invoice.user?.email ? decryptDeterministic(invoice.user.email) : '';
      } catch { /* fallback */ }

      if (invoice.type === 'TOP_UP') {
        let fee = 0;
        if (invoice.paymentMethod) {
          const pm = await prisma.paymentMethod.findFirst({ where: { name: invoice.paymentMethod } });
          if (pm) fee = pm.fee;
        }
        const netAmount = invoice.subtotal > 0 ? invoice.subtotal : Math.max(0, invoice.amount - fee);
        
        await prisma.user.update({
          where: { id: invoice.userId },
          data: { balance: { increment: netAmount } }
        });



        // Auto-Resume Suspended Services (VPS, CDN, File Storage, etc.) with Auto-Renew enabled
        try {
          const { attemptAutoUnsuspendAllForUser } = await import('@/lib/auto-unsuspend');
          await attemptAutoUnsuspendAllForUser(invoice.userId);
        } catch (resumeErr) {
          console.error('Failed to auto-resume services after topup:', resumeErr);
        }

        // Send emails for top-up (fire-and-forget)
        sendCustomerPaymentSuccessEmail({
          toEmail: customerEmail,
          customerName,
          type: 'TOP_UP',
          amount: invoice.amount,
          invoiceNumber: invoice.invoiceNumber,
        }).catch(e => console.error('Email error:', e));

        sendAdminNewOrderEmail({
          customerName,
          customerEmail,
          type: 'TOP_UP',
          amount: invoice.amount,
          paymentMethod: invoice.paymentMethod || 'Unknown',
          invoiceNumber: invoice.invoiceNumber,
        }).catch(e => console.error('Email error:', e));

      } else if (invoice.type === 'SUBSCRIPTION') {
        // Update Subscription to ACTIVE
        if (invoice.subscriptionId) {
          const updatedSub = await prisma.subscription.update({
            where: { id: invoice.subscriptionId },
            data: {
              status: 'ACTIVE'
            },
            include: { plan: true }
          });

          // Handle Explicit Upgrades
          if (invoice.reference && invoice.reference.startsWith('UPGRADE:')) {
            const upgradeSubId = parseInt(invoice.reference.split(':')[1]);
            if (!isNaN(upgradeSubId)) {
              await prisma.subscription.updateMany({
                where: {
                  id: upgradeSubId,
                  userId: invoice.userId
                },
                data: { status: 'UPGRADED' }
              });
              await prisma.vpsService.updateMany({
                where: { subscriptionId: upgradeSubId },
                data: { subscriptionId: invoice.subscriptionId }
              });
            }
          }



          // Send customer payment success + service activation email
          sendCustomerPaymentSuccessEmail({
            toEmail: customerEmail,
            customerName,
            type: 'SUBSCRIPTION',
            planName: updatedSub.plan.name,
            serviceName: updatedSub.plan.service,
            amount: invoice.amount,
            invoiceNumber: invoice.invoiceNumber,
            expiresAt: updatedSub.expiresAt,
          }).catch(e => console.error('Email error:', e));

          // Send admin new order notification email
          sendAdminNewOrderEmail({
            customerName,
            customerEmail,
            type: 'SUBSCRIPTION',
            planName: updatedSub.plan.name,
            serviceName: updatedSub.plan.service,
            amount: invoice.amount,
            paymentMethod: invoice.paymentMethod || 'Unknown',
            invoiceNumber: invoice.invoiceNumber,
          }).catch(e => console.error('Email error:', e));
        }
      } else if (invoice.type === 'VPS') {
        if (invoice.vpsServiceId) {
          const vps = await prisma.vpsService.findUnique({ where: { id: invoice.vpsServiceId } });
          
          if (vps && vps.vmid) {
             // IT IS A RENEWAL
             const now = new Date();
             const newExpires = new Date(vps.expiresAt || now);
             if (newExpires < now) {
                newExpires.setTime(now.getTime());
             }
             newExpires.setMonth(newExpires.getMonth() + 1);

             let newStatus = vps.status;
             if (vps.status === 'SUSPENDED') newStatus = 'STOPPED';

             await prisma.vpsService.update({
                where: { id: vps.id },
                data: { expiresAt: newExpires, status: newStatus, suspendReason: null }
             });

             // Auto-start if it was suspended
             if (vps.status === 'SUSPENDED') {
                 const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
                 if (server) {
                    import('@/lib/proxmox').then(async ({ ProxmoxClient }) => {
                       const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
                       await proxmox.startVm(vps.node, vps.vmid!).catch(console.error);
                       await prisma.vpsService.update({ where: { id: vps.id }, data: { status: 'RUNNING' }});
                       sendReactivatedEmail(customerEmail, customerName, "VPS Server", "VPS").catch(console.error);
                       sendAdminServiceReactivatedEmail(customerName, customerEmail, "VPS Server", "VPS").catch(console.error);
                    });
                 }
             }
          } else {
             // IT IS A NEW VPS ORDER
             let cycle = 1;
             try {
                if (invoice.details) {
                   const parsed = JSON.parse(invoice.details);
                   if (parsed.billingCycle) {
                     cycle = Math.max(1, Math.floor(Number(parsed.billingCycle) || 1));
                   }
                }
             } catch (e) {}

             const newExpires = new Date();
             newExpires.setMonth(newExpires.getMonth() + cycle);

             await prisma.vpsService.update({
               where: { id: invoice.vpsServiceId },
               data: { 
                 status: 'PENDING',
                 expiresAt: newExpires 
               }
             });
             
               import('@/lib/vps-provisioning').then(({ VpsProvisioningService }) => {
                 VpsProvisioningService.provisionVps(invoice.vpsServiceId!)
                   .catch(err => console.error(`VPS Provisioning failed for VPS ID ${invoice.vpsServiceId}:`, err));
               });
               
               // Affiliate Commission Logic (Anti-Fraud: First VPS Purchase only)
               if (invoice.user?.referredById) {
                 try {
                   const referrerId = invoice.user.referredById;
                   const existingEarning = await prisma.affiliateEarning.findUnique({
                     where: { referredId: invoice.userId }
                   });
                   
                   if (!existingEarning) {
                     await prisma.$transaction([
                       prisma.affiliateEarning.create({
                         data: {
                           referrerId,
                           referredId: invoice.userId,
                           amount: 5000,
                           description: `Commission from VPS purchase by ${customerName}`
                         }
                       }),
                       prisma.user.update({
                         where: { id: referrerId },
                         data: { affiliateBalance: { increment: 5000 } }
                       })
                     ]);
                   }
                 } catch (e) {
                   console.error("Affiliate Commission error:", e);
                 }
               }
            }
          
          sendCustomerPaymentSuccessEmail({
            toEmail: customerEmail,
            customerName,
            type: 'SUBSCRIPTION',
            planName: 'VPS Server',
            serviceName: 'VPS',
            amount: invoice.amount,
            invoiceNumber: invoice.invoiceNumber,
          }).catch(e => console.error('Email error:', e));

          sendAdminNewOrderEmail({
            customerName,
            customerEmail,
            type: 'SUBSCRIPTION',
            planName: 'VPS Server',
            serviceName: 'VPS',
            amount: invoice.amount,
            paymentMethod: invoice.paymentMethod || 'Unknown',
            invoiceNumber: invoice.invoiceNumber,
          }).catch(e => console.error('Email error:', e));
        }
      } else if (invoice.type === 'VPS_UPGRADE') {
        if (invoice.vpsServiceId && invoice.details) {
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
                if ((details.addIpv4Count > 0 || details.addIpv6Count > 0) && vps.vmid) {
                  const { VpsProvisioningService } = await import('@/lib/vps-provisioning');
                  const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
                  
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
                    hourlyRate: details.newHourlyRate
                  }
                });
              } catch (err) {
                console.error(`Failed to process VPS upgrade callback for invoice ${invoice.invoiceNumber}:`, err);
              }
            });

            // Send Emails
            sendCustomerPaymentSuccessEmail({
              toEmail: customerEmail,
              customerName,
              type: 'SUBSCRIPTION',
              planName: 'VPS Server Upgrade',
              serviceName: 'VPS',
              amount: invoice.amount,
              invoiceNumber: invoice.invoiceNumber,
            }).catch(e => console.error('Email error:', e));

            sendAdminNewOrderEmail({
              customerName,
              customerEmail,
              type: 'SUBSCRIPTION',
              planName: 'VPS Server Upgrade',
              serviceName: 'VPS',
              amount: invoice.amount,
              paymentMethod: invoice.paymentMethod || 'Unknown',
              invoiceNumber: invoice.invoiceNumber,
            }).catch(e => console.error('Email error:', e));
          }
        }
      }


      // Create admin notification Message (shows in bell icon)
      try {
        const amountStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoice.amount);
        const notifSubject = invoice.type === 'TOP_UP'
          ? `💰 Top Up: ${customerName} - ${amountStr}`
          : `🛒 Order Paid: ${customerName} - ${invoice.subscription?.plan?.name || 'Plan'} (${amountStr})`;
        const notifContent = invoice.type === 'TOP_UP'
          ? `${customerName} (${customerEmail}) has completed a balance top-up of ${amountStr} via ${invoice.paymentMethod || 'Unknown'}.`
          : `${customerName} (${customerEmail}) has paid for ${invoice.subscription?.plan?.name || 'Plan'} (${invoice.subscription?.plan?.service?.replace('_', ' ') || 'Service'}) - ${amountStr} via ${invoice.paymentMethod || 'Unknown'}.`;

        // Get admin email dynamically from DB ONLY, no hardcoded fallbacks
        const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!adminUser || !adminUser.email) {
          throw new Error('System could not find the admin email in the database');
        }
        const adminEmailVal = decryptDeterministic(adminUser.email);

        await prisma.message.create({
          data: {
            name: encryptDeterministic('System Notification'),
            email: encryptDeterministic(adminEmailVal),
            subject: encryptDeterministic(notifSubject),
            content: encryptDeterministic(`${notifContent}\n\n- Automatically generated notification`),
            isRead: false,
          }
        });
      } catch (notifErr) {
        console.error('Failed to create admin notification:', notifErr);
      }
    } else {
      // Failed or Canceled
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'FAILED',
          reference
        }
      });
      
      if (invoice.subscriptionId) {
        await prisma.subscription.update({
          where: { id: invoice.subscriptionId },
          data: {
            status: 'CANCELED'
          }
        });
      }

      if (invoice.details) {
        try {
          const details = JSON.parse(invoice.details);
          if (details.voucherCode) {
            await prisma.voucher.update({
              where: { code: details.voucherCode },
              data: { currentUses: { decrement: 1 } }
            }).catch(e => console.error("Failed to decrement voucher", e));
          }
        } catch (e) {
          console.error("Failed to parse invoice details for voucher decrement", e);
        }
      }
    }

    // Duitku expects HTTP 200 OK
    return NextResponse.json({ status: 'OK' });
  } catch (error) {
    console.error('Duitku Callback Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
