import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { ProxmoxClient } from "@/lib/proxmox";
import { K3sProvisioningService } from "@/lib/k3s-provisioning";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) return NextResponse.json({ error: "Invalid cluster ID" }, { status: 400 });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { 
        id: clusterId,
        userId: auth.userId 
      },
      include: {
        nodes: {
          include: { assignedIps: true }
        }
      }
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Find the master node
    const masterNode = cluster.nodes.find(n => n.kubernetesRole === "MASTER" || !n.kubernetesRole);
    if (!masterNode || !masterNode.vmid) {
      return NextResponse.json({ error: "Master node not found" }, { status: 404 });
    }
    
    if (masterNode.status === "SUSPENDED" || masterNode.status === "TERMINATED") {
      return NextResponse.json({ error: "Cannot rotate certificates because the master node is suspended or terminated." }, { status: 403 });
    }

    const ipAddress = masterNode.assignedIps?.find(ip => ip.isPrimary)?.ipAddress || masterNode.assignedIps?.[0]?.ipAddress || masterNode.vpcIp;
    if (!ipAddress) {
      return NextResponse.json({ error: "Master node has no IP address assigned" }, { status: 400 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, decryptDeterministic(server.tokenSecret));

    try {
      // 1. Rotate certificates via Cloud-Init / Guest Agent
      await K3sProvisioningService.runGuestCommand(
        proxmox,
        masterNode.node,
        masterNode.vmid,
        "/usr/local/bin/k3s certificate rotate",
        cluster.id,
        "Rotating K3s certificates",
        60
      );

      // 2. Restart K3s service to apply new certs
      await K3sProvisioningService.runGuestCommand(
        proxmox,
        masterNode.node,
        masterNode.vmid,
        "systemctl restart k3s",
        cluster.id,
        "Restarting K3s service",
        60
      );

      // Wait a moment for k3s.yaml to refresh
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Fetch new Kubeconfig via Guest Agent
      let newKubeconfig = "";
      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          const fileRes = await proxmox.agentFileRead(masterNode.node, masterNode.vmid, "/etc/rancher/k3s/k3s.yaml");
          if (fileRes && fileRes.content && fileRes.content.includes("apiVersion")) {
            newKubeconfig = fileRes.content;
            break;
          }
        } catch (e) {}
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      if (!newKubeconfig) {
        throw new Error("Failed to read new kubeconfig from master node");
      }

      const safeClusterName = cluster.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      newKubeconfig = newKubeconfig.replace(/name: default/g, `name: ${safeClusterName}`);
      newKubeconfig = newKubeconfig.replace(/cluster: default/g, `cluster: ${safeClusterName}`);
      newKubeconfig = newKubeconfig.replace(/user: default/g, `user: ${safeClusterName}`);
      newKubeconfig = newKubeconfig.replace(/current-context: default/g, `current-context: ${safeClusterName}`);
      newKubeconfig = newKubeconfig.replace(/127\.0\.0\.1/g, ipAddress);

      // Update cluster in DB
      await prisma.kubernetesCluster.update({
        where: { id: cluster.id },
        data: {
          kubeconfig: encryptDeterministic(newKubeconfig)
        }
      });

      return NextResponse.json({ success: true, message: "Certificates rotated successfully via Cloud-Init" });
    } catch (err: any) {
      console.error("Rotation Error:", err);
      return NextResponse.json({ error: `Rotation failed: ${err.message}` }, { status: 500 });
    }
  } catch (error) {
    console.error("Rotate K3s certs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
