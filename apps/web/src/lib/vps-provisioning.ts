import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { sendVpsProvisionedEmail } from "@/lib/email";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { K3sProvisioningService } from "@/lib/k3s-provisioning";
import fs from "fs";
import path from "path";

class VpsResourceMutex {
  private static lock = Promise.resolve();

  static async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    let release: () => void;
    const newLock = new Promise<void>(resolve => { release = resolve; });
    const oldLock = this.lock;
    this.lock = oldLock.then(() => newLock);
    await oldLock;
    try {
      return await task();
    } finally {
      release!();
    }
  }
}

export class VpsProvisioningService {
  /**
   * Finds the next available IP in the pool that is NOT the gateway and NOT already assigned.
   */
  static async allocateIp(poolId: number): Promise<string> {
    const pool = await prisma.ipPool.findUnique({
      where: { id: poolId },
      include: { assignedIps: true }
    });

    if (!pool) throw new Error("IP Pool not found");
    if (!pool.startIp || !pool.endIp) throw new Error("IP Pool is missing startIp or endIp range");

    const startParts = pool.startIp.split('.').map(Number);
    const endParts = pool.endIp.split('.').map(Number);

    // Convert IP to a numeric value for easy iteration (IPv4 only for simplicity in this example)
    const ipToNum = (parts: number[]) => (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    const numToIp = (num: number) => [
      (num >>> 24) & 255,
      (num >>> 16) & 255,
      (num >>> 8) & 255,
      num & 255
    ].join('.');

    let startNum = ipToNum(startParts);
    let endNum = ipToNum(endParts);

    const assignedIps = new Set(pool.assignedIps.map(a => a.ipAddress));

    for (let i = startNum; i <= endNum; i++) {
      const candidateIp = numToIp(i);
      if (candidateIp !== pool.gateway && !assignedIps.has(candidateIp)) {
        return candidateIp;
      }
    }

    throw new Error("No available IPs in this pool");
  }

  /**
   * Provisions a new VPS.
   */
  static async provisionVps(vpsServiceId: number, options?: { ipv4Count?: number, ipv6Count?: number, reservedIpId?: number, firewallRules?: any, vpcId?: number }) {
    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsServiceId },
      include: { user: true }
    });

    if (!vps) throw new Error("VPS Service not found");

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) throw new Error("No active Proxmox server configured");

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    let { ipv4Count = 1, ipv6Count = 0, reservedIpId, firewallRules, vpcId } = options || {};

    if (!options) {
      // Try to read from initial invoice if options not passed
      const initialInvoice = await prisma.invoice.findFirst({
        where: { vpsServiceId: vps.id, type: 'VPS' },
        orderBy: { createdAt: 'asc' }
      });
      if (initialInvoice && initialInvoice.details) {
        try {
          const details = JSON.parse(initialInvoice.details);
          if (details.ipv4Count !== undefined) ipv4Count = details.ipv4Count;
          if (details.ipv6Count !== undefined) ipv6Count = details.ipv6Count;
          if (details.reservedIpId !== undefined) reservedIpId = details.reservedIpId;
          if (details.firewallRules !== undefined) firewallRules = details.firewallRules;
          if (details.vpcId !== undefined) vpcId = details.vpcId;
        } catch (e) { }
      }
    }

    // VPC details
    let vpcConfig = null;
    let vpcGateway = null;
    if (vpcId || vps.vpcId) {
      const activeVpcId = (vpcId || vps.vpcId) as number;
      vpcConfig = await prisma.vpcNetwork.findUnique({
        where: { id: activeVpcId },
        include: { router: true }
      });
      if (vpcConfig) {
        vpcGateway = vpcConfig.gateway;
      }
    }

    // 1. Allocate IPs
    // 1. Allocate IPs and VMID atomically
    const { allocatedIps, allocatedVpcIp, primaryIp, newVmid } = await VpsResourceMutex.runExclusive(async () => {
      const allocatedIps: Array<{ address: string, version: number, pool: any }> = [];

      if (reservedIpId) {
        // Use Reserved IP
        const reservedIp = await prisma.reservedIp.findUnique({
          where: { id: reservedIpId },
          include: { ipPool: true }
        });
        if (!reservedIp || reservedIp.userId !== vps.userId || reservedIp.isAttached) {
          throw new Error("Reserved IP is invalid or already attached");
        }

        await prisma.reservedIp.update({
          where: { id: reservedIp.id },
          data: { isAttached: true, vpsId: vps.id }
        });

        allocatedIps.push({ address: reservedIp.ipAddress, version: reservedIp.ipPool.version, pool: reservedIp.ipPool });
        await prisma.vpsIpAssignment.create({
          data: { vpsId: vps.id, ipPoolId: reservedIp.ipPoolId, ipAddress: reservedIp.ipAddress, publicIp: reservedIp.publicIp, isPrimary: true }
        });
      } else {
        if (ipv4Count > 0) {
          const pool4 = await prisma.ipPool.findFirst({ where: { version: 4, type: 'PUBLIC' } });
          if (!pool4) throw new Error("No IPv4 pool configured");
          for (let i = 0; i < ipv4Count; i++) {
            const ip = await this.allocateIp(pool4.id);
            const isPrimary = allocatedIps.length === 0;
            allocatedIps.push({ address: ip, version: 4, pool: pool4 });
            await prisma.vpsIpAssignment.create({
              data: { vpsId: vps.id, ipPoolId: pool4.id, ipAddress: ip, isPrimary }
            });
          }
        }

        if (ipv6Count > 0) {
          const pool6 = await prisma.ipPool.findFirst({ where: { version: 6, type: 'PUBLIC' } });
          if (pool6) {
            for (let i = 0; i < ipv6Count; i++) {
              const ip = await this.allocateIp(pool6.id);
              const isPrimary = allocatedIps.length === 0;
              allocatedIps.push({ address: ip, version: 6, pool: pool6 });
              await prisma.vpsIpAssignment.create({
                data: { vpsId: vps.id, ipPoolId: pool6.id, ipAddress: ip, isPrimary }
              });
            }
          }
        }
      }

      // If no IPs and no VPC, we proceed without attaching net0
      // The customer must order an IP or attach VPC later to get network access

      let allocatedVpcIp = vps.vpcIp;
      if (vpcConfig) {
        const existingVpsInVpc = await prisma.vpsService.findMany({
          where: { vpcId: vpcConfig.id, id: { not: vps.id }, status: { not: "TERMINATED" } },
          select: { vpcIp: true }
        });
        const usedIps = new Set(existingVpsInVpc.map(v => v.vpcIp).filter(Boolean));
        usedIps.add(vpcGateway!);

        if (allocatedVpcIp) {
          if (usedIps.has(allocatedVpcIp)) {
            throw new Error(`Requested Private IP ${allocatedVpcIp} is already in use in this VPC.`);
          }
          // Verify it's within the CIDR (basic check)
          const baseIpParts = vpcGateway!.split('.');
          if (!allocatedVpcIp.startsWith(`${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.`)) {
            throw new Error(`Requested Private IP ${allocatedVpcIp} is outside the VPC subnet.`);
          }
        } else {
          // Allocate an IP from the VPC CIDR
          const baseIpParts = vpcGateway!.split('.');
          for (let i = 2; i <= 254; i++) {
            const candidate = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
            if (!usedIps.has(candidate)) {
              allocatedVpcIp = candidate;
              break;
            }
          }
          if (!allocatedVpcIp) {
            throw new Error("No available IPs in VPC");
          }
        }
      }

      const primaryIp = allocatedIps.length > 0 ? allocatedIps[0].address : allocatedVpcIp;

      // 2. Find Next Available VMID starting from 100
      let newVmid = 100;
      const existingVmIds = new Set<number>();
      try {
        // Fetch all cluster resources to avoid conflicts across nodes
        const resources = await proxmox.getClusterResources("vm");
        for (const res of resources) {
          if (res.vmid) existingVmIds.add(res.vmid);
        }
      } catch (err) {
        console.warn("Could not fetch cluster resources, falling back to node VMs", err);
        const nodes = await proxmox.getNodes();
        for (const node of nodes) {
          try {
            const vms = await proxmox.getVms(node.node);
            for (const vm of vms) {
              existingVmIds.add(vm.vmid);
            }
          } catch (e) {
            // Ignore error for individual node
          }
        }
      }

      // Also fetch all VMIDs from the database to avoid conflicts with orphaned or pending records
      const dbVps = await prisma.vpsService.findMany({ select: { vmid: true } });
      for (const v of dbVps) {
        if (v.vmid) existingVmIds.add(v.vmid);
      }

      // Find first available ID starting from 100
      while (existingVmIds.has(newVmid)) {
        newVmid++;
      }

      // 3. Immediately reserve these resources in the database while holding the lock!
      await prisma.vpsService.update({
        where: { id: vps.id },
        data: {
          vmid: newVmid,
          vpcIp: allocatedVpcIp,
          ...(vpcConfig ? { vpcId: vpcConfig.id } : {})
        }
      });

      return { allocatedIps, allocatedVpcIp, primaryIp, newVmid };
    });

    // Get Template VMID
    const template = await prisma.vpsTemplate.findFirst({ where: { name: vps.osTemplate } });
    if (!template) throw new Error("Template not found in DB");

    // 2.5 Anti-Overcommit RAM Check
    try {
      const nodeStatus = await proxmox.getNodeStatus(vps.node);
      if (nodeStatus && nodeStatus.memory) {
        const freeRamBytes = nodeStatus.memory.free;
        const requestedRamBytes = vps.ramGb * 1024 * 1024 * 1024;
        const bufferRamBytes = 2 * 1024 * 1024 * 1024; // 2GB buffer for Proxmox host

        if (freeRamBytes < (requestedRamBytes + bufferRamBytes)) {
          throw new Error(`Insufficient RAM on node '${vps.node}'. Requested: ${vps.ramGb}GB, Available: ${(freeRamBytes / 1024 / 1024 / 1024).toFixed(2)}GB.`);
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes("Insufficient RAM")) {
        throw err; // Re-throw to abort provisioning
      }
      console.warn("Could not check node RAM status, proceeding anyway...", err);
    }

    // 3. Clone Template
    console.log(`Cloning VMID ${template.vmid} to ${newVmid}...`);
    await proxmox.cloneVm(vps.node, template.vmid, newVmid, vps.hostname, vps.storageId);

    // Note: We don't need a static wait here anymore because we'll poll below.

    // 4. Configure Cloud-Init and Resources
    const config: any = {
      cores: vps.cpuCores,
      memory: vps.ramGb * 1024,
      name: vps.hostname,
      vga: "std",
      cpu: "host",
      onboot: 1,
      ciuser: vps.username || "root",
      cipassword: decryptDeterministic(vps.rootPassword) || vps.rootPassword,
      searchdomain: "masdika.id"
    };

    if (server.primaryDns || server.secondaryDns) {
      const dnsServers = [server.primaryDns, server.secondaryDns].filter(Boolean).join(" ");
      if (dnsServers) {
        config.nameserver = dnsServers;
      }
    }

    let sshKeys = "";
    if (vps.sshKey) {
      sshKeys += vps.sshKey.trim() + "\n";
    }

    // Always inject the panel's system SSH key for background management tasks (like K3s provisioning)
    try {
      const systemKeyPath = require("path").join(process.cwd(), "storage", "ssh", "id_rsa.pub");
      if (require("fs").existsSync(systemKeyPath)) {
        const systemKey = require("fs").readFileSync(systemKeyPath, "utf-8").trim();
        sshKeys += systemKey + "\n";
      }
    } catch (err) {
      console.warn("Failed to inject system SSH key:", err);
    }

    if (sshKeys) {
      config.sshkeys = encodeURIComponent(sshKeys.trim());
    }

    // Setup network interfaces for all allocated IPs
    let netIndex = 0;

    if (allocatedIps.length === 0) {
      // If no public IPs are ordered, explicitly delete net0 and ipconfig0 from the cloned template
      config.delete = "net0,ipconfig0";
    } else {
      for (let i = 0; i < allocatedIps.length; i++) {
        if (netIndex === 1 && vpcConfig) {
          // Reserve net1 strictly for VPC
          netIndex++;
        }

        const { address, version, pool } = allocatedIps[i];
        const cidrSuffix = pool.network.split('/')[1] || (version === 4 ? '24' : '64');
        const ipKey = version === 4 ? 'ip' : 'ip6';
        const gwKey = version === 4 ? 'gw' : 'gw6';

        // Use publicNetworkBridge for public IPs if available, otherwise fallback to networkBridge
        const bridgeToUse = pool.type === 'PUBLIC' && server.publicNetworkBridge
          ? server.publicNetworkBridge
          : vps.networkBridge;

        config[`net${netIndex}`] = `model=virtio,bridge=${bridgeToUse},firewall=1`;
        if (vps.cpuCores > 1) {
          config[`net${netIndex}`] += `,queues=${vps.cpuCores}`;
        }
        config[`ipconfig${netIndex}`] = `${ipKey}=${address}/${cidrSuffix},${gwKey}=${pool.gateway}`;
        netIndex++;
      }
    }

    if (vpcConfig && allocatedVpcIp) {
      const cidrSuffix = vpcConfig.cidr.split('/')[1] || '24';
      // VPC ALWAYS uses net1
      config[`net1`] = `model=virtio,bridge=${vpcConfig.router.proxmoxBridge},tag=${vpcConfig.vlanId},firewall=1`;
      if (vps.cpuCores > 1) {
        config[`net1`] += `,queues=${vps.cpuCores}`;
      }

      // If there are no public IPs, VPC must be the gateway to the internet via the Mikrotik router
      if (allocatedIps.length === 0) {
        config[`ipconfig1`] = `ip=${allocatedVpcIp}/${cidrSuffix},gw=${vpcConfig.gateway}`;
      } else {
        // If there are public IPs, don't set a default gateway on the VPC interface to prevent routing issues
        config[`ipconfig1`] = `ip=${allocatedVpcIp}/${cidrSuffix}`;
      }
    }

    console.log(`Configuring VMID ${newVmid} cloud-init...`);

    // Retry loop to wait for clone lock to be released
    let configured = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 5s = 150 seconds max wait

    while (!configured && attempts < maxAttempts) {
      try {
        await proxmox.configVm(vps.node, newVmid, config);
        configured = true;
      } catch (err: any) {
        if (err.message && err.message.includes("can't lock file")) {
          attempts++;
          console.log(`VMID ${newVmid} is locked (cloning in progress). Waiting 5s... (Attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          // If it's a different error, throw it immediately
          throw err;
        }
      }
    }

    if (!configured) {
      throw new Error(`Timeout waiting for VMID ${newVmid} lock to release after clone.`);
    }

    // 4.5 Resize Disk
    console.log(`Resizing VMID ${newVmid} disk to ${vps.diskGb}G...`);
    try {
      const vmConfig = await proxmox.getVmConfig(vps.node, newVmid);
      let targetDisk = "scsi0";
      for (const key of Object.keys(vmConfig)) {
        if (/^(scsi|virtio|sata|ide)\d+$/.test(key)) {
          if (vmConfig[key] && !vmConfig[key].includes("media=cdrom") && !vmConfig[key].includes("cloudinit")) {
            targetDisk = key;
            break;
          }
        }
      }
      await proxmox.resizeVmDisk(vps.node, newVmid, targetDisk, `${vps.diskGb}G`);
      console.log(`Resized ${targetDisk} to ${vps.diskGb}G successfully`);
    } catch (err: any) {
      console.error(`Failed to resize disk for VMID ${newVmid}:`, err);
    }

    // 5. Update DB
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: {
        vmid: newVmid,
        status: vps.kubernetesClusterId ? "INSTALLING_K3S" : "RUNNING"
      }
    });

    // 5.5 Setup IP Filter (Anti-Spoofing)
    console.log(`Setting up IP Filter for VMID ${newVmid}...`);
    try {
      for (let i = 0; i < allocatedIps.length; i++) {
        const { address } = allocatedIps[i];
        const ipSetName = `ipfilter-net${i}`;
        await proxmox.createFirewallIpSet(vps.node, newVmid, ipSetName, `Allowed IPs for net${i}`);
        const cidr = address.includes(":") ? `${address}/128` : `${address}/32`;
        await proxmox.addIpToFirewallIpSet(vps.node, newVmid, cidr, ipSetName, i === 0 ? "Primary IP" : `Secondary IP ${i}`);
      }
    } catch (err: any) {
      console.error(`Failed to setup IP filter for VMID ${newVmid}:`, err);
    }

    // 5.6 Apply User Firewall Rules
    if (firewallRules) {
      console.log(`Applying user firewall rules for VMID ${newVmid}...`);
      try {
        // Enable Firewall on the VM
        await proxmox.updateFirewallOptions(vps.node, newVmid, { enable: 1 });

        const rules = [
          { ruleKey: 'ssh', port: '22' },
          { ruleKey: 'http', port: '80' },
          { ruleKey: 'https', port: '443' }
        ];

        for (const r of rules) {
          const ruleConfig = firewallRules[r.ruleKey];
          if (ruleConfig && ruleConfig.enabled) {
            let source = undefined;
            if (ruleConfig.source === 'custom') {
              source = ruleConfig.customIp;
            } else if (ruleConfig.source !== 'anywhere') {
              source = ruleConfig.source; // this will be the clientIp/32 we processed
            }

            const payload: any = {
              type: 'in',
              action: 'ACCEPT',
              proto: 'tcp',
              dport: r.port,
              enable: 1,
              comment: `Allow ${r.ruleKey.toUpperCase()}`
            };
            if (source) {
              payload.source = source;
            }

            await proxmox.createFirewallRule(vps.node, newVmid, payload);
          }
        }
      } catch (err: any) {
        console.error(`Failed to apply user firewall rules for VMID ${newVmid}:`, err);
      }
    }

    // 5.7 Apply VPC Auto-Firewall Rule
    if (vpcConfig) {
      console.log(`Applying VPC auto-firewall rule for VMID ${newVmid} (CIDR: ${vpcConfig.cidr})...`);
      try {
        await proxmox.updateFirewallOptions(vps.node, newVmid, { enable: 1 });
        await proxmox.createFirewallRule(vps.node, newVmid, {
          type: 'in',
          action: 'ACCEPT',
          source: vpcConfig.cidr,
          enable: 1,
          comment: `Allow internal VPC ${vpcConfig.name} traffic`
        });
      } catch (err: any) {
        console.error(`Failed to apply VPC firewall rule for VMID ${newVmid}:`, err);
      }
    }

    // 5.8 Apply Kubernetes Auto-Firewall Rule
    if (vps.kubernetesClusterId) {
      console.log(`Applying K3s firewall rules for VMID ${newVmid}...`);
      try {
        await proxmox.updateFirewallOptions(vps.node, newVmid, { enable: 1 });

        // Allow Pods Network
        await proxmox.createFirewallRule(vps.node, newVmid, {
          type: 'in',
          action: 'ACCEPT',
          source: '10.42.0.0/16',
          enable: 1,
          comment: 'Allow K3s Pods (10.42.0.0/16)'
        });

        // Allow Services Network
        await proxmox.createFirewallRule(vps.node, newVmid, {
          type: 'in',
          action: 'ACCEPT',
          source: '10.43.0.0/16',
          enable: 1,
          comment: 'Allow K3s Services (10.43.0.0/16)'
        });

        if (vps.kubernetesRole === 'MASTER') {
          await proxmox.createFirewallRule(vps.node, newVmid, {
            type: 'in',
            action: 'ACCEPT',
            proto: 'tcp',
            dport: '6443',
            enable: 1,
            comment: 'Allow Kubernetes API (6443)'
          });
        }
      } catch (err: any) {
        console.error(`Failed to apply K3s API firewall rules for VMID ${newVmid}:`, err);
      }
    }

    // 6. Start VM
    console.log(`Starting VMID ${newVmid}...`);
    let started = false;
    let startAttempts = 0;
    while (!started && startAttempts < 5) {
      try {
        await proxmox.startVm(vps.node, newVmid);
        started = true;
      } catch (err: any) {
        startAttempts++;
        console.log(`Failed to start VMID ${newVmid}, retrying... (Attempt ${startAttempts}/5)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    if (!started) {
      console.error(`Warning: Could not start VMID ${newVmid} after provisioning. User can start it manually.`);
      // We still return success since the VM is built, they can just start it.
    }

    // 7. Send Email
    try {
      const email = decryptDeterministic(vps.user.email) || vps.user.email;
      const name = decryptDeterministic(vps.user.name) || vps.user.name;
      const pass = decryptDeterministic(vps.rootPassword) || vps.rootPassword;
      const isKubernetes = !!vps.kubernetesClusterId;
      await sendVpsProvisionedEmail(email, name, vps.hostname, primaryIp || "N/A", pass, vps.username || "root", isKubernetes, vps.kubernetesClusterId || undefined);
    } catch (emailErr) {
      console.error(`Failed to send VPS provisioned email to ${vps.user.email}:`, emailErr);
    }

    // 8. Trigger Kubernetes Provisioning if applicable
    if (vps.kubernetesClusterId) {
      const rootPassword = decryptDeterministic(vps.rootPassword) || vps.rootPassword;
      // Run in background without awaiting so the order completes fast
      K3sProvisioningService.installK3s(
        vps.id,
        vps.kubernetesClusterId,
        primaryIp || "",
        rootPassword,
        (vps.kubernetesRole as "MASTER" | "WORKER") || "MASTER"
      ).catch(err => console.error("Background K3s Provisioning failed:", err));
    }

    return {
      success: true,
      vmid: newVmid,
      ipAddress: primaryIp
    };
  }

  /**
   * Reinstalls an existing VPS with a new or same template, keeping VMID and IP.
   */
  static async reinstallVps(vpsId: number, newTemplateName: string, newPassword?: string) {
    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId },
      include: { user: true, assignedIps: { include: { ipPool: true } }, vpc: { include: { router: true } } }
    });

    if (!vps) throw new Error("VPS Service not found");
    if (!vps.vmid) throw new Error("VPS is not provisioned on a node yet");

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) throw new Error("No active Proxmox server configured");

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Update status to provisioning
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { status: "PROVISIONING", osTemplate: newTemplateName }
    });

    try {
      // 1. Delete existing VM
      console.log(`Stopping VMID ${vps.vmid} for reinstall...`);
      try {
        await proxmox.stopVm(vps.node, vps.vmid);
        // wait for stop to process
        await new Promise(r => setTimeout(r, 5000));
      } catch (e) { console.warn("Failed to stop VM (might be already stopped)", e); }

      console.log(`Deleting VMID ${vps.vmid} for reinstall...`);
      let deleted = false;
      let deleteAttempts = 0;
      while (!deleted && deleteAttempts < 30) {
        try {
          await proxmox.deleteVm(vps.node, vps.vmid);
          deleted = true;
          // Wait for purge
          await new Promise(r => setTimeout(r, 10000));
        } catch (err: any) {
          if (err.message && err.message.includes("can't lock file")) {
            deleteAttempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else if (err.message && err.message.includes("does not exist")) {
            deleted = true; // already gone
          } else {
            throw err;
          }
        }
      }

      // 2. Clone new template
      const template = await prisma.vpsTemplate.findFirst({ where: { name: newTemplateName } });
      if (!template) throw new Error(`Template ${newTemplateName} not found in DB`);

      console.log(`Cloning VMID ${template.vmid} to existing VMID ${vps.vmid}...`);
      await proxmox.cloneVm(vps.node, template.vmid, vps.vmid, vps.hostname, vps.storageId);

      // 3. Configure Cloud-Init
      const config: any = {
        cores: vps.cpuCores,
        memory: vps.ramGb * 1024,
        name: vps.hostname,
        vga: "std",
        cpu: "host",
        onboot: 1,
        ciuser: "root",
        cipassword: newPassword || (decryptDeterministic(vps.rootPassword) || vps.rootPassword),
        searchdomain: "masdika.id",
      };

      let netIndex = 0;

      if (!vps.assignedIps || vps.assignedIps.length === 0) {
        config.delete = "net0,ipconfig0";
      } else {
        for (let i = 0; i < vps.assignedIps.length; i++) {
          if (netIndex === 1 && vps.vpc) {
            netIndex++; // Reserve net1 for VPC
          }

          const assignment = vps.assignedIps[i];
          const pool = assignment.ipPool;
          const cidrSuffix = pool.network.split('/')[1] || (pool.version === 4 ? '24' : '64');
          const ipKey = pool.version === 4 ? 'ip' : 'ip6';
          const gwKey = pool.version === 4 ? 'gw' : 'gw6';

          const bridgeToUse = pool.type === 'PUBLIC' && server.publicNetworkBridge
            ? server.publicNetworkBridge
            : vps.networkBridge;

          config[`net${netIndex}`] = `model=virtio,bridge=${bridgeToUse},firewall=1`;
          if (vps.cpuCores > 1) {
            config[`net${netIndex}`] += `,queues=${vps.cpuCores}`;
          }
          config[`ipconfig${netIndex}`] = `${ipKey}=${assignment.ipAddress}/${cidrSuffix},${gwKey}=${pool.gateway}`;
          netIndex++;
        }
      }

      if (vps.vpc) {
        const cidrSuffix = vps.vpc.cidr.split('/')[1] || '24';
        config[`net1`] = `model=virtio,bridge=${vps.vpc.router.proxmoxBridge},tag=${vps.vpc.vlanId},firewall=1`;
        if (vps.cpuCores > 1) {
          config[`net1`] += `,queues=${vps.cpuCores}`;
        }
        if (!vps.assignedIps || vps.assignedIps.length === 0) {
          config[`ipconfig1`] = `ip=${vps.vpcIp}/${cidrSuffix},gw=${vps.vpc.gateway}`;
        } else {
          config[`ipconfig1`] = `ip=${vps.vpcIp}/${cidrSuffix}`;
        }
      }

      let sshKeys = "";
      if (vps.sshKey) {
        sshKeys += vps.sshKey.trim() + "\n";
      }

      // Always inject the panel's system SSH key
      try {
        const systemKeyPath = require("path").join(process.cwd(), "storage", "ssh", "id_rsa.pub");
        if (require("fs").existsSync(systemKeyPath)) {
          const systemKey = require("fs").readFileSync(systemKeyPath, "utf-8").trim();
          sshKeys += systemKey + "\n";
        }
      } catch (err) { }

      if (sshKeys) {
        config.sshkeys = encodeURIComponent(sshKeys.trim());
      }

      console.log(`Configuring VMID ${vps.vmid} cloud-init...`);
      let configured = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!configured && attempts < maxAttempts) {
        try {
          await proxmox.configVm(vps.node, vps.vmid, config);
          configured = true;
        } catch (err: any) {
          if (err.message && err.message.includes("can't lock file")) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            throw err;
          }
        }
      }

      // 3.5 Resize Disk
      console.log(`Resizing VMID ${vps.vmid} disk to ${vps.diskGb}G...`);
      try {
        const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
        let targetDisk = "scsi0";
        for (const key of Object.keys(vmConfig)) {
          if (/^(scsi|virtio|sata|ide)\d+$/.test(key)) {
            if (vmConfig[key] && !vmConfig[key].includes("media=cdrom") && !vmConfig[key].includes("cloudinit")) {
              targetDisk = key;
              break;
            }
          }
        }
        await proxmox.resizeVmDisk(vps.node, vps.vmid, targetDisk, `${vps.diskGb}G`);
        console.log(`Resized ${targetDisk} to ${vps.diskGb}G successfully`);
      } catch (err: any) {
        console.error(`Failed to resize disk for VMID ${vps.vmid}:`, err);
      }

      // 4. Start VM
      console.log(`Starting VMID ${vps.vmid} after reinstall...`);
      await proxmox.startVm(vps.node, vps.vmid);

      // Update DB
      const dbUpdateData: any = { status: vps.kubernetesClusterId ? "INSTALLING_K3S" : "RUNNING" };
      if (newPassword) {
        dbUpdateData.rootPassword = encryptDeterministic(newPassword);
      }

      await prisma.vpsService.update({
        where: { id: vps.id },
        data: dbUpdateData
      });

      console.log(`Reinstall of VMID ${vps.vmid} complete!`);

      // 5. Reapply Firewall Rules (IP filter, VPC, K3s)
      try {
        console.log(`Setting up IP Filter for VMID ${vps.vmid}...`);
        for (let i = 0; i < vps.assignedIps.length; i++) {
          const { ipAddress } = vps.assignedIps[i];
          const ipSetName = `ipfilter-net${i}`;
          await proxmox.createFirewallIpSet(vps.node, vps.vmid, ipSetName, `Allowed IPs for net${i}`);
          const cidr = ipAddress.includes(":") ? `${ipAddress}/128` : `${ipAddress}/32`;
          await proxmox.addIpToFirewallIpSet(vps.node, vps.vmid, cidr, ipSetName, i === 0 ? "Primary IP" : `Secondary IP ${i}`);
        }

        if (vps.vpc) {
          console.log(`Applying VPC auto-firewall rule for VMID ${vps.vmid}...`);
          await proxmox.updateFirewallOptions(vps.node, vps.vmid, { enable: 1 });
          await proxmox.createFirewallRule(vps.node, vps.vmid, {
            type: 'in',
            action: 'ACCEPT',
            source: vps.vpc.cidr,
            enable: 1,
            comment: `Allow internal VPC ${vps.vpc.name} traffic`
          });
        }

        if (vps.kubernetesClusterId) {
          console.log(`Applying K3s firewall rules for VMID ${vps.vmid}...`);
          await proxmox.updateFirewallOptions(vps.node, vps.vmid, { enable: 1 });

          await proxmox.createFirewallRule(vps.node, vps.vmid, { type: 'in', action: 'ACCEPT', source: '10.42.0.0/16', enable: 1, comment: 'Allow K3s Pods' });
          await proxmox.createFirewallRule(vps.node, vps.vmid, { type: 'in', action: 'ACCEPT', source: '10.43.0.0/16', enable: 1, comment: 'Allow K3s Services' });

          if (vps.kubernetesRole === 'MASTER') {
            await proxmox.createFirewallRule(vps.node, vps.vmid, { type: 'in', action: 'ACCEPT', proto: 'tcp', dport: '6443', enable: 1, comment: 'Allow Kubernetes API' });
          }
        }
      } catch (err: any) {
        console.error(`Warning: Failed to reapply some firewall rules for VMID ${vps.vmid}:`, err);
      }

      // 6. Trigger K3s Reinstallation if applicable
      if (vps.kubernetesClusterId) {
        console.log(`VPS ${vps.id} belongs to K3s cluster. Starting async K3s provisioning...`);
        const targetPassword = newPassword || decryptDeterministic(vps.rootPassword) || vps.rootPassword;
        const targetIp = vps.assignedIps.length > 0 ? vps.assignedIps[0].ipAddress : vps.vpcIp || '';

        K3sProvisioningService.installK3s(
          vps.id,
          vps.kubernetesClusterId,
          targetIp,
          targetPassword,
          (vps.kubernetesRole as "MASTER" | "WORKER") || "WORKER"
        ).catch(err => {
          console.error(`Failed async K3s re-provision for VPS ${vps.id}:`, err);
        });
      }

    } catch (error) {
      console.error(`Reinstall process failed for VPS ${vps.id}:`, error);
      await prisma.vpsService.update({
        where: { id: vps.id },
        data: { status: "STOPPED" } // Set to stopped so they can retry
      });
      throw error;
    }
  }
}
