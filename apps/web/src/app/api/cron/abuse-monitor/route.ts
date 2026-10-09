import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProxmoxClient } from '@/lib/proxmox';

export async function GET(req: Request) {
  // Security: Fail-closed auth via Authorization header only (never URL params to prevent log leakage)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
       return NextResponse.json({ error: 'No active Proxmox server configured' }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    const runningVps = await prisma.vpsService.findMany({
      where: { status: 'RUNNING' },
      include: { user: true }
    });

    let scannedCount = 0;
    let abusedCount = 0;

    for (const vps of runningVps) {
      if (!vps.vmid) continue;

      try {
        const rrdData = await proxmox.getRRDData(vps.node, vps.vmid, "hour");
        
        if (Array.isArray(rrdData) && rrdData.length > 0) {
           let totalCpu = 0;
           let validPoints = 0;

           for (const point of rrdData) {
              if (point.cpu !== undefined && point.cpu !== null) {
                 totalCpu += point.cpu;
                 validPoints++;
              }
           }

           if (validPoints > 0) {
              const avgCpu = totalCpu / validPoints;
              
              if (avgCpu > 0.95) {
                 console.log(`[ABUSE DETECTED] VMID ${vps.vmid} has average CPU of ${(avgCpu * 100).toFixed(2)}% over the last hour. Locking...`);
                 
                 // 1. Force Stop VM
                 try {
                    await proxmox.stopVm(vps.node, vps.vmid);
                 } catch (stopErr) {
                    console.error(`Failed to stop abusive VM ${vps.vmid}`, stopErr);
                 }
                 
                 // 2. Lock in DB
                 await prisma.vpsService.update({
                    where: { id: vps.id },
                    data: {
                       status: 'SUSPENDED',
                       suspendReason: '[ABUSE_LOCKED] VPS dimatikan otomatis karena aktivitas beban CPU sangat tinggi dan terus-menerus (> 95%) yang terindikasi sebagai Mining/Abuse. Silakan hubungi Admin.'
                    }
                 });

                 abusedCount++;
              }
           }
        }
        scannedCount++;
      } catch (e) {
         console.error(`Failed to check RRD data for VM ${vps.vmid}`, e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Abuse monitoring completed',
      scanned: scannedCount,
      suspended: abusedCount
    });

  } catch (error) {
    console.error('Abuse Monitor Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
