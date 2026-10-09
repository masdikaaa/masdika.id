import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;
    const subscriptionId = parseInt(resolvedParams.id);
    if (isNaN(subscriptionId)) {
      return NextResponse.json({ error: "Invalid subscription ID" }, { status: 400 });
    }

    // 1. Fetch Subscription and verify ownership
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: userId,
      },
      include: {
        plan: true,
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.status === 'TERMINATED') {
      return NextResponse.json({ error: "Subscription is already terminated" }, { status: 400 });
    }

    // Anti-Race Condition: Ensure we lock the status
    const lock = await prisma.subscription.updateMany({
      where: { id: subscriptionId, status: subscription.status },
      data: { status: 'TERMINATING' }
    });

    if (lock.count === 0) {
       return NextResponse.json({ error: "Action in progress by another process" }, { status: 409 });
    }

    // 2. Perform cleanup based on service type
    const serviceType = subscription.plan.service;

    try {

      // Add other service cleanups here in the future if needed (e.g., Shortener, API keys)

      // 3. Finalize any PAYG invoices
      if (subscription.cycle === 'HOURLY') {
        await prisma.invoice.updateMany({
           where: {
              subscriptionId: subscription.id,
              reference: 'PAYG_RUNNING',
              status: 'PAID'
           },
           data: {
              reference: 'PAYG_COMPLETED'
           }
        });
      }

      // 4. Mark as TERMINATED
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { 
          status: 'TERMINATED',
          terminationDate: new Date(),
          autoRenew: false
        }
      });

      return NextResponse.json({ success: true, message: "Subscription terminated successfully." });

    } catch (cleanupError: any) {
      // Revert lock if massive failure
      await prisma.subscription.update({
         where: { id: subscriptionId },
         data: { status: subscription.status }
      });
      console.error("Termination cleanup error:", cleanupError);
      return NextResponse.json({ error: "Failed to cleanup resources. Please contact support." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Subscription deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
