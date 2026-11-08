import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = parseInt(id, 10);
    if (isNaN(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id }
    });

    if (!vps) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const alertRules = await prisma.vpsAlertRule.findMany({
      where: { vpsId }
    });

    return NextResponse.json({ success: true, alertRules });
  } catch (error: any) {
    console.error("Fetch Alert Rules Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    if (!(await checkRateLimit("VPS_ALERTS_UPDATE", String(user.id), 15, 60))) {
      return NextResponse.json({ error: "Too many alert configuration updates. Please wait a minute." }, { status: 429 });
    }

    const { id } = await params;
    const vpsId = parseInt(id, 10);
    if (isNaN(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    }
    
    const body = await req.json();
    const rules: Array<{ metric: string, threshold: number, isEnabled: boolean, notifyEmails?: string }> = body.rules;

    if (!Array.isArray(rules) || rules.length > 5) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id }
    });

    if (!vps) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const ownerEmail = (decryptDeterministic(user.email) || user.email).toLowerCase().trim();
    
    // VALIDATE RULES
    for (const rule of rules) {
      if (typeof rule.threshold !== 'number' || !Number.isFinite(rule.threshold) || rule.threshold < 1 || rule.threshold > 100) {
        return NextResponse.json({ error: "Threshold must be between 1 and 100" }, { status: 400 });
      }
      if (typeof rule.isEnabled !== 'boolean') {
        return NextResponse.json({ error: "Invalid isEnabled flag" }, { status: 400 });
      }
      if (rule.notifyEmails !== undefined && typeof rule.notifyEmails !== 'string') {
        return NextResponse.json({ error: "Invalid notifyEmails format" }, { status: 400 });
      }
      if (rule.notifyEmails && rule.notifyEmails.length > 255) {
        return NextResponse.json({ error: "Emails string too long" }, { status: 400 });
      }
      if (rule.notifyEmails) {
        const emails = rule.notifyEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
        for (const email of emails) {
          if (email !== ownerEmail) {
            return NextResponse.json(
              { error: "Alert notifications can only be sent to your verified account email" },
              { status: 400 }
            );
          }
        }
      }
    }

    const updatedRules: any[] = [];
    
    await prisma.$transaction(async (tx) => {
      for (const rule of rules) {
        if (!["CPU", "RAM", "DISK"].includes(rule.metric)) continue;
        
        const emailsStr = ownerEmail;

        const upserted = await tx.vpsAlertRule.upsert({
          where: {
            vpsId_metric: {
              vpsId,
              metric: rule.metric
            }
          },
          update: {
            threshold: rule.threshold,
            isEnabled: rule.isEnabled,
            notifyEmails: emailsStr,
          },
          create: {
            vpsId,
            metric: rule.metric,
            threshold: rule.threshold,
            notifyEmails: emailsStr,
            isEnabled: rule.isEnabled
          }
        });
        updatedRules.push(upserted);
      }
    });

    return NextResponse.json({ success: true, message: "Alert rules updated successfully", rules: updatedRules });
  } catch (error: any) {
    console.error("Update Alert Rules Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
