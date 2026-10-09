import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { VpsProvisioningService } from "@/lib/vps-provisioning";
import { encryptDeterministic } from "@/lib/encryption";
import {
  authenticateReseller,
  apiError,
  readJson,
  isValidHostname,
  passwordError,
  slugify,
  LIVE_VPS_STATUSES,
  HOURS_PER_MONTH,
} from "@/lib/reseller-api";
import crypto from "crypto";

export const dynamic = "force-dynamic";

class InsufficientBalanceError extends Error {}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_GET_INSTANCES", max: 120, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const instances = await prisma.vpsService.findMany({
      where: { userId: apiKey.userId, isReseller: true, status: { in: [...LIVE_VPS_STATUSES, "ERROR"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        hostname: true,
        status: true,
        cpuCores: true,
        ramGb: true,
        diskGb: true,
        osTemplate: true,
        expiresAt: true,
        createdAt: true,
        assignedIps: { select: { ipAddress: true, isPrimary: true } },
      },
    });

    const data = instances.map(({ assignedIps, ...vps }) => ({
      ...vps,
      ipAddress: assignedIps.find((a) => a.isPrimary)?.ipAddress ?? assignedIps[0]?.ipAddress ?? null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[RESELLER_API_LIST_INSTANCES]", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_POST_INSTANCES", max: 10, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const body = await readJson(req);
    if (!body) return apiError("Request body must be a valid JSON object", 400);

    const { hostname, os, plan, password } = body;

    if (!hostname || !os || !plan || !password) {
      return apiError("Missing required fields: hostname, os, plan, password", 400);
    }
    if (typeof os !== "string" || typeof plan !== "string") {
      return apiError("os and plan must be strings", 400);
    }
    if (!isValidHostname(hostname)) {
      return apiError("Invalid hostname. Use a valid FQDN: letters, numbers, hyphens and dots (each label max 63 chars).", 400);
    }
    const pwErr = passwordError(password);
    if (pwErr) return apiError(pwErr, 400);

    // 1. Resolve plan — only plans flagged for resellers, exact name or slug match
    const resellerPlans = await prisma.vpsPlan.findMany({ where: { isActive: true, isReseller: true } });
    const wanted = slugify(plan);
    const dbPlan = resellerPlans.find((p) => slugify(p.name) === wanted);
    if (!dbPlan) {
      return apiError(`Plan '${plan}' not found`, 404);
    }

    // Price is accounted exactly like the monthly renewal cron: hourlyRate * 730
    const hourlyRate = Math.round((dbPlan.monthlyPrice || 0) / HOURS_PER_MONTH);
    const monthlyUpfrontCost = hourlyRate * HOURS_PER_MONTH;
    if (hourlyRate <= 0) {
      return apiError(`Plan '${plan}' is not available for ordering`, 400);
    }

    // 2. Resolve template + server
    const template = await prisma.vpsTemplate.findFirst({ where: { name: os, isActive: true } });
    if (!template) {
      return apiError(`OS Template '${os}' not found`, 404);
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return apiError("No active Proxmox server available", 503);
    }

    const storageId =
      dbPlan.diskType === "SSD" ? server.mainDiskStorageSsd || server.mainDiskStorage : server.mainDiskStorage;
    if (!storageId) {
      return apiError("VPS storage is not configured by the administrator", 503);
    }
    const bridge = server.publicNetworkBridge || "vmbr1";

    // 3. Charge balance atomically (guarded, so concurrent requests can never overdraw)
    const orderId = `RSL-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    let vps;
    try {
      vps = await prisma.$transaction(async (tx) => {
        const charged = await tx.user.updateMany({
          where: { id: apiKey.userId, balance: { gte: monthlyUpfrontCost } },
          data: { balance: { decrement: monthlyUpfrontCost } },
        });
        if (charged.count === 0) throw new InsufficientBalanceError();

        const created = await tx.vpsService.create({
          data: {
            userId: apiKey.userId,
            hostname,
            username: "root",
            rootPassword: encryptDeterministic(password),
            cpuCores: dbPlan.cpuCores,
            ramGb: dbPlan.ramGb,
            diskGb: dbPlan.diskGb,
            diskType: dbPlan.diskType,
            osTemplate: template.name,
            networkBridge: bridge,
            storageId,
            status: "PROVISIONING",
            hourlyRate,
            isReseller: true,
            autoRenew: true,
            expiresAt,
          },
        });

        await tx.invoice.create({
          data: {
            invoiceNumber: orderId,
            merchantOrderId: orderId,
            userId: apiKey.userId,
            vpsServiceId: created.id,
            subtotal: monthlyUpfrontCost,
            amount: monthlyUpfrontCost,
            status: "PAID",
            paymentMethod: "Account Balance",
            type: "VPS",
            reference: "PAYG_RUNNING",
            paidAt: new Date(),
            details: JSON.stringify({ type: "RESELLER_API_PROVISIONING", plan: dbPlan.name, os: template.name }),
          },
        });

        return created;
      });
    } catch (e: any) {
      if (e instanceof InsufficientBalanceError) {
        const fresh = await prisma.user.findUnique({ where: { id: apiKey.userId }, select: { balance: true } });
        return apiError(
          `Insufficient balance. Required: Rp ${monthlyUpfrontCost.toLocaleString("id-ID")}, Available: Rp ${(fresh?.balance ?? 0).toLocaleString("id-ID")}`,
          402
        );
      }
      throw e;
    }

    // 4. Provision asynchronously (IP allocation, VMID, clone, cloud-init, firewall, start)
    VpsProvisioningService.provisionVps(vps.id, { ipv4Count: 1, ipv6Count: 0 }).catch(async (e) => {
      console.error(`[RESELLER_API] Provisioning failed for VPS ${vps.id}:`, e);
      await rollbackFailedProvision(vps.id, apiKey.userId, monthlyUpfrontCost, e?.message || "Provisioning failed");
    });

    return NextResponse.json(
      {
        success: true,
        message: "VPS provisioning started",
        data: {
          id: vps.id,
          hostname,
          status: "PROVISIONING",
          cost_deducted: monthlyUpfrontCost,
        },
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("[RESELLER_API_CREATE_INSTANCE]", error);
    return apiError("Internal server error", 500);
  }
}

/**
 * If provisioning fails the reseller must not pay for nothing: refund the upfront charge,
 * free any IPs that were allocated, remove a half-built VM and flag the instance as ERROR.
 */
async function rollbackFailedProvision(vpsId: number, userId: number, amount: number, reason: string) {
  try {
    const vps = await prisma.vpsService.findUnique({ where: { id: vpsId } });
    if (!vps || vps.status !== "PROVISIONING") return; // already handled / provisioned

    // Best-effort cleanup of a half-created VM on Proxmox
    if (vps.vmid) {
      try {
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
          try { await proxmox.stopVm(vps.node, vps.vmid); } catch {}
          await proxmox.deleteVm(vps.node, vps.vmid);
        }
      } catch (e) {
        console.error(`[RESELLER_API] Could not clean up VM ${vps.vmid}:`, e);
      }
    }

    await prisma.$transaction(async (tx) => {
      const flagged = await tx.vpsService.updateMany({
        where: { id: vpsId, status: "PROVISIONING" },
        data: { status: "ERROR", suspendReason: reason.slice(0, 500), vmid: null },
      });
      if (flagged.count === 0) return; // someone else already resolved it — never refund twice

      await tx.vpsIpAssignment.deleteMany({ where: { vpsId } });
      await tx.user.update({ where: { id: userId }, data: { balance: { increment: amount } } });
      await tx.invoice.updateMany({
        where: { vpsServiceId: vpsId, reference: "PAYG_RUNNING" },
        data: { status: "CANCELED", reference: "PROVISIONING_FAILED_REFUNDED" },
      });
    });
  } catch (e) {
    console.error(`[RESELLER_API] Rollback failed for VPS ${vpsId}:`, e);
  }
}
