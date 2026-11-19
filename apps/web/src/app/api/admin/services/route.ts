import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

const ALLOWED_SERVICE_STATUSES = new Set(['ACTIVE', 'RUNNING', 'STOPPED', 'SUSPENDED', 'TERMINATED']);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json({ error: 'Cannot modify services during an impersonation session.' }, { status: 403 });
    }

    const { action, id, type, status, expiresAt, terminationDate } = await req.json();

    if (action !== "update") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const serviceId = Number(id);
    if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) {
      if (typeof status !== 'string' || !ALLOWED_SERVICE_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid service status" }, { status: 400 });
      }
      updateData.status = status;
    }
    if (expiresAt !== undefined) {
      if (expiresAt) {
        const d = new Date(expiresAt);
        if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid expiresAt date" }, { status: 400 });
        updateData.expiresAt = d;
      } else {
        updateData.expiresAt = null;
      }
    }
    if (terminationDate !== undefined) {
      if (terminationDate) {
        const d = new Date(terminationDate);
        if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Invalid terminationDate" }, { status: 400 });
        updateData.terminationDate = d;
      } else {
        updateData.terminationDate = null;
      }
    }

    const modelMap: Record<string, any> = {
      subscriptions: prisma.subscription,
      kubernetes: prisma.kubernetesCluster,
      database: prisma.databaseService,
      apps: prisma.appService,
      app: prisma.appService,
      'object-storage': prisma.objectStorageService,
    };
    const model = modelMap[String(type)];
    if (!model) {
      return NextResponse.json({ error: "Unknown service type" }, { status: 400 });
    }

    const existing = await model.findUnique({ where: { id: serviceId }, select: { status: true } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    if (existing.status === 'TERMINATED' && updateData.status && updateData.status !== 'TERMINATED') {
      return NextResponse.json({ error: "Cannot reactivate a terminated service" }, { status: 409 });
    }

    if (type === 'kubernetes') {
      const k8sData: any = {};
      if (updateData.status !== undefined) k8sData.status = updateData.status;
      await model.update({ where: { id: serviceId }, data: k8sData });
    } else {
      await model.update({ where: { id: serviceId }, data: updateData });
    }

    return NextResponse.json({ success: true, message: "Service updated successfully" });
  } catch (error: any) {
    console.error(`Admin service action error:`, error);
    return NextResponse.json({ error: error.message || "Action failed" }, { status: 500 });
  }
}
