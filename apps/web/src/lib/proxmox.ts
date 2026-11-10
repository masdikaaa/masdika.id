import http from "http";
import https from "https";
import { Readable } from "stream";

function encodeSegment(val: string | number): string {
  return encodeURIComponent(String(val));
}

export class ProxmoxClient {
  private host: string;
  private tokenId: string;
  private tokenSecret: string;
  private httpsAgent: https.Agent;
  private httpAgent: http.Agent;

  constructor(host: string, tokenId: string, tokenSecret: string) {
    this.host = host.replace(/\/$/, ""); // Remove trailing slash
    this.tokenId = tokenId;
    this.tokenSecret = tokenSecret;
    // Scoped agent for self-signed Proxmox VE certificates (never disable global NODE_TLS_REJECT_UNAUTHORIZED!)
    // Force IPv4 to prevent ticket IP mismatch if server has dual-stack (IPv6/IPv4)
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      family: 4,
    });
    this.httpAgent = new http.Agent({
      family: 4,
    });
  }

  private getAuthHeaders() {
    return {
      Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(method: string, path: string, data?: any, rawBody?: string): Promise<T> {
    const targetUrl = new URL(`${this.host}/api2/json${path}`);
    const isHttps = targetUrl.protocol === "https:";

    const headers: Record<string, string> = {
      Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
    };

    let bodyBuffer: Buffer | undefined;
    if (rawBody && (method === "POST" || method === "PUT")) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      bodyBuffer = Buffer.from(rawBody, "utf8");
      headers["Content-Length"] = String(bodyBuffer.byteLength);
    } else if (data && (method === "POST" || method === "PUT")) {
      headers["Content-Type"] = "application/json";
      bodyBuffer = Buffer.from(JSON.stringify(data), "utf8");
      headers["Content-Length"] = String(bodyBuffer.byteLength);
    }

    const { statusCode, statusMessage, text } = await new Promise<{
      statusCode: number;
      statusMessage: string;
      text: string;
    }>((resolve, reject) => {
      const transport = isHttps ? https : http;
      const req = transport.request(
        targetUrl,
        {
          method,
          headers,
          agent: isHttps ? this.httpsAgent : this.httpAgent,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode || 500,
              statusMessage: res.statusMessage || "Error",
              text: Buffer.concat(chunks).toString("utf8"),
            });
          });
          res.on("error", reject);
        }
      );

      req.setTimeout(15000, () => {
        req.destroy(new Error(`Connection timed out fetching Proxmox API (${method} ${path})`));
      });
      req.on("error", reject);

      if (bodyBuffer) {
        req.write(bodyBuffer);
      }
      req.end();
    });

    const ok = statusCode >= 200 && statusCode < 300;
    let result: any;
    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      if (!ok) {
        throw new Error(text || statusMessage);
      }
      return text as unknown as T;
    }

    if (!ok) {
      throw new Error(result.errors ? JSON.stringify(result.errors) : (result.message || statusMessage));
    }

    return result.data;
  }

  /**
   * Stream a raw response from Proxmox (used for large backup archive downloads)
   * using the scoped self-signed TLS agent without disabling global Node TLS verification.
   */
  async streamRawPath(rawApiPath: string): Promise<{
    status: number;
    headers: Record<string, string | string[] | undefined>;
    stream: ReadableStream<Uint8Array>;
    readErrorText: () => Promise<string>;
  }> {
    const targetUrl = new URL(`${this.host}${rawApiPath}`);
    const isHttps = targetUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const req = transport.request(
        targetUrl,
        {
          method: "GET",
          headers: {
            Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
            Cookie: "PVEAuthCookie=",
          },
          agent: isHttps ? this.httpsAgent : this.httpAgent,
        },
        (res) => {
          const status = res.statusCode || 500;
          const readErrorText = () =>
            new Promise<string>((resText) => {
              const chunks: Buffer[] = [];
              res.on("data", (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
              res.on("end", () => resText(Buffer.concat(chunks).toString("utf8")));
              res.on("error", () => resText("Stream error"));
            });

          resolve({
            status,
            headers: res.headers,
            stream: Readable.toWeb(res) as ReadableStream<Uint8Array>,
            readErrorText,
          });
        }
      );

      req.setTimeout(60000, () => {
        req.destroy(new Error("Connection timed out streaming from Proxmox"));
      });
      req.on("error", reject);
      req.end();
    });
  }

  // --- Nodes ---
  async getNodes() {
    return this.request<any>("GET", "/nodes");
  }

  async getNodeStatus(node: string) {
    return this.request<any>("GET", `/nodes/${node}/status`);
  }

  // --- Cluster ---
  async getClusterResources(type?: string) {
    const url = type ? `/cluster/resources?type=${type}` : "/cluster/resources";
    return this.request<any>("GET", url);
  }

  // --- Storages ---
  async getStorages(node: string = "proxmox") {
    return this.request<any>("GET", `/nodes/${node}/storage`);
  }

  // --- Networks ---
  async getNetworks(node: string = "proxmox") {
    return this.request<any>("GET", `/nodes/${node}/network`);
  }

  // --- VMs ---
  async getVms(node: string = "proxmox") {
    return this.request<any>("GET", `/nodes/${node}/qemu`);
  }
  
  async getVmStatus(node: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/status/current`);
  }

  async getVmAgentFsInfo(node: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/agent/get-fsinfo`);
  }

  async cloneVm(node: string, templateVmid: number, newVmid: number, name: string, targetStorage: string) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${templateVmid}/clone`, {
      newid: newVmid,
      name: name,
      full: 1, // Full clone
      storage: targetStorage,
      target: node
    });
  }

  // --- Tasks & Locks ---
  async waitForTask(
    node: string,
    upid: string,
    timeoutMs: number = 300000,
    onProgress?: (percent: number | null, text: string) => Promise<void> | void
  ): Promise<void> {
    const start = Date.now();
    let lastLogIndex = 0;
    while (Date.now() - start < timeoutMs) {
      try {
        const task = await this.getTaskStatus(node, upid);
        if (task && task.status === "stopped") {
          if (task.exitstatus && task.exitstatus !== "OK") {
            throw new Error(`Proxmox task failed: ${task.exitstatus}`);
          }
          return;
        }

        if (onProgress) {
          try {
            const logs = await this.getTaskLog(node, upid, lastLogIndex, 25);
            if (Array.isArray(logs) && logs.length > 0) {
              lastLogIndex += logs.length;
              for (const item of logs) {
                const text = String(item.t || "").trim();
                if (!text) continue;
                const match = text.match(/\((\d+(\.\d+)?)%\)/);
                if (match) {
                  const pct = parseFloat(match[1]);
                  await onProgress(pct, text);
                } else {
                  await onProgress(null, text);
                }
              }
            }
          } catch {
            // non-critical progress logging error
          }
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Proxmox task failed")) {
          throw err;
        }
        // Transient network error while polling task status
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error(`Timeout after ${Math.round(timeoutMs / 1000)}s waiting for Proxmox task ${upid}`);
  }

  async waitForVmUnlock(node: string, vmid: number, timeoutMs: number = 180000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const status = await this.getVmStatus(node, vmid);
        if (status && !status.lock) {
          return;
        }
      } catch (err: any) {
        // VM may still be registering in Proxmox during clone
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error(`Timeout after ${Math.round(timeoutMs / 1000)}s waiting for VMID ${vmid} lock to release`);
  }
  
  async configVm(node: string, vmid: number, config: any) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/config`, config);
  }

  async getVmConfig(node: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/config`);
  }

  async resizeVmDisk(node: string, vmid: number, disk: string, size: string) {
    return this.request<any>("PUT", `/nodes/${node}/qemu/${vmid}/resize`, { disk, size });
  }

  // --- Power Management ---
  async startVm(node: string, vmid: number) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/status/start`);
  }

  async stopVm(node: string, vmid: number) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/status/stop`);
  }

  async shutdownVm(node: string, vmid: number) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/status/shutdown`);
  }

  async rebootVm(node: string, vmid: number) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/status/reboot`);
  }

  async resetVm(node: string, vmid: number) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/status/reset`);
  }
  
  async deleteVm(node: string, vmid: number, purge: boolean = true) {
    const query = purge ? "?purge=1&destroy-unreferenced-disks=1" : "";
    return this.request<any>("DELETE", `/nodes/${node}/qemu/${vmid}${query}`);
  }

  async getVncProxy(node: string, vmid: number) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/vncproxy`, { websocket: 1 });
  }

  async getTermProxy(node: string, vmid: number) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/termproxy`);
  }

  // --- Tasks ---
  async getTaskStatus(node: string, upid: string) {
    return this.request<any>("GET", `/nodes/${encodeSegment(node)}/tasks/${encodeSegment(upid)}/status`);
  }

  async getTaskLog(node: string, upid: string, start: number = 0, limit: number = 500) {
    return this.request<any>("GET", `/nodes/${encodeSegment(node)}/tasks/${encodeSegment(upid)}/log?start=${Number(start) || 0}&limit=${Number(limit) || 500}`);
  }
  


  async getVMTasks(node: string, vmid: number, limit: number = 50) {
    // We can list all tasks for a node and filter by vmid, as Proxmox API has `/nodes/{node}/tasks?vmid={vmid}`
    return this.request<any>("GET", `/nodes/${node}/tasks?vmid=${vmid}&limit=${limit}`);
  }

  async getClusterTasks(): Promise<any[]> {
    try {
      const res = await this.request<any>("GET", `/cluster/tasks`);
      return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    } catch {
      return [];
    }
  }

  async getNodeTasks(node: string): Promise<any[]> {
    try {
      const res = await this.request<any>("GET", `/nodes/${node}/tasks`);
      return Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    } catch {
      return [];
    }
  }

  // --- Backups ---
  async getBackups(node: string, storage: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${encodeSegment(node)}/storage/${encodeSegment(storage)}/content?content=backup&vmid=${Number(vmid)}`);
  }

  async createBackup(node: string, vmid: number, storage: string) {
    return this.request<any>("POST", `/nodes/${encodeSegment(node)}/vzdump`, {
      vmid: vmid.toString(),
      storage: storage,
      mode: "snapshot",
      compress: "zstd"
    });
  }

  async restoreBackup(node: string, vmid: number, archive: string) {
    return this.request<any>("POST", `/nodes/${encodeSegment(node)}/qemu`, {
      vmid: vmid,
      archive: archive,
      force: 1
    });
  }

  async deleteBackup(node: string, storage: string, volume: string) {
    return this.request<any>("DELETE", `/nodes/${encodeSegment(node)}/storage/${encodeSegment(storage)}/content/${encodeSegment(volume)}`);
  }

  // --- Snapshots ---
  async getVMSnapshots(node: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${encodeSegment(node)}/qemu/${Number(vmid)}/snapshot`);
  }

  async createVMSnapshot(node: string, vmid: number, snapname: string, description?: string, vmstate: boolean = false) {
    const payload: any = { snapname };
    if (description) payload.description = description;
    if (vmstate) payload.vmstate = 1;
    return this.request<any>("POST", `/nodes/${encodeSegment(node)}/qemu/${Number(vmid)}/snapshot`, payload);
  }

  async rollbackVMSnapshot(node: string, vmid: number, snapname: string) {
    return this.request<any>("POST", `/nodes/${encodeSegment(node)}/qemu/${Number(vmid)}/snapshot/${encodeSegment(snapname)}/rollback`);
  }

  async deleteVMSnapshot(node: string, vmid: number, snapname: string) {
    return this.request<any>("DELETE", `/nodes/${encodeSegment(node)}/qemu/${Number(vmid)}/snapshot/${encodeSegment(snapname)}`);
  }

  async updateVMSnapshot(node: string, vmid: number, snapname: string, description: string) {
    return this.request<any>("PUT", `/nodes/${encodeSegment(node)}/qemu/${Number(vmid)}/snapshot/${encodeSegment(snapname)}/config`, { description });
  }


  // --- Firewall IPSet ---
  async getFirewallIpSets(node: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/firewall/ipset`);
  }

  async createFirewallIpSet(node: string, vmid: number, name: string = "ipfilter-net0", comment?: string) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/firewall/ipset`, {
      name,
      comment
    });
  }

  async getFirewallIpSet(node: string, vmid: number, name: string = "ipfilter-net0") {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/firewall/ipset/${name}`);
  }

  async addIpToFirewallIpSet(node: string, vmid: number, cidr: string, name: string = "ipfilter-net0", comment?: string) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/firewall/ipset/${name}`, {
      cidr,
      comment,
      nomatch: 0
    });
  }

  async removeIpFromFirewallIpSet(node: string, vmid: number, cidr: string, name: string = "ipfilter-net0") {
    // Proxmox expects the exact cidr for deletion, which must be URL encoded.
    return this.request<any>("DELETE", `/nodes/${node}/qemu/${vmid}/firewall/ipset/${name}/${encodeURIComponent(cidr)}`);
  }

  // --- QEMU Guest Agent ---
  async agentExec(node: string, vmid: number, command: string[]) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/agent/exec`, undefined, 'command=' + command.map(c => encodeURIComponent(c)).join('&command=')); // Proxmox often prefers form data arrays like command=foo&command=bar
  }

  async agentExecString(node: string, vmid: number, command: string) {
    // Using bash -c
    const cmds = ["bash", "-c", command];
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/agent/exec`, undefined, cmds.map(c => `command=${encodeURIComponent(c)}`).join('&'));
  }

  async getAgentExecStatus(node: string, vmid: number, pid: number) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/agent/exec-status?pid=${pid}`);
  }

  async agentFileRead(node: string, vmid: number, file: string) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/agent/file-read?file=${encodeURIComponent(file)}`);
  }

  // --- Firewall Options ---
  async updateFirewallOptions(node: string, vmid: number, options: any) {
    return this.request<any>("PUT", `/nodes/${node}/qemu/${vmid}/firewall/options`, options);
  }

  // --- Firewall Rules ---
  async getFirewallRules(node: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/firewall/rules`);
  }

  async createFirewallRule(node: string, vmid: number, ruleData: any) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/firewall/rules`, ruleData);
  }

  async updateFirewallRule(node: string, vmid: number, pos: number, ruleData: any) {
    return this.request<any>("PUT", `/nodes/${node}/qemu/${vmid}/firewall/rules/${pos}`, ruleData);
  }

  async deleteFirewallRule(node: string, vmid: number, pos: number) {
    return this.request<any>("DELETE", `/nodes/${node}/qemu/${vmid}/firewall/rules/${pos}`);
  }

  // --- RRD Data (Metrics) ---
  async getRRDData(node: string, vmid: number, timeframe: string = "hour") {
    // timeframe options: "hour", "day", "week", "month", "year"
    const response = await this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/rrddata?timeframe=${timeframe}`);
    return response.data || response;
  }
}

