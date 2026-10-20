import { prisma } from "@/lib/prisma";
import { encryptDeterministic, decryptDeterministic } from "@/lib/encryption";
import { ProxmoxClient } from "./proxmox";

export class K3sProvisioningService {
  /**
   * Append a log message to the cluster's installLog in the database for realtime display.
   */
  private static logBuffer: Record<number, { ts: string; msg: string }[]> = {};
  private static logTimers: Record<number, NodeJS.Timeout> = {};

  static async appendLog(clusterId: number, rawMessage: string) {
    if (!this.logBuffer[clusterId]) this.logBuffer[clusterId] = [];

    const lines = rawMessage.split('\n');
    for (const line of lines) {
      const cleanLine = line.replace(/\r/g, '').trim();
      if (cleanLine) {
        this.logBuffer[clusterId].push({ ts: new Date().toISOString(), msg: cleanLine });
        console.log(`[K3s Log #${clusterId}] ${cleanLine}`);
      }
    }

    if (!this.logTimers[clusterId]) {
      this.logTimers[clusterId] = setTimeout(() => this.flushLogs(clusterId), 1000);
    }
  }

  static async flushLogs(clusterId: number) {
    const logs = this.logBuffer[clusterId];
    if (!logs || logs.length === 0) return;

    this.logBuffer[clusterId] = [];
    delete this.logTimers[clusterId];

    try {
      const cluster = await prisma.kubernetesCluster.findUnique({
        where: { id: clusterId },
        select: { installLog: true }
      });
      const currentLog: any[] = cluster?.installLog ? JSON.parse(cluster.installLog) : [];
      const newLog = [...currentLog, ...logs].slice(-500);

      await prisma.kubernetesCluster.update({
        where: { id: clusterId },
        data: { installLog: JSON.stringify(newLog) }
      });
    } catch (e) {
      console.error(`[K3s Log] Failed to flush logs to DB:`, e);
      this.logBuffer[clusterId] = [...logs, ...(this.logBuffer[clusterId] || [])];
      if (!this.logTimers[clusterId]) {
        this.logTimers[clusterId] = setTimeout(() => this.flushLogs(clusterId), 2000);
      }
    }
  }

  /**
   * Helper to execute a command inside a VM using QEMU Guest Agent / Cloud-Init,
   * polling until completion and streaming logs to the cluster installLog.
   */
  static async runGuestCommand(
    proxmox: ProxmoxClient,
    node: string,
    vmid: number,
    command: string,
    clusterId: number,
    description: string,
    timeoutSeconds: number = 360
  ): Promise<{ exitcode: number; stdout: string; stderr: string }> {
    await this.appendLog(clusterId, `[Cloud-Init / Agent] Starting: ${description}...`);

    const execRes = await proxmox.agentExecString(node, vmid, command);
    if (!execRes || !execRes.pid) {
      throw new Error(`Failed to initiate command via guest agent on VM ${vmid}`);
    }

    const startTime = Date.now();
    let lastHeartbeat = Date.now();

    while ((Date.now() - startTime) < timeoutSeconds * 1000) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      let status: any;
      try {
        status = await proxmox.getAgentExecStatus(node, vmid, execRes.pid);
      } catch (e: any) {
        // If the PID does not exist, QEMU Guest Agent reaped the process after fast completion
        if (e.message && (e.message.includes('does not exist') || e.message.includes('PID'))) {
          console.log(`[K3s Agent Poll] Process PID ${execRes.pid} on VM ${vmid} already reaped or exited.`);
          return { exitcode: 0, stdout: '', stderr: '' };
        }
        console.warn(`[K3s Agent Poll] Transient error on VM ${vmid}:`, e.message);
        continue;
      }

      if (status && status.exited === 1) {
        const stdout = status['out-data'] || '';
        const stderr = status['err-data'] || '';

        if (stdout.trim()) {
          await this.appendLog(clusterId, stdout.trim());
        }
        if (stderr.trim()) {
          await this.appendLog(clusterId, `[stderr] ${stderr.trim()}`);
        }

        if (status.exitcode !== 0) {
          throw new Error(`Command failed with exit code ${status.exitcode}: ${stderr || stdout}`);
        }

        return { exitcode: status.exitcode, stdout, stderr };
      }

      // Heartbeat every 15 seconds so UI feels responsive
      if (Date.now() - lastHeartbeat > 15000) {
        lastHeartbeat = Date.now();
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        await this.appendLog(clusterId, `[Cloud-Init] ${description} in progress... (${elapsed}s elapsed)`);
      }
    }

    throw new Error(`Timed out after ${timeoutSeconds}s waiting for: ${description}`);
  }

  /**
   * Wait for QEMU Guest Agent and Cloud-Init to be fully ready on the VM.
   */
  static async waitForGuestReady(
    proxmox: ProxmoxClient,
    node: string,
    vmid: number,
    clusterId: number,
    maxAttempts: number = 60 // 60 * 5s = 5 minutes
  ): Promise<void> {
    await this.appendLog(clusterId, `Waiting for VM ${vmid} cloud-init and hypervisor guest agent...`);

    let agentReady = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const pingRes = await proxmox.agentExecString(node, vmid, "echo ready");
        if (pingRes && pingRes.pid) {
          agentReady = true;
          break;
        }
      } catch (err: any) {
        if (attempt % 4 === 0) {
          await this.appendLog(clusterId, `VM ${vmid} booting and initializing cloud-init... (${attempt}/${maxAttempts})`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (!agentReady) {
      throw new Error(`Guest agent did not respond on VM ${vmid} within ${maxAttempts * 5}s`);
    }

    // Ensure swapfile exists (2GB) so memory starvation does not freeze SQLite/Kine on 1GB nodes
    try {
      await this.runGuestCommand(
        proxmox,
        node,
        vmid,
        `if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null; chmod 600 /swapfile; mkswap /swapfile; swapon /swapfile; grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi`,
        clusterId,
        "Ensuring 2GB memory swap configuration",
        60
      );
    } catch (e: any) {
      console.warn(`[K3s Provisioning] Swap creation notice on VM ${vmid}:`, e.message);
    }

    await this.appendLog(clusterId, `Guest agent online on VM ${vmid}. Verifying cloud-init status...`);

    // Verify cloud-init without hanging
    for (let i = 0; i < 15; i++) {
      try {
        const ciRes = await proxmox.agentExecString(node, vmid, "cloud-init status 2>&1");
        await new Promise(r => setTimeout(r, 2000));
        const st = await proxmox.getAgentExecStatus(node, vmid, ciRes.pid);
        const out = (st?.['out-data'] || '').toLowerCase();
        if (out.includes("done") || out.includes("error")) {
          break;
        }
      } catch (e) {
        break;
      }
    }
  }

  /**
   * Install K3s on a VM using Cloud-Init / QEMU Guest Agent (SSH-Free).
   */
  static async installK3s(
    vpsId: number,
    clusterId: number,
    ipAddress: string,
    rootPassword?: string,
    role: "MASTER" | "WORKER" = "MASTER"
  ) {
    await K3sProvisioningService.appendLog(clusterId, `Starting K3s ${role} provisioning via Cloud-Init on ${ipAddress || 'VPC internal'}...`);

    try {
      const vps = await prisma.vpsService.findUnique({ where: { id: vpsId } });
      if (!vps || !vps.vmid) throw new Error("VPS or VMID not found");

      const cluster = await prisma.kubernetesCluster.findUnique({ where: { id: clusterId } });
      if (!cluster) throw new Error("Kubernetes cluster record not found");

      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (!server) throw new Error("No active Proxmox server configured");

      const proxmox = new ProxmoxClient(server.host, server.tokenId, decryptDeterministic(server.tokenSecret));

      const vpcIp = vps.vpcIp;
      if (!vpcIp) {
        await K3sProvisioningService.appendLog(clusterId, `Notice: No VPC IP found for node ${vpsId}. Cluster communication will use primary IP.`);
      }

      // Extract version channel (e.g. "v1.31")
      const k3sChannel = cluster.version || "v1.31";

      if (role === "MASTER") {
        await prisma.kubernetesCluster.update({
          where: { id: clusterId },
          data: { status: "WAITING_FOR_CLOUD_INIT" }
        });
      }

      // 1. Wait for Cloud-Init and Guest Agent to be ready
      await this.waitForGuestReady(proxmox, vps.node, vps.vmid, clusterId);

      // 2. Install K3s
      if (role === "MASTER") {
        await prisma.kubernetesCluster.update({
          where: { id: clusterId },
          data: { status: "INSTALLING_K3S" }
        });
      }
      await K3sProvisioningService.appendLog(clusterId, `Installing K3s ${k3sChannel} as ${role} via Cloud-Init...`);

      if (role === "MASTER") {
        const masterHostname = vps.hostname || `master-${vps.vmid}`;
        await this.runGuestCommand(
          proxmox,
          vps.node,
          vps.vmid,
          `hostnamectl set-hostname ${masterHostname}`,
          clusterId,
          `Configuring master hostname (${masterHostname})`,
          30
        );

        const nodeIpArg = vpcIp ? `--node-ip ${vpcIp} --flannel-iface eth1` : '';
        const masterInstallCmd = `curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL='${k3sChannel}' INSTALL_K3S_EXEC='server --tls-san ${ipAddress} ${nodeIpArg} --disable traefik --disable servicelb --write-kubeconfig-mode 644' sh -`;

        await this.runGuestCommand(
          proxmox,
          vps.node,
          vps.vmid,
          masterInstallCmd,
          clusterId,
          `K3s Server (${k3sChannel}) installation`,
          360
        );

        // Ensure kubectl is in the default PATH for VNC/console logins
        await this.runGuestCommand(
          proxmox,
          vps.node,
          vps.vmid,
          `ln -sf /usr/local/bin/kubectl /usr/bin/kubectl && ln -sf /usr/local/bin/crictl /usr/bin/crictl && (grep -q KUBECONFIG ~/.bashrc || echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc)`,
          clusterId,
          "Configuring kubectl and crictl system aliases",
          60
        );

        // 3. Fetch Kubeconfig via Guest Agent
        await K3sProvisioningService.appendLog(clusterId, `Reading kubeconfig from master node via Cloud-Init...`);
        let kubeconfigRaw = "";
        for (let attempt = 1; attempt <= 10; attempt++) {
          try {
            const fileRes = await proxmox.agentFileRead(vps.node, vps.vmid, "/etc/rancher/k3s/k3s.yaml");
            if (fileRes && fileRes.content && fileRes.content.includes("apiVersion")) {
              kubeconfigRaw = fileRes.content;
              break;
            }
          } catch (e: any) {
            // file not written yet
          }
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (!kubeconfigRaw) {
          throw new Error("Failed to read kubeconfig from master node. K3s may still be starting.");
        }

        // 4. Fetch Node Token via Guest Agent
        await K3sProvisioningService.appendLog(clusterId, `Reading node token from master node via Cloud-Init...`);
        let masterNodeToken = "";
        for (let attempt = 1; attempt <= 10; attempt++) {
          try {
            const tokenRes = await proxmox.agentFileRead(vps.node, vps.vmid, "/var/lib/rancher/k3s/server/node-token");
            if (tokenRes && tokenRes.content && tokenRes.content.trim()) {
              masterNodeToken = tokenRes.content.trim();
              break;
            }
          } catch (e: any) {
            // token not written yet
          }
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (!masterNodeToken) {
          throw new Error("Failed to read node token from master node.");
        }

        const safeClusterName = cluster.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        let kubeconfig = kubeconfigRaw;
        kubeconfig = kubeconfig.replace(/name: default/g, `name: ${safeClusterName}`);
        kubeconfig = kubeconfig.replace(/cluster: default/g, `cluster: ${safeClusterName}`);
        kubeconfig = kubeconfig.replace(/user: default/g, `user: ${safeClusterName}`);
        kubeconfig = kubeconfig.replace(/current-context: default/g, `current-context: ${safeClusterName}`);
        const kubeconfigToSave = kubeconfig.replace(/127\.0\.0\.1/g, ipAddress);
        const endpointToSave = `https://${ipAddress}:6443`;

        await prisma.kubernetesCluster.update({
          where: { id: clusterId },
          data: {
            kubeconfig: encryptDeterministic(kubeconfigToSave),
            nodeToken: masterNodeToken,
            endpoint: endpointToSave,
            status: "RUNNING"
          }
        });

        await K3sProvisioningService.appendLog(clusterId, `Cluster is now RUNNING! Kubeconfig saved to your panel.`);

      } else {
        // WORKER ROLE
        let masterNodeToken = cluster.nodeToken;
        let masterEndpoint = cluster.endpoint;
        let masterVpcIp: string | null = null;

        const masterVps = await prisma.vpsService.findFirst({
          where: { kubernetesClusterId: clusterId, kubernetesRole: "MASTER" },
          include: { assignedIps: { include: { ipPool: true } } }
        });

        if (!masterVps || !masterVps.vmid) {
          throw new Error("Master node VPS not found or not provisioned. Cannot join worker.");
        }
        masterVpcIp = masterVps.vpcIp;

        if (!masterNodeToken || !masterEndpoint) {
          await K3sProvisioningService.appendLog(clusterId, `Fetching master node token via Cloud-Init...`);
          const tokenRes = await proxmox.agentFileRead(masterVps.node, masterVps.vmid, "/var/lib/rancher/k3s/server/node-token");
          if (!tokenRes || !tokenRes.content) {
            throw new Error("Failed to read node-token from master VM");
          }
          masterNodeToken = tokenRes.content.trim();
          const masterPrimaryIp = masterVps.assignedIps.length > 0 ? masterVps.assignedIps[0].ipAddress : (masterVpcIp || ipAddress);
          masterEndpoint = `https://${masterPrimaryIp}:6443`;

          await prisma.kubernetesCluster.update({
            where: { id: clusterId },
            data: { nodeToken: masterNodeToken, endpoint: masterEndpoint }
          });
        }

        const workerHostname = vps.hostname || `worker-${vps.vmid}`;
        await this.runGuestCommand(
          proxmox,
          vps.node,
          vps.vmid,
          `hostnamectl set-hostname ${workerHostname} && (systemctl stop k3s-agent 2>/dev/null || true) && rm -rf /etc/rancher/node/password /var/lib/rancher/k3s/agent`,
          clusterId,
          `Preparing worker node identity (${workerHostname})`,
          60
        );

        const joinIp = masterVpcIp || masterEndpoint.replace("https://", "").replace(":6443", "");
        const nodeIpArg = vpcIp ? `--node-ip ${vpcIp} --flannel-iface eth1` : '';
        const workerJoinCmd = `curl -sfL https://get.k3s.io | K3S_URL=https://${joinIp}:6443 K3S_TOKEN=${masterNodeToken} INSTALL_K3S_CHANNEL='${k3sChannel}' INSTALL_K3S_EXEC='agent ${nodeIpArg} --node-name ${workerHostname} --with-node-id' sh -`;

        await this.runGuestCommand(
          proxmox,
          vps.node,
          vps.vmid,
          workerJoinCmd,
          clusterId,
          `K3s Worker join to cluster via Cloud-Init`,
          360
        );

        await K3sProvisioningService.appendLog(clusterId, `Worker node successfully joined cluster ${cluster.name}.`);
      }

      // Update VPS status to RUNNING
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: { status: "RUNNING" }
      });

      await K3sProvisioningService.appendLog(clusterId, `Node ${role} provisioned successfully on ${ipAddress || 'VPC network'}.`);

    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await K3sProvisioningService.appendLog(clusterId, `ERROR: ${errMsg}`);
      console.error("[K3s Provisioning] Error during installation:", err);
      if (role === "MASTER") {
        await prisma.kubernetesCluster.update({
          where: { id: clusterId },
          data: { status: "FAILED" }
        });
      }
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: { status: "FAILED", suspendReason: errMsg }
      });
    }
  }
}
