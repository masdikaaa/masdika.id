import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { attemptAutoUnsuspendVps, attemptAutoUnsuspendSubscription } from "@/lib/auto-unsuspend";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;
    const { serviceId, serviceType, autoRenew } = await req.json();

    if (!serviceId || !serviceType || typeof autoRenew !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (serviceType === 'SUBSCRIPTION') {
      const sub = await prisma.subscription.findUnique({ where: { id: serviceId } });
      if (!sub || sub.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      
      await prisma.subscription.update({ where: { id: serviceId }, data: { autoRenew } });

      if (autoRenew && sub.status === 'SUSPENDED') {
        const unsuspendRes = await attemptAutoUnsuspendSubscription(serviceId);
        if (unsuspendRes.unsuspended) {
          return NextResponse.json({
            success: true,
            autoRenew: true,
            unsuspended: true,
            message: 'Auto-renew diaktifkan dan layanan berhasil diaktifkan kembali secara otomatis!'
          });
        } else if (unsuspendRes.reason === 'INSUFFICIENT_BALANCE') {
          const reqStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(unsuspendRes.requiredBalance || 0);
          const curStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(unsuspendRes.currentBalance || 0);
          return NextResponse.json({
            success: true,
            autoRenew: true,
            unsuspended: false,
            warning: 'INSUFFICIENT_BALANCE',
            message: `Auto-renew berhasil diaktifkan. Namun saldo akun Anda (${curStr}) belum mencukupi untuk biaya perpanjangan (${reqStr}). Silakan lakukan Top Up saldo agar layanan langsung otomatis aktif kembali.`
          });
        }
      }

      return NextResponse.json({
        success: true,
        autoRenew,
        message: autoRenew ? 'Auto-renew berhasil diaktifkan.' : 'Auto-renew dinonaktifkan.'
      });

    } else if (serviceType === 'VPS') {
      const vps = await prisma.vpsService.findUnique({ where: { id: serviceId } });
      if (!vps || vps.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      
      await prisma.vpsService.update({ where: { id: serviceId }, data: { autoRenew } });

      if (autoRenew && vps.status === 'SUSPENDED') {
        const unsuspendRes = await attemptAutoUnsuspendVps(serviceId);
        if (unsuspendRes.unsuspended) {
          return NextResponse.json({
            success: true,
            autoRenew: true,
            unsuspended: true,
            message: 'Auto-renew diaktifkan dan VPS berhasil diaktifkan kembali secara otomatis!'
          });
        } else if (unsuspendRes.reason === 'INSUFFICIENT_BALANCE') {
          const reqStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(unsuspendRes.requiredBalance || 0);
          const curStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(unsuspendRes.currentBalance || 0);
          return NextResponse.json({
            success: true,
            autoRenew: true,
            unsuspended: false,
            warning: 'INSUFFICIENT_BALANCE',
            message: `Auto-renew berhasil diaktifkan. Namun saldo akun Anda (${curStr}) belum mencukupi untuk biaya perpanjangan (${reqStr}). Silakan lakukan Top Up saldo agar VPS langsung otomatis aktif kembali.`
          });
        }
      }

      return NextResponse.json({
        success: true,
        autoRenew,
        message: autoRenew ? 'Auto-renew berhasil diaktifkan.' : 'Auto-renew dinonaktifkan.'
      });

    } else if (serviceType === 'RESERVED_IP') {
      const ip = await prisma.reservedIp.findUnique({ where: { id: serviceId } });
      if (!ip || ip.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      
      await prisma.reservedIp.update({ where: { id: serviceId }, data: { autoRenew } });

      if (autoRenew && ip.vpsId) {
        // If attached VPS was suspended due to IP reservation, try unsuspending it
        const attachedVps = await prisma.vpsService.findUnique({ where: { id: ip.vpsId } });
        if (attachedVps && attachedVps.status === 'SUSPENDED') {
          await attemptAutoUnsuspendVps(attachedVps.id);
        }
      }

      return NextResponse.json({
        success: true,
        autoRenew,
        message: autoRenew ? 'Auto-renew IP berhasil diaktifkan.' : 'Auto-renew IP dinonaktifkan.'
      });

    } else {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 });
    }
  } catch (error) {
    console.error("Toggle auto renew error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
