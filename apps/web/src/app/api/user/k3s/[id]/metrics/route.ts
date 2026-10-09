import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";
import { decryptDeterministic } from "@/lib/encryption";
import * as k8s from "@kubernetes/client-node";

function parseCpu(cpuStr: string): number {
  if (!cpuStr) return 0;
  if (cpuStr.endsWith('m')) return parseInt(cpuStr) / 1000;
  return parseFloat(cpuStr) || 0;
}

function parseMemory(memStr: string): number {
  if (!memStr) return 0;
  if (memStr.endsWith('Ki')) return parseInt(memStr) / (1024 * 1024);
  if (memStr.endsWith('Mi')) return parseInt(memStr) / 1024;
  if (memStr.endsWith('Gi')) return parseInt(memStr);
  if (memStr.endsWith('m')) return 0; 
  const bytes = parseInt(memStr);
  if (isNaN(bytes)) return 0;
  return bytes / (1024 * 1024 * 1024);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id: clusterIdStr } = await params;
    const clusterId = parseInt(clusterIdStr);
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "hour";

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { id: clusterId, userId: user.id },
      include: {
        nodes: true
      },
    });

    if (!cluster || cluster.nodes.length === 0) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "No active Proxmox server found" }, { status: 500 });
    }

    // Valid timeframes: hour, day, week, month, year
    const validTimeframes = ["hour", "day", "week", "month", "year"];
    const tf = validTimeframes.includes(timeframe) ? timeframe : "hour";

    // Fetch metrics for all nodes in the cluster
    const nodesMetrics = [];
    let totalStorageUsageBytes = 0;
    let totalStorageCapacityBytes = 0;
    
    for (const node of cluster.nodes) {
      if (node.status !== "RUNNING") continue;
      
      try {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        const rrdData = await proxmox.getRRDData(node.node, node.vmid!, tf);
        nodesMetrics.push({
          hostname: node.hostname,
          vmid: node.vmid,
          data: rrdData
        });

        // Use the exact purchased disk size for capacity
        totalStorageCapacityBytes += (node.diskGb * 1024 * 1024 * 1024);

        // Fetch actual disk usage from Guest Agent
        try {
           const fsInfo = await proxmox.getVmAgentFsInfo(node.node, node.vmid!);
           if (fsInfo && fsInfo.result && Array.isArray(fsInfo.result)) {
             let fsUsed = 0;
             const ignoredFsTypes = ['tmpfs', 'devtmpfs', 'squashfs', 'iso9660', 'overlay', 'ramfs'];
             fsInfo.result.forEach((fs: any) => {
               if (fs['total-bytes'] && fs['used-bytes'] && !ignoredFsTypes.includes(fs.fstype)) {
                 fsUsed += fs['used-bytes'];
               }
             });
             totalStorageUsageBytes += fsUsed;
           }
        } catch (e) {
           // Ignore guest agent errors
        }
      } catch (err) {
        console.error(`Failed to fetch metrics for K3s node ${node.hostname}:`, err);
      }
    }

    // Fetch Cluster Resources from Kubeconfig
    let clusterMetrics = {
      cpu: { usage: 0, capacity: 0 },
      memory: { usageGb: 0, capacityGb: 0 },
      pods: { usage: 0, capacity: 0 },
      storage: { usageGb: 0, capacityGb: 0 },
      components: {} as Record<string, boolean>,
      k8sNodes: [] as any[]
    };

    if (cluster.kubeconfig) {
      try {
        const decryptedKubeconfig = decryptDeterministic(cluster.kubeconfig);
        const kc = new k8s.KubeConfig();
        kc.loadFromString(decryptedKubeconfig);
        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

        const nodesRes = await k8sApi.listNode();
        
        // If we can reach listNode, the control plane is healthy
        clusterMetrics.components = {
           "kube-apiserver": true,
           "etcd": true,
           "scheduler": true,
           "controller-mgr": true
        };

        for (const n of nodesRes.items) {
          const alloc = n.status?.allocatable;
          if (alloc) {
            clusterMetrics.cpu.capacity += parseCpu(alloc.cpu);
            clusterMetrics.memory.capacityGb += parseMemory(alloc.memory);
            clusterMetrics.pods.capacity += parseInt(alloc.pods || "0");
          }
          clusterMetrics.k8sNodes.push({
            hostname: n.metadata?.name,
            labels: n.metadata?.labels || {},
            status: n.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady'
          });
        }

        const podsRes = await k8sApi.listPodForAllNamespaces();
        for (const p of podsRes.items) {
          if (p.status?.phase !== 'Running' && p.status?.phase !== 'Pending') continue;
          clusterMetrics.pods.usage += 1;
          p.spec?.containers?.forEach(c => {
            const req = c.resources?.requests;
            if (req) {
              clusterMetrics.cpu.usage += parseCpu(req.cpu || "0");
              clusterMetrics.memory.usageGb += parseMemory(req.memory || "0");
            }
          });
        }

        // We no longer rely on listComponentStatus because K3s doesn't implement it properly
        clusterMetrics.cpu.usage = parseFloat(clusterMetrics.cpu.usage.toFixed(2));
        clusterMetrics.cpu.capacity = parseFloat(clusterMetrics.cpu.capacity.toFixed(2));
        clusterMetrics.memory.usageGb = parseFloat(clusterMetrics.memory.usageGb.toFixed(2));
        clusterMetrics.memory.capacityGb = parseFloat(clusterMetrics.memory.capacityGb.toFixed(2));
        clusterMetrics.storage.usageGb = parseFloat((totalStorageUsageBytes / (1024 * 1024 * 1024)).toFixed(2));
        clusterMetrics.storage.capacityGb = parseFloat((totalStorageCapacityBytes / (1024 * 1024 * 1024)).toFixed(2));
      } catch (err) {
        console.error("Failed to fetch K8s metrics:", err);
      }
    }

    return NextResponse.json({ 
      ...clusterMetrics,
      nodes: nodesMetrics 
    });
  } catch (error: any) {
    console.error("Error fetching k3s metrics:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
