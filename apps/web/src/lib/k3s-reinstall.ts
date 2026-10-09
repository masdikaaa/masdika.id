import { prisma } from "@/lib/prisma";
import { NodeSSH } from "node-ssh";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { K3sProvisioningService } from "@/lib/k3s-provisioning";
import fs from "fs";
import path from "path";

export async function reinstallK3sCluster(payload: any) {
  const { clusterId, version, ipAddress, masterVpcIp, masterNodeId, masterUsername, masterRootPassword } = payload;
  
  const cluster = await prisma.kubernetesCluster.findUnique({
    where: { id: clusterId },
    include: { nodes: { include: { assignedIps: true } } }
  });
  if (!cluster) throw new Error("Cluster not found");

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

  const sshUsername = masterUsername || 'root';
  const sudoPrefix = sshUsername === 'root' ? '' : 'sudo ';

  try {
    await ssh.connect({
      host: ipAddress,
      username: sshUsername,
      password: privateKey ? undefined : decryptDeterministic(masterRootPassword),
      privateKey: privateKey,
      readyTimeout: 10000,
      tryKeyboard: true,
    });

    const reconnectSsh = async () => {
      if (ssh.isConnected()) return;
      await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] SSH disconnected. Reconnecting...`);
      ssh.dispose();
      let reconnected = false;
      for(let attempt = 1; attempt <= 3; attempt++) {
          try {
              if (privateKey) {
                  await ssh.connect({ host: ipAddress, username: sshUsername, privateKey: privateKey, readyTimeout: 10000, tryKeyboard: true });
                  reconnected = true; break;
              }
          } catch(e) {
              try {
                  await ssh.connect({ host: ipAddress, username: sshUsername, password: decryptDeterministic(masterRootPassword), readyTimeout: 10000, tryKeyboard: true });
                  reconnected = true; break;
              } catch(e2) {
                  await new Promise(resolve => setTimeout(resolve, 5000));
              }
          }
      }
      if(!reconnected) throw new Error("Failed to reconnect via SSH after reinstall");
    };

    // 1. Uninstall existing K3s
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Uninstalling previous K3s on ${ipAddress}...`);
    try {
      await ssh.execCommand(`${sudoPrefix}sh -c 'if [ -f /usr/local/bin/k3s-uninstall.sh ]; then /usr/local/bin/k3s-uninstall.sh; fi'`);
    } catch (e) { /* ignore connection reset */ }
    
    await reconnectSsh();

    // Additional cleanup just in case
    try {
      await ssh.execCommand(`${sudoPrefix}rm -rf /etc/rancher /var/lib/rancher`);
    } catch (e) {}

    // 2. Install fresh K3s with new version
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Installing K3s ${version} on ${ipAddress}...`);
    const nodeIpArg = masterVpcIp ? `--node-ip ${masterVpcIp} --flannel-iface eth1` : '';
    
    let installRes: any = { code: 0, stdout: "", stderr: "" };
    try {
      installRes = await ssh.execCommand(
        `curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL='${version}' INSTALL_K3S_EXEC='server --tls-san ${ipAddress} ${nodeIpArg}' sh -`,
        {
          onStdout: (chunk) => K3sProvisioningService.appendLog(cluster.id, chunk.toString("utf8")),
          onStderr: (chunk) => K3sProvisioningService.appendLog(cluster.id, chunk.toString("utf8"))
        }
      );
    } catch (err: any) {
      installRes.stderr = err.message || "Connection reset";
    }
    
    const stderrStr = installRes.stderr || "";
    const stdoutStr = installRes.stdout || "";
    const isConnectionReset = stderrStr.includes("ECONNRESET") || stderrStr.includes("socket hung up") || stderrStr.includes("Connection reset by peer") || stdoutStr.includes("Connection reset by peer") || stderrStr.includes("D-Bus connection terminated") || stderrStr.includes("Please login as the user");

    if (installRes.code !== 0 && installRes.code !== null && !isConnectionReset) {
      throw new Error(`K3s install failed: ${stderrStr || stdoutStr}`);
    }

    // Wait a bit for the service to generate new kubeconfig and come back up
    await new Promise(resolve => setTimeout(resolve, 30000));
    await reconnectSsh();

    // Ensure kubectl is in the default PATH for VNC/console logins
    await ssh.execCommand(`${sudoPrefix}ln -sf /usr/local/bin/kubectl /usr/bin/kubectl`);
    await ssh.execCommand(`${sudoPrefix}ln -sf /usr/local/bin/crictl /usr/bin/crictl`);
    await ssh.execCommand(`${sudoPrefix}grep -q KUBECONFIG ~/.bashrc || echo 'export KUBECONFIG=/etc/rancher/k3s/k3s.yaml' >> ~/.bashrc`);

    // 3. Fetch new Kubeconfig
    const kubeconfigRes = await ssh.execCommand(`${sudoPrefix}cat /etc/rancher/k3s/k3s.yaml`);
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

    // 4. Fetch new Node Token
    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Fetching new node token from ${ipAddress}...`);
    const tokenRes = await ssh.execCommand(`${sudoPrefix}cat /var/lib/rancher/k3s/server/node-token`);
    if (tokenRes.code !== 0 && tokenRes.code !== null) {
      throw new Error(`Failed to read new node token`);
    }
    const nodeToken = tokenRes.stdout.trim();
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

    ssh.dispose();

    // 5. Reinstall Worker Nodes
    if (workerNodes.length > 0) {
      await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Reinstalling ${workerNodes.length} worker node(s)...`);
      const workerPromises = workerNodes.map(async (worker) => {
        const workerPublicIp = worker.assignedIps?.find(ip => ip.isPrimary)?.ipAddress || worker.assignedIps?.[0]?.ipAddress;
        if (!workerPublicIp) {
          await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Skipping worker node (No Public IP found).`);
          return;
        }
        const workerIp = workerPublicIp;

        const workerSshUsername = worker.username || 'root';
        const workerSudoPrefix = workerSshUsername === 'root' ? '' : 'sudo ';
        const workerSsh = new NodeSSH();
        try {
          await workerSsh.connect({
            host: workerIp,
            username: workerSshUsername,
            password: privateKey ? undefined : decryptDeterministic(worker.rootPassword),
            privateKey: privateKey,
            readyTimeout: 10000,
            tryKeyboard: true,
          });

          const reconnectWorker = async () => {
            if (workerSsh.isConnected()) return;
            await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Worker SSH disconnected. Reconnecting...`);
            workerSsh.dispose();
            let reconnected = false;
            for(let attempt = 1; attempt <= 3; attempt++) {
                try {
                    if (privateKey) {
                        await workerSsh.connect({ host: workerIp, username: workerSshUsername, privateKey: privateKey, readyTimeout: 10000, tryKeyboard: true });
                        reconnected = true; break;
                    }
                } catch(e) {
                    try {
                        await workerSsh.connect({ host: workerIp, username: workerSshUsername, password: decryptDeterministic(worker.rootPassword), readyTimeout: 10000, tryKeyboard: true });
                        reconnected = true; break;
                    } catch(e2) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
            if(!reconnected) throw new Error("Failed to reconnect worker via SSH");
          };

          await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Uninstalling previous K3s agent on ${workerIp}...`);
          try {
            await workerSsh.execCommand(`${workerSudoPrefix}sh -c 'if [ -f /usr/local/bin/k3s-agent-uninstall.sh ]; then /usr/local/bin/k3s-agent-uninstall.sh; fi'`);
          } catch(e) {}
          try {
            await workerSsh.execCommand(`${workerSudoPrefix}sh -c 'if [ -f /usr/local/bin/k3s-uninstall.sh ]; then /usr/local/bin/k3s-uninstall.sh; fi'`);
          } catch(e) {}
          
          await reconnectWorker();

          try {
            await workerSsh.execCommand(`${workerSudoPrefix}rm -rf /etc/rancher /var/lib/rancher`);
          } catch(e) {}

          await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Installing K3s agent ${version} on ${workerIp}...`);
          const joinIp = masterVpcIp || ipAddress;
          const workerNodeIpArg = worker.vpcIp ? `--node-ip ${worker.vpcIp} --flannel-iface eth1` : '';
          
          let workerInstallRes: any = { code: 0, stdout: "", stderr: "" };
          try {
            workerInstallRes = await workerSsh.execCommand(
              `curl -sfL https://get.k3s.io | K3S_URL='https://${joinIp}:6443' K3S_TOKEN='${nodeToken}' INSTALL_K3S_CHANNEL='${version}' INSTALL_K3S_EXEC='agent ${workerNodeIpArg}' sh -`,
              {
                onStdout: (chunk) => K3sProvisioningService.appendLog(cluster.id, chunk.toString("utf8")),
                onStderr: (chunk) => K3sProvisioningService.appendLog(cluster.id, chunk.toString("utf8"))
              }
            );
          } catch (err: any) {
            workerInstallRes.stderr = err.message || "Connection reset";
          }

          const workerStderrStr = workerInstallRes.stderr || "";
          const workerStdoutStr = workerInstallRes.stdout || "";
          const isWorkerConnectionReset = workerStderrStr.includes("ECONNRESET") || workerStderrStr.includes("socket hung up") || workerStderrStr.includes("Connection reset by peer") || workerStdoutStr.includes("Connection reset by peer") || workerStderrStr.includes("D-Bus connection terminated");

          if (workerInstallRes.code !== 0 && workerInstallRes.code !== null && !isWorkerConnectionReset) {
            await K3sProvisioningService.appendLog(cluster.id, `K3s agent install failed on ${workerIp}: ${workerStderrStr || workerStdoutStr}`);
            await prisma.vpsService.update({
              where: { id: worker.id },
              data: { status: "FAILED" }
            });
          } else {
            await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Worker ${workerIp} reinstalled successfully.`);
            await prisma.vpsService.update({
              where: { id: worker.id },
              data: { status: "RUNNING" }
            });
          }
        } catch (err) {
          console.error(`[K3s Reinstall] Failed to connect/reinstall worker ${workerIp}:`, err);
        } finally {
          workerSsh.dispose();
        }
      });

      // Wait for all workers to finish. We don't throw errors here so that partial successes still return OK for the master.
      await Promise.all(workerPromises);
    }

    // Always mark cluster and master as RUNNING after reinstall completes
    await prisma.kubernetesCluster.update({
      where: { id: cluster.id },
      data: { status: "RUNNING" }
    });
    await prisma.vpsService.update({
      where: { id: masterNodeId },
      data: { status: "RUNNING" }
    });

    await K3sProvisioningService.appendLog(cluster.id, `[K3s Reinstall] Cluster reinstall finished.`);

  } catch (err: any) {
    ssh.dispose();
    console.error("SSH/Reinstall Error:", err);
    try {
      await prisma.kubernetesCluster.update({
        where: { id: clusterId },
        data: { status: "FAILED" }
      });
      await prisma.vpsService.updateMany({
        where: { kubernetesClusterId: clusterId },
        data: { status: "FAILED" }
      });
    } catch (e) {}
    throw err;
  }
}
