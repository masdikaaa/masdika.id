import { RouterOSClient } from 'routeros-client';
import { VpcRouter, VpcNetwork } from '@prisma/client';

// Define a simple Mutex to serialize Mikrotik API calls
class MikrotikMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise(resolve => {
      if (!this.locked) {
        this.locked = true;
        resolve(() => this.release());
      } else {
        this.queue.push(() => {
          this.locked = true;
          resolve(() => this.release());
        });
      }
    });
  }

  private release() {
    this.locked = false;
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

// Ensure the mutex survives Next.js HMR (Hot Module Replacement)
const globalForMikrotik = global as unknown as { mikrotikMutex: MikrotikMutex };
export const mikrotikMutex = globalForMikrotik.mikrotikMutex || new MikrotikMutex();
if (process.env.NODE_ENV !== 'production') globalForMikrotik.mikrotikMutex = mikrotikMutex;

import { EventEmitter } from 'events';
const mikrotikEvents = new EventEmitter();

// Prevent ROS library errors from crashing Next.js process
if (typeof process !== 'undefined') {
  const _originalListeners = process.listeners('uncaughtException');
  // Remove existing listeners that we might have attached previously in dev mode
  _originalListeners.forEach((listener: any) => {
    if (listener.name === 'mikrotikUncaughtHandler') process.removeListener('uncaughtException', listener);
  });

  const mikrotikUncaughtHandler = (err: any) => {
    if (err?.errno === 'UNKNOWNREPLY' || String(err?.message).includes('!empty')) {
      // Tell safeGet to resolve immediately
      mikrotikEvents.emit('empty_reply');
      return; // Suppress
    }
    if (err?.errno === 'SOCKTMOUT' || err?.errno === 'CANTLOGIN') {
      console.error('[Mikrotik] Suppressed uncaughtException:', err?.errno, err?.message);
      return; // Suppress
    }
    // Re-throw for non-mikrotik errors
    throw err;
  };

  process.on('uncaughtException', mikrotikUncaughtHandler);
}

// Safe wrapper for .get() that returns [] on !empty replies instantly

async function safeRemove(menu: any, id: string): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };

    mikrotikEvents.once('empty_reply', finish);
    setTimeout(() => { mikrotikEvents.off('empty_reply', finish); finish(); }, 1500);

    menu.remove(id).then(() => {
      mikrotikEvents.off('empty_reply', finish); finish();
    }).catch(() => {
      mikrotikEvents.off('empty_reply', finish); finish();
    });
  });
}

async function safeGet(menu: any, timeoutMs = 10000): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let isResolved = false;

    const onEmpty = () => {
      if (!isResolved) {
        isResolved = true;
        resolve([]);
      }
    };

    mikrotikEvents.once('empty_reply', onEmpty);

    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        mikrotikEvents.off('empty_reply', onEmpty);
        resolve([]);
      }
    }, timeoutMs);

    menu.get()
      .then((result: any) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          mikrotikEvents.off('empty_reply', onEmpty);
          resolve(Array.isArray(result) ? result : []);
        }
      })
      .catch((e: any) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          mikrotikEvents.off('empty_reply', onEmpty);
          if (e?.errno === 'UNKNOWNREPLY' || String(e?.message).includes('!empty')) {
            resolve([]);
          } else {
            reject(e);
          }
        }
      });
  });
}

export async function getMikrotikClient(router: VpcRouter) {
  const client = new RouterOSClient({
    host: router.host,
    user: router.username,
    password: router.password,
    port: router.apiPort,
    timeout: 60, // Increase socket timeout to 60 seconds (default is 10s)
    tls: router.useSsl ? { rejectUnauthorized: false } : undefined,
  });

  client.on('error', (err: any) => {
    console.error(`[Mikrotik] Connection error for ${router.host}:`, err?.errno || err?.message);
  });

  await client.connect();
  return client;
}

export async function createVpcOnMikrotik(router: VpcRouter, vpc: VpcNetwork, user?: { id: number, name: string }) {
  const release = await mikrotikMutex.acquire();
  try {
    const client = await getMikrotikClient(router);
    try {
      const vlanName = `vlan${vpc.vlanId}`;
      // 0. Validate Interfaces
      const configuredWan = ((router as any).wanInterface || 'ether1').trim();
      const trunkIface = ((router as any).interfaceName || 'ether2').trim();

      const ifaceList = await safeGet(client.api().menu('/interface'));
      const ifaceNames = ifaceList.map((i: any) => i.name);

      if (!ifaceNames.includes(configuredWan)) {
        throw new Error(`WAN Interface '${configuredWan}' does not exist on this router.`);
      }
      if (!ifaceNames.includes(trunkIface)) {
        throw new Error(`Trunk Interface '${trunkIface}' does not exist on this router.`);
      }
      if (!ifaceNames.includes('bridge-vpc')) {
        console.log("bridge-vpc does not exist, creating it automatically...");
        await client.api().menu('/interface/bridge').add({
          name: 'bridge-vpc',
          'vlan-filtering': 'yes',
          comment: 'Auto-created by Masdika Panel for VPCs'
        });

        // Wait a moment for it to register
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Always check if the trunk interface is in the bridge, add if missing
      const bridgePorts = await safeGet(client.api().menu('/interface/bridge/port'));
      const isTrunkInBridge = bridgePorts.some((p: any) => p.interface === trunkIface && p.bridge === 'bridge-vpc');
      if (!isTrunkInBridge) {
        try {
          await client.api().menu('/interface/bridge/port').add({
            bridge: 'bridge-vpc',
            interface: trunkIface,
            comment: 'VPC Trunk Port'
          });
        } catch (e) {
          console.error("Warning: Could not add trunk port to bridge (maybe it's already in another bridge?)", e);
        }
      }

      // 1. Create VLAN Interface
      let comment = `VLAN VPC ${vpc.name.toUpperCase()}`;
      if (user) {
        let decodedName = user.name;
        try {
          const { decryptDeterministic } = await import('./encryption');
          decodedName = decryptDeterministic(decodedName) || decodedName;
        } catch (e) {
          console.error("Failed to decrypt user name for Mikrotik comment", e);
        }
        comment += ` - CUSTOMER: ${decodedName.toUpperCase()} (ID: ${user.id})`;
      }

      await client.api().menu('/interface/vlan').add({
        name: vlanName,
        'vlan-id': vpc.vlanId.toString(),
        interface: 'bridge-vpc',
        comment: comment,
      });

      // Poll until RouterOS fully registers the new interface (max 15 seconds)
      let ifaceReady = false;
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const ifacesList = await safeGet(client.api().menu('/interface'));
        if (ifacesList.some((i: any) => i.name === vlanName)) {
          ifaceReady = true;
          break;
        }
      }
      if (!ifaceReady) {
        throw new Error(`RouterOS did not register interface ${vlanName} after 15 seconds`);
      }

      // 2. Add VLAN to Bridge
      await client.api().menu('/interface/bridge/vlan').add({
        bridge: 'bridge-vpc',
        'vlan-ids': vpc.vlanId.toString(),
        tagged: `bridge-vpc,${trunkIface}`,
        comment: comment,
      });

      // 3. Create VRF (RouterOS v7 will dynamically create the routing table)
      const vrfName = `vrf-vpc-${vpc.vlanId}`;


      await client.api().menu('/ip/vrf').add({
        name: vrfName,
        interfaces: vlanName,
        comment: comment,
      });

      // Wait for RouterOS to create the dynamic routing table
      let rtReady = false;
      for (let attempt = 0; attempt < 15; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const rtList = await safeGet(client.api().menu('/routing/table'));
        if (rtList.some((r: any) => r.name === vrfName)) {
          rtReady = true;
          break;
        }
      }
      if (!rtReady) {
        console.warn(`[Mikrotik] Routing table ${vrfName} did not appear after 15s. Continuing anyway, but routes might fail.`);
      }

      // 4. Add IP Address to VLAN
      await client.api().menu('/ip/address').add({
        address: `${vpc.gateway}/${vpc.cidr.split('/')[1]}`,
        interface: vlanName,
        comment: comment,
      });

      // 4.5. VPC ISOLATION (Block inter-VPC traffic by default)
      // Add this VPC to the global VPC_SUBNETS address list
      try {
        await client.api().menu('/ip/firewall/address-list').add({
          list: 'VPC_SUBNETS',
          address: vpc.cidr,
          comment: `VPC CIDR - ${vpc.name.toUpperCase()}`
        });
      } catch (e: any) {
        if (!e?.message?.includes('already have such entry')) {
          throw e;
        }
      }

      // Jump to peering chain first. If no peering accept rule matches, it falls back and gets dropped.
      // We use src-address because RouterOS v7 has bugs matching in-interface for VRFs in the forward chain.
      await client.api().menu('/ip/firewall/filter').add({
        chain: 'forward',
        'src-address': vpc.cidr,
        'dst-address-list': 'VPC_SUBNETS',
        action: 'jump',
        'jump-target': 'vpc-peering',
        comment: `VPC ISOLATION JUMP - ${vpc.name.toUpperCase()}`
      });

      await client.api().menu('/ip/firewall/filter').add({
        chain: 'forward',
        'src-address': vpc.cidr,
        'dst-address-list': 'VPC_SUBNETS',
        action: 'drop',
        comment: `VPC ISOLATION DROP - ${vpc.name.toUpperCase()}`
      });

      // 5. NAT Gateway (Internet Access)
      if ((vpc as any).isNatEnabled) {
        // Find the main default route gateway IP dynamically
        const routes = await safeGet(client.api().menu('/ip/route'));
        const defaultRoute = routes.find((r: any) =>
          (r['dst-address'] === '0.0.0.0/0' || r.dstAddress === '0.0.0.0/0') &&
          (!r['routing-table'] || r['routing-table'] === 'main' || !r.routingTable || r.routingTable === 'main') &&
          (r.active === 'true' || r.active === true || r.active === 'yes')
        );

        const configuredWan = ((router as any).wanInterface || 'ether1').trim();
        let wanGateway = configuredWan;
        if (defaultRoute && defaultRoute.gateway) {
          wanGateway = defaultRoute.gateway;
        }

        await client.api().menu('/ip/route').add({
          'dst-address': '0.0.0.0/0',
          gateway: `${wanGateway}@main`,
          'routing-table': `vrf-vpc-${vpc.vlanId}`,
          comment: `VPC NAT GATEWAY - ${vpc.name.toUpperCase()}`
        });

        // Router's master masquerade rule handles NAT. We only need route leaking.

        // Connection Tracking using Mangle to allow overlapping subnets across VRFs to use NAT
        // 1. Mark connections originating from this VPC
        await client.api().menu('/ip/firewall/mangle').add({
          chain: 'prerouting',
          'in-interface': vlanName,
          action: 'mark-connection',
          'new-connection-mark': `conn-${vlanName}`,
          passthrough: 'yes',
          comment: `VPC NAT CONN - ${vpc.name.toUpperCase()}`
        });

        // 2. Mark routing for reply traffic coming back from the internet
        await client.api().menu('/ip/firewall/mangle').add({
          chain: 'prerouting',
          'in-interface': configuredWan,
          'connection-mark': `conn-${vlanName}`,
          action: 'mark-routing',
          'new-routing-mark': `vrf-vpc-${vpc.vlanId}`,
          passthrough: 'no',
          comment: `VPC NAT ROUTE - ${vpc.name.toUpperCase()}`
        });

      }
    } catch (e: any) {
      console.error('[Mikrotik] VPC Creation failed, rolling back partial changes...', e?.message);
      try {
        await _deleteVpcFromMikrotik(client, vpc);
      } catch (rollbackErr: any) {
        console.error('[Mikrotik] VPC Rollback failed:', rollbackErr?.message);
      }
      throw e;
    } finally {
      client.close();
    }
  } finally {
    release();
  }
}
export async function toggleVpcNatOnMikrotik(router: VpcRouter, vpc: VpcNetwork, enable: boolean) {
  const release = await mikrotikMutex.acquire();
  try {
    const client = await getMikrotikClient(router);
    try {
      const configuredWan = ((router as any).wanInterface || 'ether1').trim();
      const commentSuffix = `VPC NAT GATEWAY - ${vpc.name.toUpperCase()}`;

      if (enable) {
        try {
          // Find the main default route gateway IP dynamically
          const routes = await safeGet(client.api().menu('/ip/route'));
          const defaultRoute = routes.find((r: any) =>
            (r['dst-address'] === '0.0.0.0/0' || r.dstAddress === '0.0.0.0/0') &&
            (!r['routing-table'] || r['routing-table'] === 'main' || !r.routingTable || r.routingTable === 'main') &&
            (r.active === 'true' || r.active === true || r.active === 'yes')
          );

          let wanGateway = configuredWan;
          if (defaultRoute && defaultRoute.gateway) {
            wanGateway = defaultRoute.gateway;
          }

          // Try to remove old first just in case
          try {
            const routeList = await safeGet(client.api().menu('/ip/route'));
            const oldRoutes = routeList.filter((r: any) => r.comment === commentSuffix || r.comment === `VPC RETURN ROUTE - ${vpc.name.toUpperCase()}`);
            for (const r of oldRoutes) await safeRemove(client.api().menu('/ip/route'), r['.id'] || r.id);
          } catch (e) { }

          const defaultGateway = `${wanGateway}@main`;

          await client.api().menu('/ip/route').add({
            'dst-address': '0.0.0.0/0',
            gateway: defaultGateway,
            'routing-table': `vrf-vpc-${vpc.vlanId}`,
            comment: commentSuffix
          });

          // Router's master masquerade rule handles NAT. We only need route leaking.

          // Connection Tracking using Mangle to allow overlapping subnets across VRFs to use NAT
          const vlanName = `vlan${vpc.vlanId}`;
          await client.api().menu('/ip/firewall/mangle').add({
            chain: 'prerouting',
            'in-interface': vlanName,
            action: 'mark-connection',
            'new-connection-mark': `conn-${vlanName}`,
            passthrough: 'yes',
            comment: `VPC NAT CONN - ${vpc.name.toUpperCase()}`
          });

          await client.api().menu('/ip/firewall/mangle').add({
            chain: 'prerouting',
            'in-interface': configuredWan,
            'connection-mark': `conn-vlan${vpc.vlanId}`,
            action: 'mark-routing',
            'new-routing-mark': `vrf-vpc-${vpc.vlanId}`,
            passthrough: 'no',
            comment: `VPC NAT ROUTE - ${vpc.name.toUpperCase()}`
          });
        } catch (e: any) {
          console.error('[Mikrotik] Failed to enable VPC NAT, rolling back partial changes...', e?.message);
          try {
            await _disableVpcNatOnMikrotik(client, vpc);
          } catch (rollbackErr: any) {
            console.error('[Mikrotik] VPC NAT Rollback failed:', rollbackErr?.message);
          }
          throw e;
        }
      } else {
        await _disableVpcNatOnMikrotik(client, vpc);
      }
    } finally {
      client.close();
    }
  } finally {
    release();
  }
}

async function _disableVpcNatOnMikrotik(client: any, vpc: VpcNetwork) {
  const commentSuffix = `VPC NAT GATEWAY - ${vpc.name.toUpperCase()}`;
  const vrfName = `vrf-vpc-${vpc.vlanId}`;

  try {
    const routeList = await safeGet(client.api().menu('/ip/route'));
    const routesToDelete = routeList.filter((r: any) =>
      (r.comment === commentSuffix && (r['routing-table'] === vrfName || r.routingTable === vrfName)) ||
      (r.gateway && r.gateway.includes(`@${vrfName}`))
    );

    for (const route of routesToDelete) {
      await safeRemove(client.api().menu('/ip/route'), route['.id'] || route.id);
    }
  } catch (e) { }

  try {
    const mangleList = await safeGet(client.api().menu('/ip/firewall/mangle'));
    const manglesToDelete = mangleList.filter((r: any) =>
      r['new-connection-mark'] === `conn-vlan${vpc.vlanId}` ||
      r['connection-mark'] === `conn-vlan${vpc.vlanId}` ||
      r['new-routing-mark'] === vrfName
    );
    for (const m of manglesToDelete) {
      await safeRemove(client.api().menu('/ip/firewall/mangle'), m['.id'] || m.id);
    }
  } catch (e) {
    console.error('[Mikrotik] Error cleaning up Mangle rules:', e);
  }

  try {
    const natList = await safeGet(client.api().menu('/ip/firewall/nat'));
    const natsToDelete = natList.filter((r: any) => r.comment === commentSuffix);
    for (const nat of natsToDelete) {
      await safeRemove(client.api().menu('/ip/firewall/nat'), nat['.id'] || nat.id);
    }
  } catch (e) { }
}

export async function deleteVpcFromMikrotik(router: VpcRouter, vpc: VpcNetwork) {
  const release = await mikrotikMutex.acquire();
  try {
    const client = await getMikrotikClient(router);
    try {
      await _deleteVpcFromMikrotik(client, vpc);
    } finally {
      try { client.close(); } catch (_) { }
    }
  } finally {
    release();
  }
}

async function _deleteVpcFromMikrotik(client: any, vpc: VpcNetwork) {
  try {
    const vlanName = `vlan${vpc.vlanId}`;
    const vpcNameUpper = vpc.name.toUpperCase();
    const baseComment = `VPC: ${vpcNameUpper} - CIDR:`;

    // 0. Remove VPC Isolation Firewall Filters and Address List
    try {
      const addressLists = await safeGet(client.api().menu('/ip/firewall/address-list'));
      const targetLists = addressLists.filter((i: any) =>
        i.list === 'VPC_SUBNETS' && i.comment === `VPC CIDR - ${vpcNameUpper}`
      );
      for (const al of targetLists) {
        await safeRemove(client.api().menu('/ip/firewall/address-list'), al['.id'] || al.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing Address List:', e?.message); }

    try {
      const filters = await safeGet(client.api().menu('/ip/firewall/filter'));
      const targetFilters = filters.filter((i: any) =>
        i.comment === `VPC ISOLATION JUMP - ${vpcNameUpper}` ||
        i.comment === `VPC ISOLATION DROP - ${vpcNameUpper}`
      );
      for (const filter of targetFilters) {
        await safeRemove(client.api().menu('/ip/firewall/filter'), filter['.id'] || filter.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing Isolation Filter:', e?.message); }



    // 1. Remove all routes referencing this VRF (including NAT and Peering routes)
    try {
      const vrfName = `vrf-vpc-${vpc.vlanId}`;
      const routeList = await safeGet(client.api().menu('/ip/route'));
      const routesToDelete = routeList.filter((r: any) =>
        r['routing-table'] === vrfName || r.routingTable === vrfName ||
        (r.gateway && r.gateway.includes(`@${vrfName}`))
      );
      for (const route of routesToDelete) {
        await safeRemove(client.api().menu('/ip/route'), route['.id'] || route.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing Route:', e?.message); }

    // 2. Remove Mangle Rules safely using unique connection/routing marks or exact comments
    try {
      const vrfName = `vrf-vpc-${vpc.vlanId}`;
      const mangleList = await safeGet(client.api().menu('/ip/firewall/mangle'));
      const manglesToDelete = mangleList.filter((r: any) =>
        r['new-connection-mark'] === `conn-vlan${vpc.vlanId}` || r.newConnectionMark === `conn-vlan${vpc.vlanId}` ||
        r['connection-mark'] === `conn-vlan${vpc.vlanId}` || r.connectionMark === `conn-vlan${vpc.vlanId}` ||
        r['new-routing-mark'] === vrfName || r.newRoutingMark === vrfName ||
        r.comment === `VPC NAT CONN - ${vpcNameUpper}` ||
        r.comment === `VPC NAT ROUTE - ${vpcNameUpper}`
      );
      for (const m of manglesToDelete) {
        await safeRemove(client.api().menu('/ip/firewall/mangle'), m['.id'] || m.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing Mangle Rule:', e?.message); }

    // 2.5 Remove NAT Rules (legacy cleanup)
    try {
      const natList = await safeGet(client.api().menu('/ip/firewall/nat'));
      const natsToDelete = natList.filter((r: any) =>
        r.comment === `VPC NAT GATEWAY - ${vpcNameUpper}` ||
        r.comment === `VPC RETURN ROUTE - ${vpcNameUpper}`
      );
      for (const nat of natsToDelete) {
        await safeRemove(client.api().menu('/ip/firewall/nat'), nat['.id'] || nat.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing NAT Rule:', e?.message); }

    // 3. Remove IP Address
    try {
      const ipList = await safeGet(client.api().menu('/ip/address'));
      const targetIp = ipList.filter((i: any) => i.interface === vlanName || (i.comment && i.comment.startsWith(baseComment)));
      for (const ip of targetIp) {
        await safeRemove(client.api().menu('/ip/address'), ip['.id'] || ip.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing IP:', e?.message); }

    // 4. Remove VRF & Routing Table
    try {
      const vrfList = await safeGet(client.api().menu('/ip/vrf'));
      const targetVrf = vrfList.filter((i: any) => i.name === `vrf-vpc-${vpc.vlanId}` || (i.comment && i.comment.startsWith(baseComment)));
      for (const vrf of targetVrf) {
        await safeRemove(client.api().menu('/ip/vrf'), vrf['.id'] || vrf.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing VRF:', e?.message); }

    try {
      const rtList = await safeGet(client.api().menu('/routing/table'));
      const targetRt = rtList.filter((i: any) => i.name === `vrf-vpc-${vpc.vlanId}` || (i.comment && i.comment.startsWith(baseComment)));
      for (const rt of targetRt) {
        await safeRemove(client.api().menu('/routing/table'), rt['.id'] || rt.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing Routing Table:', e?.message); }

    // 5. Remove Bridge VLAN
    try {
      const bridgeVlanList = await safeGet(client.api().menu('/interface/bridge/vlan'));
      const targetBridgeVlan = bridgeVlanList.filter((i: any) =>
        (i.bridge === 'bridge-vpc' && (Number(i['vlan-ids']) === Number(vpc.vlanId) || Number(i.vlanIds) === Number(vpc.vlanId))) ||
        (i.comment && i.comment.startsWith(baseComment))
      );
      for (const bvlan of targetBridgeVlan) {
        await safeRemove(client.api().menu('/interface/bridge/vlan'), bvlan['.id'] || bvlan.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing Bridge VLAN:', e?.message); }

    // 6. Remove VLAN Interface
    try {
      const vlanList = await safeGet(client.api().menu('/interface/vlan'));
      const targetVlan = vlanList.filter((i: any) => i.name === vlanName || (i.comment && i.comment.startsWith(baseComment)));
      for (const vl of targetVlan) {
        await safeRemove(client.api().menu('/interface/vlan'), vl['.id'] || vl.id);
      }
    } catch (e: any) { console.error('[Mikrotik] Error removing VLAN Interface:', e?.message); }

  } catch (e: any) {
    console.error('[Mikrotik] General Error in _deleteVpcFromMikrotik:', e?.message);
  }
}

export async function createVpcPeeringOnMikrotik(router: VpcRouter, vpcA: VpcNetwork, vpcB: VpcNetwork, peeringId: number) {
  const release = await mikrotikMutex.acquire();
  try {
    const client = await getMikrotikClient(router);
    try {
      const vrfA = `vrf-vpc-${vpcA.vlanId}`;
      const vrfB = `vrf-vpc-${vpcB.vlanId}`;
      // 1. Route Leaking (RouterOS v7 native way)
      // Add route for VPC-B subnet into VPC-A's VRF routing table
      await client.api().menu('/ip/route').add({
        'dst-address': vpcB.cidr,
        'gateway': `vlan${vpcB.vlanId}@vrf-vpc-${vpcB.vlanId}`,
        'routing-table': vrfA,
        comment: `VPC PEERING (ID: ${peeringId}) - ${vpcA.name} TO ${vpcB.name}`
      });

      // Add route for VPC-A subnet into VPC-B's VRF routing table
      await client.api().menu('/ip/route').add({
        'dst-address': vpcA.cidr,
        'gateway': `vlan${vpcA.vlanId}@vrf-vpc-${vpcA.vlanId}`,
        'routing-table': vrfB,
        comment: `VPC PEERING (ID: ${peeringId}) - ${vpcB.name} TO ${vpcA.name}`
      });

      // 2. Add Firewall Filters for cross-VRF traffic inside vpc-peering chain
      await client.api().menu('/ip/firewall/filter').add({
        chain: 'vpc-peering',
        'src-address': vpcA.cidr,
        'dst-address': vpcB.cidr,
        action: 'accept',
        comment: `VPC PEERING (ID: ${peeringId}) - ALLOW ${vpcA.name.toUpperCase()} TO ${vpcB.name.toUpperCase()}`
      });

      await client.api().menu('/ip/firewall/filter').add({
        chain: 'vpc-peering',
        'src-address': vpcB.cidr,
        'dst-address': vpcA.cidr,
        action: 'accept',
        comment: `VPC PEERING (ID: ${peeringId}) - ALLOW ${vpcB.name.toUpperCase()} TO ${vpcA.name.toUpperCase()}`
      });
    } catch (e: any) {
      console.error('[Mikrotik] VPC Peering creation failed, rolling back...', e?.message);
      try {
        await _deleteVpcPeeringFromMikrotik(client, peeringId);
      } catch (rollbackErr: any) {
        console.error('[Mikrotik] VPC Peering Rollback failed:', rollbackErr?.message);
      }
      throw e;
    } finally {
      try { client.close(); } catch (_) { }
    }
  } finally {
    release();
  }
}

export async function deleteVpcPeeringFromMikrotik(router: VpcRouter, peeringId: number) {
  const release = await mikrotikMutex.acquire();
  try {
    const client = await getMikrotikClient(router);
    try {
      await _deleteVpcPeeringFromMikrotik(client, peeringId);
    } finally {
      try { client.close(); } catch (_) { }
    }
  } finally {
    release();
  }
}

async function _deleteVpcPeeringFromMikrotik(client: any, peeringId: number) {
  // 1. Remove Firewall Filters
  try {
    const filters = await safeGet(client.api().menu('/ip/firewall/filter'));

    const targetFilters = filters.filter((i: any) => i.comment && i.comment.startsWith(`VPC PEERING (ID: ${peeringId})`));
    for (const filter of targetFilters) {
      try { await safeRemove(client.api().menu('/ip/firewall/filter'), filter['.id'] || filter.id); } catch (e: any) { console.error('[Mikrotik] Error removing peering filter:', e?.message); }
    }
  } catch (e: any) { console.error('[Mikrotik] Error getting firewall filters:', e?.message); }

  // 2. Remove Static Routes (Route Leaking)
  try {
    const routes = await safeGet(client.api().menu('/ip/route'));
    const targetRoutes = routes.filter((i: any) => i.comment && i.comment.startsWith(`VPC PEERING (ID: ${peeringId})`));
    for (const route of targetRoutes) {
      try { await safeRemove(client.api().menu('/ip/route'), route['.id'] || route.id); } catch (e: any) { console.error('[Mikrotik] Error removing peering route:', e?.message); }
    }
  } catch (e: any) { console.error('[Mikrotik] Error getting routes:', e?.message); }
}
