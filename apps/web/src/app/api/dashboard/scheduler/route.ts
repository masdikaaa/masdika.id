import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { vpsId, schedule } = await req.json();

    if (!vpsId || !schedule) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: auth.userId }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    console.log(`[Scheduler] Saving schedule for VPS ${vps.id} (VMID: ${vps.vmid}), enabled: ${schedule.enabled}`);

    // Upsert schedule
    const updatedSchedule = await prisma.vpsSchedule.upsert({
      where: { vpsId: vps.id },
      update: {
        enabled: schedule.enabled,
        monday: schedule.monday,
        tuesday: schedule.tuesday,
        wednesday: schedule.wednesday,
        thursday: schedule.thursday,
        friday: schedule.friday,
        saturday: schedule.saturday,
        sunday: schedule.sunday,
        startTime: schedule.startTime,
        stopTime: schedule.stopTime,
        timezone: schedule.timezone || "Asia/Jakarta"
      },
      create: {
        vpsId: vps.id,
        enabled: schedule.enabled,
        monday: schedule.monday,
        tuesday: schedule.tuesday,
        wednesday: schedule.wednesday,
        thursday: schedule.thursday,
        friday: schedule.friday,
        saturday: schedule.saturday,
        sunday: schedule.sunday,
        startTime: schedule.startTime,
        stopTime: schedule.stopTime,
        timezone: schedule.timezone || "Asia/Jakarta"
      }
    });

    console.log(`[Scheduler] Schedule saved. enabled=${updatedSchedule.enabled}, vmid=${vps.vmid}`);

    // =============================================
    // REALTIME: Immediately evaluate & execute
    // =============================================
    let action = "NONE";

    if (!updatedSchedule.enabled) {
      console.log(`[Scheduler] Schedule is disabled, skipping realtime evaluation.`);
      return NextResponse.json({ success: true, schedule: updatedSchedule, action });
    }

    if (!vps.vmid) {
      console.log(`[Scheduler] VPS has no VMID, skipping realtime evaluation.`);
      return NextResponse.json({ success: true, schedule: updatedSchedule, action });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      console.log(`[Scheduler] No active Proxmox server found!`);
      return NextResponse.json({ success: true, schedule: updatedSchedule, action, warning: "No Proxmox server" });
    }

    console.log(`[Scheduler] Proxmox server found: ${server.host}`);

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const now = new Date();
    const tz = updatedSchedule.timezone;

    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });

    let userTimeStr = formatter.format(now);
    if (userTimeStr.startsWith('24:')) {
      userTimeStr = '00:' + userTimeStr.split(':')[1];
    }

    // Get day of week in user's timezone
    const dateStr = now.toLocaleString('en-US', { timeZone: tz });
    const userDate = new Date(dateStr);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const currentDay = dayNames[userDate.getDay()];

    const isDayActive = updatedSchedule[currentDay];
    const startTime = updatedSchedule.startTime;
    const stopTime = updatedSchedule.stopTime;

    console.log(`[Scheduler] Time check: currentTime=${userTimeStr}, day=${currentDay}, isDayActive=${isDayActive}, start=${startTime}, stop=${stopTime}`);

    let shouldBeRunning = false;
    if (isDayActive) {
      if (startTime < stopTime) {
        // Normal range: 08:00 - 17:00
        shouldBeRunning = userTimeStr >= startTime && userTimeStr < stopTime;
      } else if (startTime > stopTime) {
        // Cross-midnight: 22:00 - 06:00
        shouldBeRunning = userTimeStr >= startTime || userTimeStr < stopTime;
      } else {
        // start == stop means 24h
        shouldBeRunning = true;
      }
    }

    console.log(`[Scheduler] shouldBeRunning=${shouldBeRunning}`);

    // Get real VM status from Proxmox
    try {
      console.log(`[Scheduler] Fetching real VM status from Proxmox for node=${vps.node}, vmid=${vps.vmid}...`);
      const vmState = await proxmox.getVmStatus(vps.node, vps.vmid);
      const realStatus = vmState?.status === 'running' ? 'running' : 'stopped';
      console.log(`[Scheduler] Real Proxmox status: ${realStatus} (raw: ${vmState?.status})`);

      if (shouldBeRunning && realStatus === 'stopped') {
        console.log(`[Scheduler] STARTING VPS ${vps.id} (VMID: ${vps.vmid})...`);
        await proxmox.startVm(vps.node, vps.vmid);
        await prisma.vpsService.update({ where: { id: vps.id }, data: { status: 'RUNNING' } });
        action = "STARTED";
        console.log(`[Scheduler] VPS ${vps.id} START command sent successfully!`);
      } else if (!shouldBeRunning && realStatus === 'running') {
        console.log(`[Scheduler] STOPPING VPS ${vps.id} (VMID: ${vps.vmid})...`);
        await proxmox.stopVm(vps.node, vps.vmid);
        await prisma.vpsService.update({ where: { id: vps.id }, data: { status: 'STOPPED' } });
        action = "STOPPED";
        console.log(`[Scheduler] VPS ${vps.id} STOP command sent successfully!`);
      } else {
        console.log(`[Scheduler] No action needed. shouldBeRunning=${shouldBeRunning}, realStatus=${realStatus}`);
      }
    } catch (e: any) {
      console.error(`[Scheduler] Proxmox error for VPS ${vps.id}:`, e.message || e);
      action = "ERROR";
    }

    console.log(`[Scheduler] Final action: ${action}`);
    return NextResponse.json({ success: true, schedule: updatedSchedule, action });
  } catch (error: any) {
    console.error("Scheduler API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
