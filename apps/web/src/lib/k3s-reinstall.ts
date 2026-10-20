import { prisma } from "@/lib/prisma";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { K3sProvisioningService } from "@/lib/k3s-provisioning";
import { ProxmoxClient } from "./proxmox";

export async function reinstallK3sCluster(payload: any) {
  const { clusterId, version, ipAddress, masterVpcIp } = payload;

  const cluster = await prisma.kubernetesCluster.findUnique({
    where: { id: clusterId },
    include: { nodes: { include: { assignedIps: true } } }
  });
  if (!cluster) throw new Error("Cluster not found");

  const masterNode = cluster.nodes.find(n => n.kubernetesRole === "MASTER" || !n.kubernetesRole);
  if (!masterNode || !masterNode.vmid) {
    throw new Error("Master node VPS not found for cluster");
  }

  const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
  if (!server) throw new Error("No active Proxmox server configured");

  const proxmox = new ProxmoxClient(server.host, server.tokenId, decryptDeterministic(server.tokenSecret));

  try {
    // 1. Uninstall existing K3s on Master Node
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Uninstalling previous K3s on master node (${masterNode.vmid}) via Cloud-Init...`);
    try {
      await K3sProvisioningService.runGuestCommand(
        proxmox,
        masterNode.node,
        masterNode.vmid,
        `if [ -f /usr/local/bin/k3s-uninstall.sh ]; then /usr/local/bin/k3s-uninstall.sh; fi; rm -rf /etc/rancher /var/lib/rancher`,
        cluster.id,
        "Cleaning old K3s installation",
        120
      );
    } catch (e: any) {
      await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Notice during uninstall: ${e.message}`);
    }

    // Ensure swap and master hostname
    try {
      const masterHostname = masterNode.hostname || `master-${masterNode.vmid}`;
      await K3sProvisioningService.runGuestCommand(
        proxmox,
        masterNode.node,
        masterNode.vmid,
        `if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null; chmod 600 /swapfile; mkswap /swapfile; swapon /swapfile; grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi; hostnamectl set-hostname ${masterHostname}`,
        cluster.id,
        "Ensuring master memory swap and hostname",
        60
      );
    } catch (e: any) {}

    // 2. Install fresh K3s with new version on Master Node
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Installing K3s ${version} on master node via Cloud-Init...`);
    const nodeIpArg = masterVpcIp ? `--node-ip ${masterVpcIp} --flannel-iface eth1` : '';
    const masterInstallCmd = `curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL='${version}' INSTALL_K3S_EXEC='server --tls-san ${ipAddress} ${nodeIpArg} --disable traefik --disable servicelb --write-kubeconfig-mode 644' sh -`;

    await K3sProvisioningService.runGuestCommand(
      proxmox,
      masterNode.node,
      masterNode.vmid,
      masterInstallCmd,
      cluster.id,
      `Installing K3s ${version} Server`,
      360
    );

    // 3. Configure kubectl and crictl system paths
    await K3sProvisioningService.runGuestCommand(
      proxmox,
      masterNode.node,
      masterNode.vmid,
      `ln -sf /usr/local/bin/kubectl /usr/bin/kubectl && ln -sf /usr/local/bin/crictl /usr/bin/crictl && (grep -q KUBECONFIG ~/.bashrc || echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc)`,
      cluster.id,
      "Setting up kubectl shortcuts",
      60
    );

    // 4. Fetch new Kubeconfig via Guest Agent
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Fetching new kubeconfig via Cloud-Init...`);
    let newKubeconfig = "";
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        const fileRes = await proxmox.agentFileRead(masterNode.node, masterNode.vmid, "/etc/rancher/k3s/k3s.yaml");
        if (fileRes && fileRes.content && fileRes.content.includes("apiVersion")) {
          newKubeconfig = fileRes.content;
          break;
        }
      } catch (e: any) {}
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

    // 5. Fetch new Node Token via Guest Agent
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Fetching new node token from master node...`);
    let nodeToken = "";
    for (let attempt = 1; attempt <= 10; attempt++) {
      try {
        const tokenRes = await proxmox.agentFileRead(masterNode.node, masterNode.vmid, "/var/lib/rancher/k3s/server/node-token");
        if (tokenRes && tokenRes.content && tokenRes.content.trim()) {
          nodeToken = tokenRes.content.trim();
          break;
        }
      } catch (e: any) {}
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!nodeToken) {
      throw new Error("Failed to read new node token from master node");
    }

    const endpointToSave = `https://${ipAddress}:6443`;
    const workerNodes = cluster.nodes.filter(n => n.kubernetesRole === "WORKER");

    // Update cluster in DB
    await prisma.kubernetesCluster.update({
      where: { id: cluster.id },
      data: {
        kubeconfig: encryptDeterministic(newKubeconfig),
        nodeToken: nodeToken,
        endpoint: endpointToSave,
        version: version,
        status: workerNodes.length === 0 ? "RUNNING" : "INSTALLING_K3S"
      }
    });

    await prisma.vpsService.update({
      where: { id: masterNode.id },
      data: { status: "RUNNING" }
    });

    // 6. Reinstall Worker Nodes via Cloud-Init
    if (workerNodes.length > 0) {
      await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Reinstalling ${workerNodes.length} worker node(s) via Cloud-Init...`);
      for (const worker of workerNodes) {
        if (!worker.vmid) {
          await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Skipping worker node (VMID missing).`);
          continue;
        }

        try {
          await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Cleaning worker node ${worker.hostname || worker.vmid}...`);
          try {
            await K3sProvisioningService.runGuestCommand(
              proxmox,
              worker.node,
              worker.vmid,
              `if [ -f /usr/local/bin/k3s-agent-uninstall.sh ]; then /usr/local/bin/k3s-agent-uninstall.sh; fi; rm -rf /etc/rancher /var/lib/rancher`,
              cluster.id,
              `Uninstalling previous K3s agent on worker ${worker.hostname || worker.vmid}`,
              120
            );
          } catch (e) {}

          const workerHost = worker.hostname || `worker-${worker.vmid}`;
          await K3sProvisioningService.runGuestCommand(
            proxmox,
            worker.node,
            worker.vmid,
            `if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null; chmod 600 /swapfile; mkswap /swapfile; swapon /swapfile; grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi; hostnamectl set-hostname ${workerHost} && rm -rf /etc/rancher/node/password /var/lib/rancher/k3s/agent`,
            cluster.id,
            `Setting worker hostname and swap (${workerHost})`,
            60
          );

          const workerNodeIpArg = worker.vpcIp ? `--node-ip ${worker.vpcIp} --flannel-iface eth1` : '';
          const joinIp = masterVpcIp || ipAddress;
          const workerJoinCmd = `curl -sfL https://get.k3s.io | K3S_URL=https://${joinIp}:6443 K3S_TOKEN=${nodeToken} INSTALL_K3S_CHANNEL='${version}' INSTALL_K3S_EXEC='agent ${workerNodeIpArg} --node-name ${workerHost} --with-node-id' sh -`;

          await K3sProvisioningService.runGuestCommand(
            proxmox,
            worker.node,
            worker.vmid,
            workerJoinCmd,
            cluster.id,
            `Rejoining worker ${worker.hostname || worker.vmid} to cluster via Cloud-Init`,
            360
          );

          await prisma.vpsService.update({
            where: { id: worker.id },
            data: { status: "RUNNING" }
          });

          await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Worker node ${worker.hostname || worker.vmid} rejoined successfully.`);
        } catch (workerErr: any) {
          await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Error on worker ${worker.hostname || worker.vmid}: ${workerErr.message}`);
          await prisma.vpsService.update({
            where: { id: worker.id },
            data: { status: "FAILED", suspendReason: workerErr.message }
          });
        }
      }
    }

    await prisma.kubernetesCluster.update({
      where: { id: cluster.id },
      data: { status: "RUNNING" }
    });

    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Cluster reinstallation completed successfully. Cluster is RUNNING!`);

  } catch (error: any) {
    const errMsg = error.message || String(error);
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] CRITICAL ERROR: ${errMsg}`);
    await prisma.kubernetesCluster.update({
      where: { id: cluster.id },
      data: { status: "FAILED" }
    });
    throw error;
  }
}
