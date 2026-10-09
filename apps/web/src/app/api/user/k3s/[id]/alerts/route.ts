import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const clusterId = parseInt(id);

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { id: clusterId, userId: user.id },
      include: {
        nodes: {
          include: {
            alertRules: true
          }
        }
      }
    });

    if (!cluster || cluster.nodes.length === 0) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Use the first node's alert rules as representative for the cluster
    const representativeNode = cluster.nodes[0];
    let alertRules = representativeNode.alertRules;

    // If no rules found on the first node, return default shapes
    if (alertRules.length === 0) {
      return NextResponse.json({
        success: true,
        alertRules: [
          { metric: "CPU", threshold: 90, isEnabled: false, notifyEmails: "" },
          { metric: "RAM", threshold: 90, isEnabled: false, notifyEmails: "" },
          { metric: "DISK", threshold: 90, isEnabled: false, notifyEmails: "" }
        ]
      });
    }

    return NextResponse.json({ success: true, alertRules });
  } catch (error: any) {
    console.error("Failed to fetch k3s alert rules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const clusterId = parseInt(id);
    const body = await req.json();
    const { rules } = body;

    if (!rules || !Array.isArray(rules) || rules.length > 5) {
      return NextResponse.json({ error: "Invalid rules payload" }, { status: 400 });
    }

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { id: clusterId, userId: user.id },
      include: { nodes: true }
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // VALIDATE RULES
    for (const rule of rules) {
      if (typeof rule.threshold !== 'number' || rule.threshold < 1 || rule.threshold > 100) {
        return NextResponse.json({ error: "Threshold must be between 1 and 100" }, { status: 400 });
      }
      if (rule.notifyEmails && rule.notifyEmails.length > 255) {
        return NextResponse.json({ error: "Emails string too long" }, { status: 400 });
      }
      if (rule.notifyEmails) {
        const emails = rule.notifyEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e);
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

    // Apply the rules to ALL nodes in the cluster using a single transaction
    await prisma.$transaction(async (tx) => {
      for (const node of cluster.nodes) {
        for (const rule of rules) {
          if (!["CPU", "RAM", "DISK"].includes(rule.metric)) continue;

          let emailsStr = "";
          if (rule.notifyEmails) {
            emailsStr = rule.notifyEmails.split(',').map((e: string) => e.trim()).filter((e: string) => e).join(',');
          }

          await tx.vpsAlertRule.upsert({
            where: {
              vpsId_metric: {
                vpsId: node.id,
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
              vpsId: node.id,
              metric: rule.metric,
              threshold: rule.threshold,
              isEnabled: rule.isEnabled,
              notifyEmails: emailsStr
            }
          });
        }
      }
    });

    return NextResponse.json({ success: true, message: "Alert rules applied to all cluster nodes" });
  } catch (error: any) {
    console.error("Failed to update k3s alert rules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
