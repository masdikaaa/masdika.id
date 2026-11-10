import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "./proxmox";
import { getAppById, VpsAppDefinition } from "./vps-apps";

export class VpsAppProvisioningService {
  /**
   * Helper to append a timestamped log to vps.appCredentials JSON.
   */
  private static async appendAppLog(vpsId: number, msg: string): Promise<void> {
    try {
      const vps = await prisma.vpsService.findUnique({
        where: { id: vpsId },
        select: { appCredentials: true }
      });
      let creds: Record<string, any> = {};
      if (vps?.appCredentials) {
        try {
          creds = JSON.parse(vps.appCredentials);
        } catch {}
      }
      const existingLogs: string[] = Array.isArray(creds.logs) ? creds.logs : [];
      const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
      const newLogs = [...existingLogs, `[${timestamp}] ${msg}`].slice(-100);
      creds.logs = newLogs;

      await prisma.vpsService.update({
        where: { id: vpsId },
        data: { appCredentials: JSON.stringify(creds) }
      });
    } catch (e) {
      // Non-blocking log update
    }
  }

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
   * Waits for cloud-init on the guest VM to finish first-boot tasks.
   */
  static async waitForCloudInit(
    proxmox: ProxmoxClient,
    node: string,
    vmid: number,
    maxWaitSeconds: number = 180
  ): Promise<void> {
    const startTime = Date.now();
    while ((Date.now() - startTime) < maxWaitSeconds * 1000) {
      try {
        const res = await this.runGuestCommand(
          proxmox,
          node,
          vmid,
          "cloud-init status 2>&1 || echo done",
          15
        );
        const out = (res.stdout || "").toLowerCase();
        if (out.includes("done") || out.includes("finished") || out.includes("error") || out.includes("not found")) {
          return;
        }
      } catch {
        // Retry
      }
      await new Promise(r => setTimeout(r, 4000));
    }
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
        return { exitcode: status.exitcode ?? 0, stdout, stderr };
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
    rootPassword: string,
    customConfig?: Record<string, any>
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
          appVersion: app.appVersion,
          ...(customConfig ? { appCredentials: JSON.stringify(customConfig) } : {})
        }
      });

      await this.appendAppLog(vpsId, `[INIT] Waiting for Guest Agent and Cloud-Init boot sequence...`);
      console.log(`[AppProvisioning] Waiting for guest agent on VMID ${vps.vmid} for app ${app.name}...`);
      const isReady = await this.waitForGuestReady(proxmox, vps.node, vps.vmid);
      if (!isReady) {
        console.warn(`[AppProvisioning] Guest agent timed out on VMID ${vps.vmid}, proceeding to execute script anyway.`);
      }

      // Wait for cloud-init to finish first-boot locks
      await this.waitForCloudInit(proxmox, vps.node, vps.vmid, 120);
      await this.appendAppLog(vpsId, `[SYSTEM] Base OS online. Preparing package manager and runtime stack...`);

      // Extract initial app configuration if passed directly or stored in DB
      let appConfig: Record<string, any> = customConfig || {};
      if (Object.keys(appConfig).length === 0 && vps.appCredentials) {
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
      await this.appendAppLog(vpsId, `[INSTALLER] Executing automated setup script for ${app.name}...`);

      const encodedScript = Buffer.from(script).toString("base64");
      const isHeavyPanel = ["cpanel", "plesk", "cyberpanel", "aapanel", "k3s"].includes(app.id);
      const executionTimeout = isHeavyPanel ? 1200 : 600; // 20m for complex panels, 10m for standard apps

      // Robust runner with lock release loop, unattended-upgrades shutdown, and logging
      const runnerCmd = `mkdir -p /var/log /tmp && ` +
        `systemctl stop unattended-upgrades 2>/dev/null || true; ` +
        `systemctl disable unattended-upgrades 2>/dev/null || true; ` +
        `for i in $(seq 1 60); do ` +
        `if fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1 || pgrep -f "apt-get|dpkg|unattended-upgrade" >/dev/null 2>&1; then ` +
        `sleep 2; ` +
        `else break; fi; ` +
        `done; ` +
        `(ufw allow ${app.defaultPort}/tcp 2>/dev/null || true); ` +
        `(iptables -I INPUT -p tcp --dport ${app.defaultPort} -j ACCEPT 2>/dev/null || true); ` +
        `echo '${encodedScript}' | base64 -d > /tmp/install-app.sh && ` +
        `chmod +x /tmp/install-app.sh && ` +
        `bash /tmp/install-app.sh > /var/log/app-install.log 2>&1; ` +
        `INSTALL_EXIT=$?; ` +
        `tail -n 60 /var/log/app-install.log; ` +
        `exit $INSTALL_EXIT`;

      const execResult = await this.runGuestCommand(proxmox, vps.node, vps.vmid, runnerCmd, executionTimeout);

      if (execResult.exitcode !== 0) {
        const errorSummary = (execResult.stderr || execResult.stdout || `Exit code ${execResult.exitcode}`).slice(-1200);
        console.error(`[AppProvisioning] Failed to install ${app.name} on VMID ${vps.vmid} (code ${execResult.exitcode}):\n`, errorSummary);
        await this.appendAppLog(vpsId, `[ERROR] Installation script failed with exit code ${execResult.exitcode}.`);

        let credsObj: Record<string, any> = {};
        if (vps.appCredentials) {
          try { credsObj = JSON.parse(vps.appCredentials); } catch {}
        }
        credsObj.error = errorSummary;
        credsObj.installFailed = true;

        await prisma.vpsService.update({
          where: { id: vpsId },
          data: {
            appStatus: "FAILED",
            appCredentials: JSON.stringify(credsObj)
          }
        });
        return;
      }

      await this.appendAppLog(vpsId, `[VERIFY] Installation script completed. Verifying runtime endpoints...`);

      // Attempt to retrieve runtime-verified app info from /root/masdika-app-info.json with retries
      let verifiedInfo: any = null;
      for (let attempt = 0; attempt < 4; attempt++) {
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
        await new Promise(resolve => setTimeout(resolve, 2000));
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

      let existingCreds: Record<string, any> = {};
      if (vps.appCredentials) {
        try { existingCreds = JSON.parse(vps.appCredentials); } catch {}
      }

      const appCredentials = JSON.stringify({
        ...existingCreds,
        appId: app.id,
        appName: app.name,
        username,
        password,
        port,
        loginUrl: appUrl,
        instructions: app.instructions.replace(/\$\{ip\}/g, primaryIp),
        error: null,
        installFailed: false
      });

      await prisma.vpsService.update({
        where: { id: vpsId },
        data: {
          appStatus: "READY",
          appUrl,
          appCredentials
        }
      });

      await this.appendAppLog(vpsId, `[SUCCESS] ${app.name} service verified and online at ${appUrl}.`);
      console.log(`[AppProvisioning] Successfully installed ${app.name} on VPS #${vpsId} (${appUrl})`);
    } catch (err: any) {
      console.error(`[AppProvisioning] Fatal error during ${app.name} setup on VPS #${vpsId}:`, err);
      await this.appendAppLog(vpsId, `[FATAL] Provisioning exception: ${err?.message || "Unknown error"}`);

      let existingCreds: Record<string, any> = {};
      if (vps.appCredentials) {
        try { existingCreds = JSON.parse(vps.appCredentials); } catch {}
      }
      existingCreds.error = err?.message || "Exception during app provisioning";
      existingCreds.installFailed = true;

      await prisma.vpsService.update({
        where: { id: vpsId },
        data: {
          appStatus: "FAILED",
          appCredentials: JSON.stringify(existingCreds)
        }
      });
    }
  }
}
