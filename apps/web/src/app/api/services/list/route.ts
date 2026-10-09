import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { encryptDeterministic } from '@/lib/encryption';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const user = auth.user!;
    const { searchParams } = new URL(req.url);
    const targetEmail = searchParams.get('email');

    let targetUserId = user.id;

    // Admin can query by email
    if (user.role === 'ADMIN' && targetEmail) {
      const encryptedTargetEmail = encryptDeterministic(targetEmail.toLowerCase().trim());
      const targetUser = await prisma.user.findUnique({
        where: { email: encryptedTargetEmail }
      });
      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      targetUserId = targetUser.id;
    }

    // Fetch all active/suspended services for the user
    const [vps, subs, k3s] = await Promise.all([
      prisma.vpsService.findMany({
        where: { 
          userId: targetUserId, 
          status: { in: ['RUNNING', 'STOPPED', 'SUSPENDED'] },
          kubernetesClusterId: null 
        },
        select: { id: true, hostname: true, status: true }
      }),
      prisma.subscription.findMany({
        where: { userId: targetUserId, status: { in: ['ACTIVE'] } },
        include: { plan: { select: { name: true, service: true } } }
      }),
      prisma.kubernetesCluster.findMany({
        where: { userId: targetUserId, status: { in: ['RUNNING', 'STOPPED'] } },
        select: { id: true, name: true, status: true }
      })
    ]);

    const services = [];

    for (const v of vps) {
      services.push({ id: `vps-${v.id}`, type: 'VPS', name: v.hostname, status: v.status, value: `VPS - ${v.hostname}` });
    }

    for (const sub of subs) {
      services.push({ id: `sub-${sub.id}`, type: 'Subscription', name: `${sub.plan.service}: ${sub.plan.name}`, status: sub.status, value: `Sub - ${sub.plan.service}: ${sub.plan.name}` });
    }

    for (const k of k3s) {
      services.push({ id: `k3s-${k.id}`, type: 'K3s', name: k.name, status: k.status, value: `K3s - ${k.name}` });
    }

    return NextResponse.json({ success: true, services });
  } catch (error) {
    console.error('Fetch services list error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
