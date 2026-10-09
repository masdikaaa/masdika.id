import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = parseInt(id);

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

    const { id } = await params;
    const vpsId = parseInt(id);
    
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

    const userEmail = decryptDeterministic(user.email) || user.email;
    
    // VALIDATE RULES
    for (const rule of rules) {
      if (typeof rule.threshold !== 'number' || rule.threshold < 1 || rule.threshold > 100) {
        return NextResponse.json({ error: "Threshold must be between 1 and 100" }, { status: 400 });
      }
      if (rule.notifyEmails && rule.notifyEmails.length > 255) {
        return NextResponse.json({ error: "Emails string too long" }, { status: 400 });
      }
      if (rule.notifyEmails) {
        const emails = rule.notifyEmails.split(',').map(e => e.trim()).filter(e => e);
        if (emails.length > 5) {
          return NextResponse.json({ error: "Maximum 5 email addresses allowed" }, { status: 400 });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of emails) {
          if (!emailRegex.test(email)) {
            return NextResponse.json({ error: `Invalid email address: ${email}` }, { status: 400 });
          }
        }
      }
    }

    const updatedRules: any[] = [];
    
    await prisma.$transaction(async (tx) => {
      for (const rule of rules) {
        if (!["CPU", "RAM", "DISK"].includes(rule.metric)) continue;
        
        let emailsStr = userEmail;
        if (rule.notifyEmails) {
          emailsStr = rule.notifyEmails.split(',').map(e => e.trim()).filter(e => e).join(',');
        }

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
            lastTriggeredAt: null 
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
