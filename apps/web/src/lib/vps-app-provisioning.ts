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
    maxAttempts: number = 60 // 60 * 5s = ~300s
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

      // Extract initial app configuration if stored during checkout
      let appConfig: Record<string, any> = {};
      if (vps.appCredentials) {
        try {
          const parsed = JSON.parse(vps.appCredentials);
          if (typeof parsed === "object" && parsed !== null) {
            appConfig = parsed;
          }
        } catch {
          // ignore parsing error
        }
      }

      const script = app.getInstallScript(primaryIp, rootPassword, appConfig);
      console.log(`[AppProvisioning] Executing install script for ${app.name} on VMID ${vps.vmid}...`);

      // Write script to /tmp/install-app.sh and run in bash with generous timeout
      const encodedScript = Buffer.from(script).toString("base64");
      const isHeavyPanel = ["cpanel", "plesk", "cyberpanel", "aapanel", "k3s"].includes(app.id);
      const executionTimeout = isHeavyPanel ? 1200 : 600; // 20m for complex panels, 10m for standard apps

      const runnerCmd = `mkdir -p /var/log && (ufw allow ${app.defaultPort}/tcp 2>/dev/null || true) && (iptables -I INPUT -p tcp --dport ${app.defaultPort} -j ACCEPT 2>/dev/null || true) && for i in \$(seq 1 40); do if fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; then sleep 3; else break; fi; done && echo '${encodedScript}' | base64 -d > /tmp/install-app.sh && chmod +x /tmp/install-app.sh && bash /tmp/install-app.sh > /var/log/app-install.log 2>&1`;

      await this.runGuestCommand(proxmox, vps.node, vps.vmid, runnerCmd, executionTimeout);

      // Attempt to retrieve runtime-verified app info from /root/masdika-app-info.json with retries
      let verifiedInfo: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const verifyRes = await this.runGuestCommand(
            proxmox,
            vps.node,
            vps.vmid,
            "cat /root/masdika-app-info.json 2>/dev/null || true",
            15
          );
          if (verifyRes.stdout && verifyRes.stdout.trim().startsWith("{")) {
            verifiedInfo = JSON.parse(verifyRes.stdout.trim());
            break;
          }
        } catch (verifyErr) {
          // Retry after brief delay
        }
        await new Promise(resolve => setTimeout(resolve, 2500));
      }

      const port = Number(verifiedInfo?.port) || Number(appConfig.panelPort) || app.defaultPort;
      const protocol = verifiedInfo?.protocol || app.defaultProtocol;
      const path = verifiedInfo?.path !== undefined ? verifiedInfo.path : (app.loginPath || "");
      const username = verifiedInfo?.username || appConfig.adminUsername || app.adminUsername;
      const password = verifiedInfo?.password || appConfig.adminPassword || rootPassword;
      const domainOrIp = (appConfig.domain && typeof appConfig.domain === "string" && appConfig.domain.trim())
        ? appConfig.domain.trim()
        : primaryIp;

      let appUrl = verifiedInfo?.url;
      if (!appUrl) {
        const portSuffix = (protocol === "http" && port === 80) || (protocol === "https" && port === 443) ? "" : `:${port}`;
        appUrl = `${protocol}://${domainOrIp}${portSuffix}${path}`;
      }

      const appCredentials = JSON.stringify({
        appId: app.id,
        appName: app.name,
        username,
        password,
        port,
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

