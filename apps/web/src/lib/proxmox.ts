import https from "https";

// Allow self-signed certificates for Proxmox API calls using native fetch
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export class ProxmoxClient {
  private host: string;
  private tokenId: string;
  private tokenSecret: string;
  private httpsAgent: https.Agent;

  constructor(host: string, tokenId: string, tokenSecret: string) {
    this.host = host.replace(/\/$/, ""); // Remove trailing slash
    this.tokenId = tokenId;
    this.tokenSecret = tokenSecret;
    // Proxmox usually has self-signed certs, ignore for API calls
    // Force IPv4 to prevent ticket IP mismatch if server has dual-stack (IPv6/IPv4)
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false,
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
    const url = `${this.host}/api2/json${path}`;
    
    const headers: Record<string, string> = {
      Authorization: `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
    };

    const options: RequestInit = {
      method,
      // @ts-expect-error - Next.js/Node fetch supports agent
      agent: this.httpsAgent,
    };

    if (rawBody && (method === "POST" || method === "PUT")) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      options.body = rawBody;
    } else if (data && (method === "POST" || method === "PUT")) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(data);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    options.headers = headers;
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      
      let result;
      try {
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        if (!response.ok) {
          throw new Error(text || response.statusText);
        }
        return text as unknown as T; // Return raw text if not JSON but OK
      }
      
      if (!response.ok) {
        throw new Error(result.errors ? JSON.stringify(result.errors) : (result.message || response.statusText));
      }
      
      return result.data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Connection timed out fetching Proxmox API (${method} ${path})`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
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
  async waitForTask(node: string, upid: string, timeoutMs: number = 300000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const task = await this.getTaskStatus(node, upid);
        if (task && task.status === "stopped") {
          if (task.exitstatus && task.exitstatus !== "OK") {
            throw new Error(`Proxmox task failed: ${task.exitstatus}`);
          }
          return;
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
    return this.request<any>("GET", `/nodes/${node}/tasks/${upid}/status`);
  }

  async getTaskLog(node: string, upid: string, start: number = 0, limit: number = 500) {
    return this.request<any>("GET", `/nodes/${node}/tasks/${encodeURIComponent(upid)}/log?start=${start}&limit=${limit}`);
  }
  


  async getVMTasks(node: string, vmid: number, limit: number = 50) {
    // We can list all tasks for a node and filter by vmid, as Proxmox API has `/nodes/{node}/tasks?vmid={vmid}`
    return this.request<any>("GET", `/nodes/${node}/tasks?vmid=${vmid}&limit=${limit}`);
  }

  // --- Backups ---
  async getBackups(node: string, storage: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${node}/storage/${storage}/content?content=backup&vmid=${vmid}`);
  }

  async createBackup(node: string, vmid: number, storage: string) {
    return this.request<any>("POST", `/nodes/${node}/vzdump`, {
      vmid: vmid.toString(),
      storage: storage,
      mode: "snapshot",
      compress: "zstd"
    });
  }

  async restoreBackup(node: string, vmid: number, archive: string) {
    return this.request<any>("POST", `/nodes/${node}/qemu`, {
      vmid: vmid,
      archive: archive,
      force: 1
    });
  }

  async deleteBackup(node: string, storage: string, volume: string) {
    return this.request<any>("DELETE", `/nodes/${node}/storage/${storage}/content/${volume}`);
  }

  // --- Snapshots ---
  async getVMSnapshots(node: string, vmid: number) {
    return this.request<any>("GET", `/nodes/${node}/qemu/${vmid}/snapshot`);
  }

  async createVMSnapshot(node: string, vmid: number, snapname: string, description?: string, vmstate: boolean = false) {
    const payload: any = { snapname };
    if (description) payload.description = description;
    if (vmstate) payload.vmstate = 1;
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/snapshot`, payload);
  }

  async rollbackVMSnapshot(node: string, vmid: number, snapname: string) {
    return this.request<any>("POST", `/nodes/${node}/qemu/${vmid}/snapshot/${snapname}/rollback`);
  }

  async deleteVMSnapshot(node: string, vmid: number, snapname: string) {
    return this.request<any>("DELETE", `/nodes/${node}/qemu/${vmid}/snapshot/${snapname}`);
  }

  async updateVMSnapshot(node: string, vmid: number, snapname: string, description: string) {
    return this.request<any>("PUT", `/nodes/${node}/qemu/${vmid}/snapshot/${snapname}/config`, { description });
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

