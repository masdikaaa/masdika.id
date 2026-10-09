import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { authenticateReseller, apiError, parseId, proxmoxBusyResponse } from "@/lib/reseller-api";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_GET_INSTANCE", max: 120, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const instanceId = parseId((await params).id);
    if (!instanceId) return apiError("Invalid instance ID", 400);

    // Ownership is enforced in the query itself: a reseller can never read someone else's VM
    const vps = await prisma.vpsService.findFirst({
      where: { id: instanceId, userId: apiKey.userId, isReseller: true, status: { not: "TERMINATED" } },
      select: {
        id: true,
        vmid: true,
        node: true,
        hostname: true,
        status: true,
        suspendReason: true,
        cpuCores: true,
        ramGb: true,
        diskGb: true,
        osTemplate: true,
        networkBridge: true,
        expiresAt: true,
        createdAt: true,
        assignedIps: { select: { ipAddress: true, isPrimary: true, ipPool: { select: { gateway: true } } } },
      },
    });
    if (!vps) return apiError("Instance not found", 404);

    // Live power state + resource usage (best effort — Proxmox being slow must not fail the request)
    let powerState: string | null = null;
    let stats: { cpu: number; mem: number; disk: number } | null = null;
    if (vps.vmid && ["RUNNING", "STOPPED", "SUSPENDED"].includes(vps.status)) {
      try {
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
          const live = await proxmox.getVmStatus(vps.node, vps.vmid);
          powerState = live?.status ?? null;
          if (live) {
            stats = {
              cpu: Math.round((live.cpu || 0) * 1000) / 10, // percent
              mem: live.mem || 0,
              disk: live.disk || 0,
            };
          }
        }
      } catch (e: any) {
        console.warn(`[RESELLER_API] live status unavailable for VM ${vps.vmid}: ${e?.message}`);
      }
    }

    const { assignedIps, node, vmid, ...rest } = vps;
    return NextResponse.json({
      success: true,
      data: {
        ...rest,
        powerState,
        assignedIps: assignedIps.map((a) => ({ ipAddress: a.ipAddress, gateway: a.ipPool.gateway, isPrimary: a.isPrimary })),
        stats,
      },
    });
  } catch (error: any) {
    console.error("[RESELLER_API_GET_INSTANCE]", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_DELETE_INSTANCE", max: 20, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const instanceId = parseId((await params).id);
    if (!instanceId) return apiError("Invalid instance ID", 400);

    const vps = await prisma.vpsService.findFirst({
      where: { id: instanceId, userId: apiKey.userId, isReseller: true },
    });
    if (!vps || vps.status === "TERMINATED") return apiError("Instance not found", 404);

    if (vps.status === "TERMINATING") return apiError("Instance is already being terminated", 409);
    if (vps.status === "PROVISIONING") {
      return apiError("Instance is still being provisioned. Please wait until provisioning completes.", 409);
    }

    // Atomic lock — prevents double-termination races
    const lock = await prisma.vpsService.updateMany({
      where: { id: vps.id, status: vps.status },
      data: { status: "TERMINATING" },
    });
    if (lock.count === 0) return apiError("Instance state changed. Please retry.", 409);

    // Destroy on Proxmox FIRST. If this fails we roll the state back instead of leaving an
    // orphaned VM that no longer shows up (and is no longer billed) for the reseller.
    if (vps.vmid) {
      try {
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (!server) throw new Error("No active Proxmox server");
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        try {
          await proxmox.stopVm(vps.node, vps.vmid);
          await new Promise((r) => setTimeout(r, 2000));
        } catch {
          // already stopped
        }
        try {
          await proxmox.deleteVm(vps.node, vps.vmid);
        } catch (e: any) {
          if (!/does not exist|no such/i.test(e?.message || "")) throw e;
        }
      } catch (e: any) {
        console.error(`[RESELLER_API] Failed to destroy VM ${vps.vmid}:`, e);
        await prisma.vpsService.update({ where: { id: vps.id }, data: { status: vps.status } });
        const busy = proxmoxBusyResponse(e);
        return busy || apiError("Failed to destroy the instance on the hypervisor. Please try again.", 502);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.vpsIpAssignment.deleteMany({ where: { vpsId: vps.id } });
      await tx.reservedIp.updateMany({ where: { vpsId: vps.id }, data: { isAttached: false, vpsId: null } });
      await tx.invoice.updateMany({
        where: { vpsServiceId: vps.id, reference: "PAYG_RUNNING", type: "VPS" },
        data: { reference: "PAYG_COMPLETED" },
      });
      await tx.vpsService.update({
        where: { id: vps.id },
        data: { status: "TERMINATED", vmid: null, vpcIp: null, vpcId: null, autoRenew: false },
      });
    });

    return NextResponse.json({ success: true, message: `Instance ${vps.id} has been successfully destroyed` });
  } catch (error: any) {
    console.error("[RESELLER_API_DELETE_INSTANCE]", error);
    return apiError("Internal server error", 500);
  }
}
