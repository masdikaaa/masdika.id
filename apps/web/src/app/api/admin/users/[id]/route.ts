import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

import { decryptDeterministic } from '@/lib/encryption';
import path from 'path';
import { unlink } from 'fs/promises';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = parseInt(params.id);

    // Self-healing: Check if user has suspended services with sufficient balance or active PAYG VPS missing current cycle running invoice
    try {
      const { attemptAutoUnsuspendAllForUser } = await import('@/lib/auto-unsuspend');
      await attemptAutoUnsuspendAllForUser(userId);

      // Verify active PAYG VPS have an active running invoice for current billing cycle
      const vpsList = await prisma.vpsService.findMany({
        where: {
          userId,
          status: { in: ['RUNNING', 'STOPPED'] },
          hourlyRate: { gt: 0 }
        },
        include: {
          invoices: {
            where: { reference: 'PAYG_RUNNING', type: 'VPS' },
            take: 1
          }
        }
      });

      for (const vps of vpsList) {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const runningInvoice = vps.invoices[0];

        // Need new invoice if no running invoice exists, or existing running invoice is from a previous month
        const needsNewCycleInvoice = !runningInvoice || (new Date(runningInvoice.createdAt) < currentMonthStart);

        if (needsNewCycleInvoice) {
          if (runningInvoice) {
            await prisma.invoice.update({
              where: { id: runningInvoice.id },
              data: { reference: 'PAYG_COMPLETED' }
            });
          }

          // Ensure expiresAt is renewed into the future
          const newExpires = new Date(vps.expiresAt || now);
          if (newExpires < now) {
            newExpires.setMonth(newExpires.getMonth() + 1);
            if (newExpires < now) newExpires.setTime(now.getTime() + 30 * 24 * 3600 * 1000);
          }

          await prisma.vpsService.update({
            where: { id: vps.id },
            data: {
              expiresAt: newExpires,
              accumulatedCost: 0,
              autoRenew: true
            }
          });

          const timestamp = Date.now().toString();
          const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const invoiceNumber = `INV-${timestamp}-${random}-VPS-PAYG`;
          await prisma.invoice.create({
            data: {
              invoiceNumber,
              userId,
              vpsServiceId: vps.id,
              amount: vps.isReseller ? (vps.hourlyRate || 0) * 730 : (vps.accumulatedCost || 0),
              status: 'PAID',
              paymentMethod: 'Account Balance',
              merchantOrderId: invoiceNumber,
              type: 'VPS',
              paidAt: new Date(),
              reference: 'PAYG_RUNNING',
              details: JSON.stringify({ type: 'PAYG_MONTHLY_CYCLE', cycle: 'October 2026', hostname: vps.hostname, isReseller: vps.isReseller })
            }
          });
        }
      }
    } catch (healErr) {
      console.warn("Self-healing check on user profile failed:", healErr);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        invoices: { orderBy: { createdAt: 'desc' } },
        subscriptions: { include: { plan: true } },

        apiKeys: true,
        shortLinks: true,
        vpsServices: { where: { kubernetesClusterId: null }, include: { assignedIps: true } },
        kubernetesClusters: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.email = decryptDeterministic(user.email);
    if (user.name) user.name = decryptDeterministic(user.name);

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Get User Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = parseInt(params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId, role: 'USER' }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found or cannot delete admins" }, { status: 404 });
    }


    await prisma.apiKey.deleteMany({ where: { userId: user.id } });
    await prisma.shortLink.deleteMany({ where: { userId: user.id } });
    
    // 4.5. Find and delete VPC Peerings and VPC Networks from Mikrotik
    const peerings = await prisma.vpcPeering.findMany({
      where: { OR: [{ vpcA: { userId: user.id } }, { vpcB: { userId: user.id } }] },
      include: { vpcA: { include: { router: true } } }
    });
    if (peerings.length > 0) {
      const { deleteVpcPeeringFromMikrotik } = await import('@/lib/mikrotik');
      for (const peering of peerings) {
        try { await deleteVpcPeeringFromMikrotik(peering.vpcA.router, peering.id); } 
        catch (e: any) { console.warn(`Admin User Deletion: Failed to delete VPC Peering ${peering.id}:`, e.message); }
      }
    }

    const vpcs = await prisma.vpcNetwork.findMany({
      where: { userId: user.id },
      include: { router: true }
    });
    if (vpcs.length > 0) {
      const { deleteVpcFromMikrotik } = await import('@/lib/mikrotik');
      for (const vpc of vpcs) {
        try { await deleteVpcFromMikrotik(vpc.router, vpc); } 
        catch (e: any) { console.warn(`Admin User Deletion: Failed to delete VPC ${vpc.id}:`, e.message); }
      }
    }

    // 4.6. Find and physically delete all VPS Services from Proxmox
    const vpsServices = await prisma.vpsService.findMany({ where: { userId: user.id } });
    if (vpsServices.length > 0) {
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (server) {
        const { ProxmoxClient } = await import('@/lib/proxmox');
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        for (const vps of vpsServices) {
          if (vps.vmid) {
            try {
              await proxmox.stopVm(vps.node, vps.vmid);
              await new Promise(r => setTimeout(r, 5000));
              await proxmox.deleteVm(vps.node, vps.vmid);
              console.log(`Successfully deleted VMID ${vps.vmid} for deleted user ${user.id}`);
            } catch (err: any) {
              console.warn(`Admin User Deletion: Failed to delete VMID ${vps.vmid}:`, err.message);
            }
          }
        }
      }
    }

    // 5. Find all SecureMedia files for this user and delete physically
    const secureFiles = await prisma.secureMedia.findMany({
      where: { userId: user.id, isFolder: false }
    });

    const secureDir = path.join(process.cwd(), "storage", "secure-media");
    for (const file of secureFiles) {
      if (file.filename) {
        const filePath = path.join(secureDir, file.filename);
        try {
          await unlink(filePath);
        } catch (e) {
          console.error(`Failed to delete file ${filePath}:`, e);
        }
      }
    }
    
    // Auth dependencies
    await prisma.userVerificationOtp.deleteMany({ where: { userId: user.id } });
    await prisma.resetToken.deleteMany({ where: { userId: user.id } });

    // Affiliate system cleanup
    await prisma.withdrawalRequest.deleteMany({ where: { userId: user.id } });
    await prisma.affiliateEarning.deleteMany({ where: { OR: [{ referrerId: user.id }, { referredId: user.id }] } });
    await prisma.user.updateMany({ where: { referredById: user.id }, data: { referredById: null } });

    // Billing cleanup
    await prisma.invoice.deleteMany({ where: { userId: user.id } });
    await prisma.subscription.deleteMany({ where: { userId: user.id } });

    // Support cleanup
    const userTickets = await prisma.supportTicket.findMany({ where: { userId: user.id } });
    const ticketIds = userTickets.map(t => t.id);
    if (ticketIds.length > 0) {
      await prisma.ticketAttachment.deleteMany({ where: { message: { ticketId: { in: ticketIds } } } });
      await prisma.ticketMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await prisma.supportTicket.deleteMany({ where: { userId: user.id } });
    }
    await prisma.ticketMessage.deleteMany({ where: { userId: user.id } }); // Delete any messages they sent on other tickets

    // Services cleanup
    await prisma.vpsService.deleteMany({ where: { userId: user.id } });
    await prisma.vpcNetwork.deleteMany({ where: { userId: user.id } });
    await prisma.kubernetesCluster.deleteMany({ where: { userId: user.id } });
    await prisma.reservedIp.deleteMany({ where: { userId: user.id } });
    await prisma.secureMedia.deleteMany({ where: { userId: user.id } });

    // Blog cleanup
    await prisma.blogPost.updateMany({ where: { authorId: user.id }, data: { authorId: null } });

    // 5. Finally, delete the user
    await prisma.user.delete({
      where: { id: user.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete User Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

