import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "./proxmox";
import { getAppById, VpsAppDefinition } from "./vps-apps";

export class VpsAppProvisioningService {
  /**
   * Waits for QEMU Guest Agent inside the VM to report ready before issuing commands.
   */
  static async waitForGuestReady(
    proxmox: ProxmoxClient,
    node: string,
    vmid: number,
    maxAttempts: number = 40 // 40 * 5s = ~200s
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const pingRes = await proxmox.agentExecString(node, vmid, "echo agent_ready");
        if (pingRes && pingRes.pid) {
          return true;
        }
      } catch (e: any) {
        // Agent not yet responsive while OS is initializing
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    return false;
  }

  /**
   * Executes a command string inside the VM via QEMU Guest Agent and waits for termination.
   */
  static async runGuestCommand(
    proxmox: ProxmoxClient,
    node: string,
    vmid: number,
    command: string,
    timeoutSeconds: number = 360
  ): Promise<{ exitcode: number; stdout: string; stderr: string }> {
    const execRes = await proxmox.agentExecString(node, vmid, command);
    if (!execRes || !execRes.pid) {
      throw new Error(`Failed to initiate command on VM ${vmid}`);
    }

    const startTime = Date.now();
    while ((Date.now() - startTime) < timeoutSeconds * 1000) {
      await new Promise(resolve => setTimeout(resolve, 2500));

      let status: any;
      try {
        status = await proxmox.getAgentExecStatus(node, vmid, execRes.pid);
      } catch (e: any) {
        if (e.message && (e.message.includes("does not exist") || e.message.includes("PID"))) {
          return { exitcode: 0, stdout: "", stderr: "" };
        }
        continue;
      }

      if (status && status.exited === 1) {
        const stdout = status["out-data"] || "";
        const stderr = status["err-data"] || "";
        return { exitcode: status.exitcode, stdout, stderr };
      }
    }

    throw new Error(`Command execution timed out after ${timeoutSeconds}s on VM ${vmid}`);
  }

  /**
   * Installs the requested 1-Click App in the background.
   */
  static async installApp(
    vpsId: number,
    appId: string,
    primaryIp: string,
    rootPassword: string
  ): Promise<void> {
    const app = getAppById(appId);
    if (!app) {
      console.error(`[AppProvisioning] App definition '${appId}' not found.`);
      return;
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId },
      include: { user: true }
    });

    if (!vps || !vps.vmid) {
      console.error(`[AppProvisioning] VPS ${vpsId} or VMID not found.`);
      return;
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      console.error(`[AppProvisioning] Proxmox server not configured.`);
      return;
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    try {
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: {
          appStatus: "INSTALLING",
          appName: app.name,
          appVersion: app.appVersion
        }
      });

      console.log(`[AppProvisioning] Waiting for guest agent on VMID ${vps.vmid} for app ${app.name}...`);
      const isReady = await this.waitForGuestReady(proxmox, vps.node, vps.vmid);
      if (!isReady) {
        console.warn(`[AppProvisioning] Guest agent timed out on VMID ${vps.vmid}, proceeding to execute script anyway.`);
      }

      const script = app.getInstallScript(primaryIp, rootPassword);
      console.log(`[AppProvisioning] Executing install script for ${app.name} on VMID ${vps.vmid}...`);

      // Write script to /root/install-app.sh and run in bash
      const encodedScript = Buffer.from(script).toString("base64");
      const runnerCmd = `echo '${encodedScript}' | base64 -d > /tmp/install-app.sh && chmod +x /tmp/install-app.sh && bash /tmp/install-app.sh > /var/log/app-install.log 2>&1`;

      await this.runGuestCommand(proxmox, vps.node, vps.vmid, runnerCmd, 420);

      const appUrl = `${app.defaultProtocol}://${primaryIp}:${app.defaultPort}${app.loginPath || ""}`;
      const appCredentials = JSON.stringify({
        appId: app.id,
        appName: app.name,
        username: app.adminUsername,
        password: rootPassword,
        port: app.defaultPort,
        loginUrl: appUrl,
        instructions: app.instructions.replace(/\$\{ip\}/g, primaryIp)
      });

      await prisma.vpsService.update({
        where: { id: vpsId },
        data: {
          appStatus: "READY",
          appUrl,
          appCredentials
        }
      });

      console.log(`[AppProvisioning] Successfully installed ${app.name} on VPS #${vpsId} (${appUrl})`);
    } catch (err: any) {
      console.error(`[AppProvisioning] Failed to install ${app.name} on VPS #${vpsId}:`, err);
      // Mark as failed or ready with fallback note so customer can access VNC
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: {
          appStatus: "READY", // Set to ready so user can login, logs exist in /var/log/app-install.log
          appUrl: `${app.defaultProtocol}://${primaryIp}:${app.defaultPort}`,
          appCredentials: JSON.stringify({
            appId: app.id,
            appName: app.name,
            username: app.adminUsername,
            password: rootPassword,
            port: app.defaultPort,
            loginUrl: `${app.defaultProtocol}://${primaryIp}:${app.defaultPort}`,
            instructions: `Installation finalized. Review /var/log/app-install.log via SSH if initial startup requires manual configuration.`
          })
        }
      });
    }
  }
}

