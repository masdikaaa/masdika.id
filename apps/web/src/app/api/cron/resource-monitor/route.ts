import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProxmoxClient } from '@/lib/proxmox';
import { sendResourceAlertEmail } from '@/lib/email';

export async function GET(req: Request) {
  try {
    // Authenticate cron requests via secret header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Running Resource Monitor Cron...");

    const activeRules = await prisma.vpsAlertRule.findMany({
      where: { isEnabled: true },
      include: { vps: true }
    });

    if (activeRules.length === 0) {
      return NextResponse.json({ success: true, message: "No active alert rules found." });
    }

    // Group rules by node to minimize API calls
    const rulesByNode: Record<string, typeof activeRules> = {};
    for (const rule of activeRules) {
      if (rule.vps.status !== "RUNNING") continue; // Only monitor running instances
      const node = rule.vps.node;
      if (!rulesByNode[node]) rulesByNode[node] = [];
      rulesByNode[node].push(rule);
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: 'No active Proxmox server found' }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    let alertsSent = 0;
    
    // Array to hold promises for concurrent execution
    const alertPromises: Promise<void>[] = [];

    for (const node of Object.keys(rulesByNode)) {
      try {
        // Fetch ALL vms on this node in one API call
        const vms = await proxmox.getVms(node);
        // Create a fast lookup map: vmid -> vm stats
        const vmStats = new Map(vms.map((vm: any) => [vm.vmid, vm]));

        for (const rule of rulesByNode[node]) {
          const stats = vmStats.get(rule.vps.vmid) as any;
          if (!stats) continue; // VM not found on Proxmox or turned off

          let currentUsage = 0;
          
          if (rule.metric === "CPU" && stats.cpu !== undefined) {
            currentUsage = stats.cpu * 100; // Proxmox returns cpu as 0.0 to 1.0
          } else if (rule.metric === "RAM" && stats.maxmem > 0) {
            currentUsage = (stats.mem / stats.maxmem) * 100;
          } else if (rule.metric === "DISK" && stats.maxdisk > 0) {
            currentUsage = (stats.disk / stats.maxdisk) * 100;
          }

          if (currentUsage >= rule.threshold) {
            // Check Cooldown (1 Hour)
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            if (!rule.lastTriggeredAt || rule.lastTriggeredAt < oneHourAgo) {
              
              const emails = rule.notifyEmails.split(',').map(e => e.trim()).filter(e => e);
              if (emails.length > 0) {
                // Add to concurrent processing queue instead of blocking
                const promise = (async () => {
                  try {
                    await sendResourceAlertEmail(emails, rule.vps.hostname, rule.metric, currentUsage, rule.threshold);
                    alertsSent++;
                    
                    // Update lastTriggeredAt
                    await prisma.vpsAlertRule.update({
                      where: { id: rule.id },
                      data: { lastTriggeredAt: new Date() }
                    });
                  } catch (emailErr) {
                    console.error(`Failed to send email for rule ${rule.id}:`, emailErr);
                  }
                })();
                alertPromises.push(promise);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Failed to process metrics for node ${node}:`, err);
      }
    }

    // Process all emails and DB updates concurrently
    // Use Promise.allSettled so if one fails, others still complete
    await Promise.allSettled(alertPromises);

    return NextResponse.json({ success: true, alertsSent });
  } catch (error: any) {
    console.error('Resource Monitor Cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
