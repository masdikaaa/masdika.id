import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import { searchVpsElastic, syncVpsToElastic } from "@/lib/sync-elasticsearch";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const q = req.nextUrl.searchParams.get("q");
    
    let whereClause: any = { status: { not: 'TERMINATED' } };
    
    if (q) {
      const esIds = await searchVpsElastic(q);
      if (esIds && esIds.length > 0) {
        whereClause.id = { in: esIds };
      } else if (esIds && esIds.length === 0) {
        // ES is active but returned no results
        return NextResponse.json([]);
      }
      // If esIds is null (ES disabled/failed), it will fallback to normal get
    }

    const services = await prisma.vpsService.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        assignedIps: {
          where: { isPrimary: true }
        },
        reservedIps: {
          select: { accumulatedCost: true }
        }
      }
    });

    const decryptedServices = services.map(vps => {
      const rawEmail = vps.user?.email || "";
      const email = decryptDeterministic(rawEmail) || rawEmail;
      
      const rawName = vps.user?.name || "";
      const name = decryptDeterministic(rawName) || rawName;
      
      return {
        ...vps,
        user: { ...vps.user, email, name }
      };
    });

    return NextResponse.json(decryptedServices);
  } catch (error) {
    console.error("GET /api/admin/vps/services error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, action, reason, password } = await req.json();

    const vps = await prisma.vpsService.findUnique({
      where: { id: Number(id) }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "Proxmox server is offline" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    if (action === "terminate") {
      if (vps.vmid) {
        // Stop VM first, ignoring errors if it's already stopped
        try {
          await proxmox.stopVm(vps.node, vps.vmid);
          // Wait a few seconds for it to stop
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
          console.log("Stop VM before terminate failed/ignored:", e);
        }
        
        // Destroy the VM
        try {
          await proxmox.deleteVm(vps.node, vps.vmid);
        } catch (e: any) {
          console.log("Delete VM failed/ignored (maybe already deleted):", e);
        }
      }

      // If it had IPs assigned, release them
      const ips = await prisma.vpsIpAssignment.findMany({ where: { vpsId: vps.id } });
      if (ips.length > 0) {
        await prisma.vpsIpAssignment.deleteMany({ where: { vpsId: vps.id } });
      }

      // Detach reserved IPs so they remain owned by the user and prevent FK constraint errors
      await prisma.reservedIp.updateMany({
        where: { vpsId: vps.id },
        data: { isAttached: false, vpsId: null }
      });

      // Finalize PAYG Billing
      const runningInvoice = await prisma.invoice.findFirst({
        where: { vpsServiceId: vps.id, reference: 'PAYG_RUNNING', type: 'VPS' },
        orderBy: { createdAt: 'desc' }
      });
      if (runningInvoice) {
        await prisma.invoice.update({
          where: { id: runningInvoice.id },
          data: { reference: 'PAYG_COMPLETED' }
        });
      }

      await prisma.vpsService.update({
        where: { id: vps.id },
        data: { status: "TERMINATED", vmid: null, vpcIp: null, vpcId: null }
      });

      logger.warn('VPS Terminated by Admin', {
        event: 'vps.terminated',
        vpsId: vps.id,
        vmid: vps.vmid,
        adminId: auth.user?.id
      });

      // Sync removal to Elasticsearch
      await syncVpsToElastic(vps.id).catch(e => console.error("ES Sync error:", e));

      return NextResponse.json({ success: true, message: "VPS Terminated" });
    }

    if (action === "suspend") {
      if (vps.vmid) {
        try {
          await proxmox.stopVm(vps.node, vps.vmid);
        } catch (e) {
          console.log("Stop VM during suspend failed/ignored:", e);
        }
      }
      
      await prisma.vpsService.update({
        where: { id: vps.id },
        data: { status: "SUSPENDED", suspendReason: reason || "Suspended by Administrator" }
      });
      return NextResponse.json({ success: true, message: "VPS Suspended" });
    }

    if (action === "unsuspend") {
      let started = false;
      if (vps.vmid) {
        try {
          await proxmox.startVm(vps.node, vps.vmid);
          started = true;
        } catch (e) {
          console.log("Start VM during unsuspend failed:", e);
        }
      }
      await prisma.vpsService.update({
        where: { id: vps.id },
        data: { status: started ? "RUNNING" : "STOPPED", suspendReason: null }
      });
      return NextResponse.json({ success: true, message: started ? "VPS Unsuspended and Started" : "VPS Unsuspended. Client can start it now." });
    }

    if (action === "update") {
      const { 
        hostname, 
        username, 
        password: updatePassword, 
        status, 
        node, 
        expiresAt, 
        terminationDate,
        cpuCores,
        ramGb,
        diskGb
      } = await req.json().catch(() => ({ hostname: undefined, username: undefined, password: undefined, status: undefined, node: undefined, expiresAt: undefined, terminationDate: undefined, cpuCores: undefined, ramGb: undefined, diskGb: undefined }));

      const updateData: any = {};
      if (hostname !== undefined) updateData.hostname = hostname;
      if (username !== undefined) updateData.username = username;
      if (updatePassword) updateData.rootPassword = encryptDeterministic(updatePassword);
      if (status !== undefined) updateData.status = status;
      if (node !== undefined) updateData.node = node;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
      if (terminationDate !== undefined) updateData.terminationDate = terminationDate ? new Date(terminationDate) : null;
      if (cpuCores !== undefined) updateData.cpuCores = Number(cpuCores);
      if (ramGb !== undefined) updateData.ramGb = Number(ramGb);
      if (diskGb !== undefined) updateData.diskGb = Number(diskGb);

      await prisma.vpsService.update({
        where: { id: vps.id },
        data: updateData
      });

      // Sync update to Elasticsearch
      await syncVpsToElastic(vps.id).catch(e => console.error("ES Sync error:", e));

      return NextResponse.json({ success: true, message: "VPS details updated successfully" });
    }

    if (action === "reset_password") {
      if (!vps.vmid) {
        return NextResponse.json({ error: "VPS does not have a VMID" }, { status: 400 });
      }
      if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });
      if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return NextResponse.json({ error: "Password must contain both letters and numbers." }, { status: 400 });
      }
      
      await proxmox.configVm(vps.node, vps.vmid, { cipassword: password });
      
      await prisma.vpsService.update({
          where: { id: vps.id },
          data: { rootPassword: encryptDeterministic(password) }
      });
      
      return NextResponse.json({ success: true, message: "Password reset successfully. A reboot is required to apply changes." });
    }

    // Proxmox Power Actions
    if (!vps.vmid) {
      return NextResponse.json({ error: "VPS does not have a VMID (failed provisioning?)" }, { status: 400 });
    }

    switch (action) {
      case "start":
        await proxmox.startVm(vps.node, vps.vmid);
        break;
      case "stop":
        await proxmox.stopVm(vps.node, vps.vmid);
        break;
      case "shutdown":
        await proxmox.shutdownVm(vps.node, vps.vmid);
        break;
      case "reboot":
        await proxmox.rebootVm(vps.node, vps.vmid);
        break;
      case "reset":
        await proxmox.resetVm(vps.node, vps.vmid);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Sync status if it was a power operation
    const statusMap: Record<string, string> = {
      "start": "RUNNING",
      "stop": "STOPPED",
      "shutdown": "STOPPED",
      "reboot": "RUNNING",
      "reset": "RUNNING"
    };

    if (statusMap[action]) {
      await prisma.vpsService.update({
        where: { id: vps.id },
        data: { status: statusMap[action] }
      });
    }

    return NextResponse.json({ success: true, message: `Action ${action} executed successfully` });
  } catch (error: any) {
    console.error(`Admin VPS action error:`, error);
    return NextResponse.json({ error: error.message || "Action failed" }, { status: 500 });
  }
}
