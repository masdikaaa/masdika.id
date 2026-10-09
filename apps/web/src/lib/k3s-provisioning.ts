import { prisma } from "@/lib/prisma";
import { NodeSSH } from "node-ssh";
import { encryptDeterministic } from "@/lib/encryption";
import { ProxmoxClient } from "./proxmox";
import fs from "fs";
import path from "path";

export class K3sProvisioningService {
  /**
   * Append a log message to the cluster's installLog in the database for realtime display.
   */
  private static logBuffer: Record<number, {ts: string, msg: string}[]> = {};
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
   * Install K3s on a remote VM via SSH and retrieve the kubeconfig.
   * This is meant to be called after the VM is booted.
   */
  static async installK3s(
    vpsId: number, 
    clusterId: number, 
    ipAddress: string, 
    rootPassword: string,
    role: "MASTER" | "WORKER" = "MASTER"
  ) {
    await K3sProvisioningService.appendLog(clusterId, `Starting K3s ${role} installation on ${ipAddress}...`);
    
    try {
      const vps = await prisma.vpsService.findUnique({ where: { id: vpsId } });
      if (!vps || !vps.vmid) throw new Error("VPS or VMID not found");

      const cluster = await prisma.kubernetesCluster.findUnique({ where: { id: clusterId } });
      if (!cluster) throw new Error("Kubernetes cluster record not found");

      const vpcIp = vps.vpcIp;
      if (!vpcIp) {
        await K3sProvisioningService.appendLog(clusterId, `Warning: No VPC IP found for VPS ${vpsId}. Cluster communication might use public IP.`);
      }

      // Extract version channel (e.g. "v1.31")
      const k3sChannel = cluster.version || "v1.31";

      const ssh = new NodeSSH();
      
      // Load system private key if available
      let privateKey: string | undefined;
      try {
        const systemKeyPath = path.join(process.cwd(), "storage", "ssh", "id_rsa");
        if (fs.existsSync(systemKeyPath)) {
          privateKey = fs.readFileSync(systemKeyPath, "utf-8");
        }
      } catch (err) {
        console.warn("Could not load system private key for SSH:", err);
      }

      // 1. Connect via SSH (max 30 attempts, 10 seconds apart)
      if (role === "MASTER") {
        await prisma.kubernetesCluster.update({
          where: { id: clusterId },
          data: { status: "WAITING_FOR_SSH" }
        });
      }

      await K3sProvisioningService.appendLog(clusterId, `Waiting for SSH on ${ipAddress}... (up to 5 minutes)`);

      let sshReady = false;
      const sshUsername = vps.username || 'root';
      const sudoPrefix = sshUsername === 'root' ? '' : 'sudo ';
      let sshConnected = new NodeSSH();

      for (let i = 0; i < 30; i++) {
        try {
          await sshConnected.connect({
            host: ipAddress,
            username: sshUsername,
            password: rootPassword,
            privateKey: privateKey,
            readyTimeout: 10000,
            tryKeyboard: true,
          });
          sshReady = true;
          break;
        } catch (err: any) {
          await K3sProvisioningService.appendLog(clusterId, `SSH not ready yet (attempt ${i + 1}/30): ${err.message}. Retrying in 10s...`);

          if (err.message && err.message.includes("authentication methods failed") && privateKey) {
            try {
              await K3sProvisioningService.appendLog(clusterId, `Retrying without private key (using password only)...`);
              await sshConnected.connect({
                host: ipAddress,
                username: sshUsername,
                password: rootPassword,
                readyTimeout: 10000,
                tryKeyboard: true,
              });
              sshReady = true;
              break;
            } catch(e2: any) {
              await K3sProvisioningService.appendLog(clusterId, `Password auth also failed: ${e2.message}`);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }

      if (!sshReady) {
        throw new Error("Failed to connect via SSH after multiple attempts");
      }

      await K3sProvisioningService.appendLog(clusterId, `SSH connected to ${ipAddress} successfully.`);

      if (role === "MASTER") {
        await prisma.kubernetesCluster.update({
          where: { id: clusterId },
          data: { status: "INSTALLING_K3S" }
        });
      }

      // 2. Install K3s
      await K3sProvisioningService.appendLog(clusterId, `Installing K3s ${k3sChannel} as ${role}... (this may take 2-5 minutes)`);

      let installRes: any = { code: 0, stdout: "", stderr: "" };
      if (role === "MASTER") {
        const nodeIpArg = vpcIp ? `--node-ip ${vpcIp} --flannel-iface eth1` : '';
        try {
          installRes = await sshConnected.execCommand(
            `curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL='${k3sChannel}' INSTALL_K3S_EXEC='server --tls-san ${ipAddress} ${nodeIpArg}' sh -`,
            {
              onStdout: (chunk) => K3sProvisioningService.appendLog(clusterId, chunk.toString("utf8")),
              onStderr: (chunk) => K3sProvisioningService.appendLog(clusterId, chunk.toString("utf8"))
            }
          );
        } catch (err: any) {
          installRes.stderr = err.message || "Connection reset";
        }
      } else {
        let masterNodeToken = cluster.nodeToken;
        let masterEndpoint = cluster.endpoint;
        let masterVpcIp: string | null = null;

        if (!masterNodeToken || !masterEndpoint) {
          await K3sProvisioningService.appendLog(clusterId, `Master node token/endpoint missing in DB, fetching dynamically...`);
          const masterVps = await prisma.vpsService.findFirst({
            where: { kubernetesClusterId: clusterId, kubernetesRole: "MASTER" },
            include: { assignedIps: { include: { ipPool: true } } }
          });
          if (!masterVps) {
            throw new Error("Master node VPS not found. Cannot join worker.");
          }
          masterVpcIp = masterVps.vpcIp;
          const masterIpAddr = masterVps.assignedIps.length > 0 ? masterVps.assignedIps[0].ipAddress : (masterVpcIp || ipAddress);
          
          const masterSsh = new NodeSSH();
          const { decryptDeterministic } = require("@/lib/encryption");
          const masterPassword = decryptDeterministic(masterVps.rootPassword) || masterVps.rootPassword;
          
          const masterSshUsername = masterVps.username || 'root';
          const masterSudoPrefix = masterSshUsername === 'root' ? '' : 'sudo ';
          try {
            await masterSsh.connect({
              host: masterIpAddr,
              username: masterSshUsername,
              password: masterPassword,
              privateKey: privateKey,
              readyTimeout: 10000,
              tryKeyboard: true,
            });
            
            const tokenRes = await masterSsh.execCommand(`${masterSudoPrefix}cat /var/lib/rancher/k3s/server/node-token`);
            if (tokenRes.code !== 0 && tokenRes.code !== null) throw new Error("Failed to read node token from master");
            
            masterNodeToken = tokenRes.stdout.trim();
            masterEndpoint = `https://${masterIpAddr}:6443`;
            masterSsh.dispose();

            // Save it back to DB for future workers
            await prisma.kubernetesCluster.update({
              where: { id: clusterId },
              data: { nodeToken: masterNodeToken, endpoint: masterEndpoint }
            });
          } catch (err: any) {
            if (err.message && err.message.includes("authentication methods failed") && privateKey) {
              try {
                await masterSsh.connect({
                  host: masterIpAddr,
                  username: masterSshUsername,
                  password: masterPassword,
                  readyTimeout: 10000,
                  tryKeyboard: true,
                });
                const tokenRes = await masterSsh.execCommand(`${masterSudoPrefix}cat /var/lib/rancher/k3s/server/node-token`);
                if (tokenRes.code !== 0 && tokenRes.code !== null) throw new Error("Failed to read node token from master");
                masterNodeToken = tokenRes.stdout.trim();
                masterEndpoint = `https://${masterIpAddr}:6443`;
                masterSsh.dispose();

                await prisma.kubernetesCluster.update({
                  where: { id: clusterId },
                  data: { nodeToken: masterNodeToken, endpoint: masterEndpoint }
                });
              } catch(e2: any) {
                throw new Error("Failed to fetch node-token from master: " + e2.message);
              }
            } else {
              throw new Error("Failed to fetch node-token from master: " + err.message);
            }
          }
        } else {
          // If master token exists, we still need master's VPC IP to join securely
          const masterVps = await prisma.vpsService.findFirst({
            where: { kubernetesClusterId: clusterId, kubernetesRole: "MASTER" }
          });
          masterVpcIp = masterVps?.vpcIp || null;
        }
        
        const joinIp = masterVpcIp || masterEndpoint.replace("https://", "").replace(":6443", "");
        const nodeIpArg = vpcIp ? `--node-ip ${vpcIp} --flannel-iface eth1` : '';
        try {
          installRes = await sshConnected.execCommand(
            `curl -sfL https://get.k3s.io | K3S_URL=https://${joinIp}:6443 K3S_TOKEN=${masterNodeToken} INSTALL_K3S_CHANNEL='${k3sChannel}' INSTALL_K3S_EXEC='agent ${nodeIpArg}' sh -`,
            {
              onStdout: (chunk) => K3sProvisioningService.appendLog(clusterId, chunk.toString("utf8")),
              onStderr: (chunk) => K3sProvisioningService.appendLog(clusterId, chunk.toString("utf8"))
            }
          );
        } catch (err: any) {
          installRes.stderr = err.message || "Connection reset";
        }
      }
      
      const stderrStr = installRes.stderr || "";
      const stdoutStr = installRes.stdout || "";
      const isConnectionReset = stderrStr.includes("Connection reset by peer") || stdoutStr.includes("Connection reset by peer") || stderrStr.includes("D-Bus connection terminated");

      if (installRes.code !== 0 && installRes.code !== null && !isConnectionReset) {
        throw new Error(`K3s install failed: ${stderrStr || stdoutStr}`);
      }

      await K3sProvisioningService.appendLog(clusterId, `K3s ${role} installed successfully. Waiting for services to start (30s)...`);
      await new Promise(resolve => setTimeout(resolve, 30000));

      if (isConnectionReset || !sshConnected.isConnected()) {
        await K3sProvisioningService.appendLog(clusterId, `SSH connection was reset by systemd reload. Reconnecting...`);
        sshConnected.dispose();
        sshConnected = new NodeSSH();
        const { decryptDeterministic } = require("@/lib/encryption");
        const rootPassword = decryptDeterministic(vps.rootPassword) || vps.rootPassword;
        let privateKey = "";
        try {
          const privateKeyPath = require("path").join(process.cwd(), "storage", "ssh", "id_rsa");
          if (require("fs").existsSync(privateKeyPath)) privateKey = require("fs").readFileSync(privateKeyPath, "utf-8");
        } catch (err) {}

        let reconnected = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                if (privateKey) {
                    await sshConnected.connect({ host: ipAddress, username: sshUsername, privateKey: privateKey, readyTimeout: 10000, tryKeyboard: true });
                    reconnected = true; break;
                }
            } catch (e) {
                try {
                    await sshConnected.connect({ host: ipAddress, username: sshUsername, password: rootPassword, readyTimeout: 10000, tryKeyboard: true });
                    reconnected = true; break;
                } catch(e2) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }
        if (!reconnected) throw new Error("Failed to reconnect via SSH after installation");
      }


      let kubeconfigToSave: string | undefined;
      let nodeTokenToSave: string | undefined;
      let endpointToSave: string | undefined;

      if (role === "MASTER") {
        // Ensure kubectl is in the default PATH for VNC/console logins
        await sshConnected.execCommand(`${sudoPrefix}ln -sf /usr/local/bin/kubectl /usr/bin/kubectl`);
        await sshConnected.execCommand(`${sudoPrefix}ln -sf /usr/local/bin/crictl /usr/bin/crictl`);
        await sshConnected.execCommand(`${sudoPrefix}grep -q KUBECONFIG ~/.bashrc || echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc`);

        // 3. Fetch Kubeconfig — retry up to 5 times (K3s may need extra time to write the file)
        await K3sProvisioningService.appendLog(clusterId, `Reading kubeconfig from master node...`);
        let kubeconfigRaw = "";
        for (let attempt = 1; attempt <= 5; attempt++) {
          const kubeconfigRes = await sshConnected.execCommand(`${sudoPrefix}cat /etc/rancher/k3s/k3s.yaml`);
          if ((kubeconfigRes.code === 0 || kubeconfigRes.code === null) && kubeconfigRes.stdout.includes("apiVersion")) {
            kubeconfigRaw = kubeconfigRes.stdout;
            break;
          }
          await K3sProvisioningService.appendLog(clusterId, `Kubeconfig not ready yet (attempt ${attempt}/5), retrying in 10s... stderr: ${kubeconfigRes.stderr}`);
          if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 10000));
        }

        if (!kubeconfigRaw) {
          throw new Error("Failed to read kubeconfig after 5 attempts. K3s may not have started correctly.");
        }

        // 4. Fetch Node Token
        await K3sProvisioningService.appendLog(clusterId, `Reading node token...`);
        const tokenRes = await sshConnected.execCommand(`${sudoPrefix}cat /var/lib/rancher/k3s/server/node-token`);
        if (tokenRes.code !== 0 && tokenRes.code !== null) {
          throw new Error(`Failed to read node token: ${tokenRes.stderr}`);
        }

        const safeClusterName = cluster.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        let kubeconfig = kubeconfigRaw;
        kubeconfig = kubeconfig.replace(/name: default/g, `name: ${safeClusterName}`);
        kubeconfig = kubeconfig.replace(/cluster: default/g, `cluster: ${safeClusterName}`);
        kubeconfig = kubeconfig.replace(/user: default/g, `user: ${safeClusterName}`);
        kubeconfig = kubeconfig.replace(/current-context: default/g, `current-context: ${safeClusterName}`);

        kubeconfigToSave = kubeconfig.replace(/127\.0\.0\.1/g, ipAddress);
        nodeTokenToSave = tokenRes.stdout.trim();
        endpointToSave = `https://${ipAddress}:6443`;

        await K3sProvisioningService.appendLog(clusterId, `Kubeconfig and node token retrieved successfully.`);
      }

      // Clean up SSH connection
      sshConnected.dispose();

      if (role === "MASTER") {
        // 5. Update Cluster in Database
        await prisma.kubernetesCluster.update({
          where: { id: clusterId },
          data: {
            kubeconfig: encryptDeterministic(kubeconfigToSave!),
            nodeToken: nodeTokenToSave,
            endpoint: endpointToSave,
            status: "RUNNING"
          }
        });
        await K3sProvisioningService.appendLog(clusterId, `Cluster is now RUNNING! Kubeconfig saved to your panel.`);
      }

      // 6. Update VPS status to RUNNING
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: { status: "RUNNING" }
      });

      await K3sProvisioningService.appendLog(clusterId, `Node ${role} provisioned successfully on ${ipAddress}.`);
    } catch (err) {
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
