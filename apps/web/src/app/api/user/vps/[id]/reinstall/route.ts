import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { JobQueueService } from "@/lib/job-queue";
import { getAppById, matchTemplateForApp, sanitizeAppConfig } from "@/lib/vps-apps";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id } = await params;
    const whereClause: any = { id: parseInt(id) };
    if (user?.role !== "ADMIN") {
        whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }

    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated. Reinstallation is blocked." }, { status: 403 });
    }

    if (vps.status === "PROVISIONING") {
      return NextResponse.json({ error: "VPS is already being provisioned or reinstalled." }, { status: 409 });
    }

    const body = await req.json();
    const { templateName, password, appId, appConfig } = body;

    // Security: Validate password length & complexity bounds if provided
    if (password) {
      if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        return NextResponse.json({ error: "Password must be between 8 and 128 characters long." }, { status: 400 });
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return NextResponse.json({ error: "Password must contain both letters and numbers." }, { status: 400 });
      }
    }

    let targetTemplateName = templateName;
    const app = appId ? getAppById(appId) : null;
    if (appId && !app) {
      return NextResponse.json({ error: "Invalid application selected" }, { status: 400 });
    }

    const cleanAppConfig = app
      ? sanitizeAppConfig(app, appConfig, { email: user.email, password, vpsUsername: vps.username || undefined })
      : undefined;

    const activeTemplates = await prisma.vpsTemplate.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" }
    });

    if (app) {
      // 1-Click App installation strictly enforces base OS template based on app requirement
      const matchedAppTemplate = matchTemplateForApp(app, activeTemplates);
      if (matchedAppTemplate) {
        targetTemplateName = matchedAppTemplate;
      }
    }

    if (!targetTemplateName) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    // Verify template exists
    const template = activeTemplates.find(t => t.name === targetTemplateName) ||
      await prisma.vpsTemplate.findFirst({ where: { name: targetTemplateName } });
    if (!template) {
      return NextResponse.json({ error: "Invalid template selected" }, { status: 400 });
    }

    // Atomic lock so concurrent reinstall calls cannot collide
    const nowTime = new Date().toLocaleTimeString("en-US", { hour12: false });
    const initialLogs = [
      `[${nowTime}] [REINSTALL] Initializing clean OS reinstallation for ${targetTemplateName}...`
    ];
    const initialCreds = {
      stage: "ALLOCATING",
      stageLabel: `Initializing reinstallation for ${targetTemplateName}...`,
      progress: 5,
      startedAt: new Date().toISOString(),
      logs: initialLogs
    };

    const lock = await prisma.vpsService.updateMany({
      where: { id: vps.id, status: vps.status },
      data: { 
        status: "PROVISIONING",
        appName: app ? app.name : null,
        appVersion: app ? app.appVersion : null,
        appStatus: app ? "WAITING_VM" : "NONE",
        appUrl: null,
        appCredentials: JSON.stringify(initialCreds)
      },
    });
    if (lock.count === 0) {
      return NextResponse.json({ error: "Instance state changed. Please retry." }, { status: 409 });
    }

    // Enqueue reinstall task into background worker queue for resilient, zero-downtime execution
    await JobQueueService.enqueue('REINSTALL_VPS', {
      vpsId: vps.id,
      templateName: template.name,
      password,
      appId: app ? app.id : undefined,
      appConfig: cleanAppConfig,
    });

    return NextResponse.json({
      message: app
        ? `Reinstallation and ${app.name} deployment started. The server will be rebuilt shortly.`
        : "Reinstallation started. The server will be rebuilt shortly."
    });
  } catch (error: any) {
    console.error("VPS Reinstall Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
