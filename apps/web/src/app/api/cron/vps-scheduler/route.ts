import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProxmoxClient } from '@/lib/proxmox';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = await prisma.vpsSchedule.findMany({
      where: { enabled: true },
      include: { vps: true }
    });

    if (schedules.length === 0) {
      return NextResponse.json({ message: 'No active schedules' });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: 'No active Proxmox server' }, { status: 500 });
    }
    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const results: { vpsId: number; action: string; time: string }[] = [];
    const now = new Date();

    // Process in chunks of 5 to prevent Proxmox API rate limits/overload
    const chunkSize = 5;
    for (let i = 0; i < schedules.length; i += chunkSize) {
      const chunk = schedules.slice(i, i + chunkSize);
      
      await Promise.allSettled(chunk.map(async (schedule) => {
        const vps = schedule.vps;
        if (!vps || !vps.vmid) return;
        
        try {
          // Get localized time based on user's timezone settings
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: schedule.timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          });
          
          let userTimeStr = formatter.format(now);
          // Handle '24:xx' edge case in some node versions
          if (userTimeStr.startsWith('24:')) {
            userTimeStr = '00:' + userTimeStr.split(':')[1];
          }

          // Get day of week in user's timezone
          const dateStr = now.toLocaleString('en-US', { timeZone: schedule.timezone });
          const userDate = new Date(dateStr);
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDay = dayNames[userDate.getDay()] as keyof typeof schedule;
          
          let shouldBeRunning = false;
          
          if (schedule[currentDay]) {
            const current = userTimeStr; // HH:MM
            const start = schedule.startTime;
            const stop = schedule.stopTime;
            
            if (start < stop) {
              shouldBeRunning = current >= start && current < stop;
            } else if (start > stop) {
              // Time range crosses midnight (e.g., 22:00 to 06:00)
              shouldBeRunning = current >= start || current < stop;
            } else {
              // start == stop means 24 hours on active days
              shouldBeRunning = true;
            }
          }

          // Fetch real status from Proxmox (Smart System check)
          let realStatus = 'stopped';
          try {
            const vmState = await proxmox.getVmStatus(vps.node, vps.vmid);
            realStatus = vmState?.status === 'running' ? 'running' : 'stopped';
          } catch (e) {
            console.error(`Failed to get real status for VPS ${vps.id}:`, e);
            // Fallback to database status if Proxmox API is unresponsive for this VM
            realStatus = vps.status === 'RUNNING' ? 'running' : 'stopped';
          }

          // State reconciliation (Smart auto-correction)
          if (shouldBeRunning) {
            if (realStatus === 'stopped') {
              // Real VM is stopped, but it should be running -> START IT
              await proxmox.startVm(vps.node, vps.vmid);
              await prisma.vpsService.update({ where: { id: vps.id }, data: { status: 'RUNNING' } });
              results.push({ vpsId: vps.id, action: 'STARTED', time: userTimeStr });
            } else if (realStatus === 'running' && vps.status !== 'RUNNING') {
              // Real VM is running but DB says it's not -> AUTO CORRECT DB
              await prisma.vpsService.update({ where: { id: vps.id }, data: { status: 'RUNNING' } });
              results.push({ vpsId: vps.id, action: 'CORRECTED_DB_RUNNING', time: userTimeStr });
            }
          } else {
            if (realStatus === 'running') {
              // Real VM is running, but it should be stopped -> STOP IT
              await proxmox.stopVm(vps.node, vps.vmid);
              await prisma.vpsService.update({ where: { id: vps.id }, data: { status: 'STOPPED' } });
              results.push({ vpsId: vps.id, action: 'STOPPED', time: userTimeStr });
            } else if (realStatus === 'stopped' && vps.status !== 'STOPPED' && vps.status !== 'SUSPENDED') {
              // Real VM is stopped but DB says it's running -> AUTO CORRECT DB
              await prisma.vpsService.update({ where: { id: vps.id }, data: { status: 'STOPPED' } });
              results.push({ vpsId: vps.id, action: 'CORRECTED_DB_STOPPED', time: userTimeStr });
            }
          }
        } catch (err) {
          console.error(`Scheduler error for VPS ${vps.id}:`, err);
        }
      }));
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (error: any) {
    console.error('Cron VPS Scheduler Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
