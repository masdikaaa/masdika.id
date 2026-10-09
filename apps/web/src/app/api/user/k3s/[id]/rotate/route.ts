import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { NodeSSH } from "node-ssh";
import fs from "fs";
import path from "path";

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

    // Find the master node to SSH into
    const masterNode = cluster.nodes.find(n => n.kubernetesRole === "MASTER" || !n.kubernetesRole);
    if (!masterNode) {
      return NextResponse.json({ error: "Master node not found" }, { status: 404 });
    }
    
    if (masterNode.status === "SUSPENDED" || masterNode.status === "TERMINATED") {
      return NextResponse.json({ error: "Cannot rotate certificates because the master node is suspended or terminated." }, { status: 403 });
    }

    const ipAddress = masterNode.assignedIps?.find(ip => ip.isPrimary)?.ipAddress || masterNode.assignedIps?.[0]?.ipAddress;
    if (!ipAddress) {
      return NextResponse.json({ error: "Master node has no IP address assigned" }, { status: 400 });
    }

    const ssh = new NodeSSH();
    let privateKey: string | undefined;
    try {
      const systemKeyPath = path.join(process.cwd(), "storage", "ssh", "id_rsa");
      if (fs.existsSync(systemKeyPath)) {
        privateKey = fs.readFileSync(systemKeyPath, "utf-8");
      }
    } catch (err) {
      console.warn("Could not load system private key for SSH:", err);
    }

    try {
      await ssh.connect({
        host: ipAddress,
        username: masterNode.username || 'root',
        password: privateKey ? undefined : decryptDeterministic(masterNode.rootPassword),
        privateKey: privateKey,
        readyTimeout: 10000,
        tryKeyboard: true,
      });

      // 1. Rotate certificates
      const rotateRes = await ssh.execCommand("sudo /usr/local/bin/k3s certificate rotate");
      if (rotateRes.code !== 0 && rotateRes.code !== null) {
        throw new Error(`Rotation failed (code ${rotateRes.code}): stderr: ${rotateRes.stderr} | stdout: ${rotateRes.stdout}`);
      }

      // 2. Restart K3s service to apply new certs
      await ssh.execCommand("sudo systemctl restart k3s");

      // Wait a bit for the service to generate new kubeconfig and come back up
      await new Promise(resolve => setTimeout(resolve, 15000));

      // 3. Fetch new Kubeconfig
      const kubeconfigRes = await ssh.execCommand("sudo cat /etc/rancher/k3s/k3s.yaml");
      if (kubeconfigRes.code !== 0 && kubeconfigRes.code !== null) {
        throw new Error(`Failed to read new kubeconfig`);
      }

      let newKubeconfig = kubeconfigRes.stdout;
      
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

      ssh.dispose();

      return NextResponse.json({ success: true, message: "Certificates rotated successfully" });
    } catch (err: any) {
      ssh.dispose();
      console.error("SSH/Rotation Error:", err);
      return NextResponse.json({ error: `Rotation failed: ${err.message}` }, { status: 500 });
    }
  } catch (error) {
    console.error("Rotate K3s certs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
