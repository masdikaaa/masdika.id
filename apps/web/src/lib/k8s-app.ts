import crypto from 'crypto';
import { Writable } from 'stream';
import * as k8s from '@kubernetes/client-node';
import { prisma } from './prisma';
import { decryptDeterministic, encryptDeterministic } from './encryption';
import { getAppDefinition } from './app-catalog';
import { validateClusterOrStorageEndpoint } from './ssrf';

export interface AppServiceRecord {
  id: number;
  userId: number;
  name: string;
  appType: string;
  templateName: string;
  planName: string;
  region: string;
  node: string;
  subdomain: string;
  host: string;
  port: number;
  appPort: number;
  username?: string | null;
  password?: string | null;
  apiKey?: string | null;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  billingMode: string;
  monthlyPrice: number;
  hourlyRate: number;
  accumulatedCost: number;
  status: string;
  k8sNamespace?: string | null;
  k8sDeployment?: string | null;
  k8sService?: string | null;
  k8sPvc?: string | null;
  k8sIngress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppClusterConfig {
  authMode: 'KUBECONFIG' | 'TOKEN';
  apiServer: string;
  kubeconfig?: string;
  serviceToken?: string;
  skipTlsVerify: boolean;
  caCert?: string;
  publicDomain: string;
  publicIp: string;
}

export interface AppClusterCapacity {
  available: boolean;
  status: 'OPTIMAL' | 'WARNING' | 'FULL' | 'OFFLINE';
  capacityPercent: number;
  activeInstances: number;
  maxInstances: number;
  allocatedCpu: number;
  totalCpu: number;
  cpuPercent: number;
  allocatedMemoryMb: number;
  totalMemoryMb: number;
  memoryPercent: number;
  allocatedStorageGb: number;
  totalStorageGb: number;
  storagePercent: number;
  availablePorts: number;
  totalPorts: number;
  publicDomain?: string;
  publicIp?: string;
  reason?: string;
  userMessage?: string;
}

/**
 * Check cluster resource capacity for Managed Applications (8 Core CPU, 16 GB RAM, 60 GB Disk).
 * Prevents oversubscription and prevents order placement when cluster resources are full.
 */
export async function checkAppClusterCapacity(
  requestedCpu = 0,
  requestedRamMb = 0,
  requestedDiskGb = 0
): Promise<AppClusterCapacity> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'managed_app_capacity_full',
          'managed_app_maintenance_mode',
          'managed_app_max_instances',
          'managed_app_max_cpu',
          'managed_app_max_ram_gb',
          'managed_app_max_disk_gb',
        ],
      },
    },
  });

  const settingMap = new Map<string, string>();
  for (const s of settings) {
    settingMap.set(s.key, s.value);
  }

  const isManuallyFull = settingMap.get('managed_app_capacity_full') === 'true' || settingMap.get('managed_app_maintenance_mode') === 'true';

  // Active instances in DB (exclude terminated or error instances)
  const activeApps = await prisma.appService.findMany({
    where: { status: { notIn: ['TERMINATED', 'ERROR'] } },
    select: { id: true, port: true, cpuShares: true, memoryMb: true, storageGb: true },
  });

  const activeInstances = activeApps.length;
  const allocatedCpu = parseFloat(activeApps.reduce((sum, a) => sum + (a.cpuShares || 0), 0).toFixed(1));
  const allocatedMemoryMb = activeApps.reduce((sum, a) => sum + (a.memoryMb || 0), 0);
  const allocatedStorageGb = activeApps.reduce((sum, a) => sum + (a.storageGb || 10), 0);
  const usedPorts = new Set(activeApps.map((a) => a.port));
  const totalPorts = 2768; // NodePort range 30000 - 32767
  const availablePorts = Math.max(0, totalPorts - usedPorts.size);

  // Dedicated Hardware Server Specs: 8 Cores CPU, 16 GB RAM (16384 MB), 60 GB Disk
  const customMaxInstances = parseInt(settingMap.get('managed_app_max_instances') || '', 10);
  const customMaxCpu = parseFloat(settingMap.get('managed_app_max_cpu') || '');
  const customMaxRamGb = parseFloat(settingMap.get('managed_app_max_ram_gb') || '');
  const customMaxDiskGb = parseFloat(settingMap.get('managed_app_max_disk_gb') || '');

  const totalCpu = !isNaN(customMaxCpu) && customMaxCpu > 0 ? customMaxCpu : 8.0;
  const totalMemoryMb = !isNaN(customMaxRamGb) && customMaxRamGb > 0 ? customMaxRamGb * 1024 : 16384;
  const totalStorageGb = !isNaN(customMaxDiskGb) && customMaxDiskGb > 0 ? customMaxDiskGb : 60;
  const maxInstances = !isNaN(customMaxInstances) && customMaxInstances > 0 ? customMaxInstances : 20;

  const cpuPercent = totalCpu > 0 ? Math.min(100, Math.round((allocatedCpu / totalCpu) * 100)) : 100;
  const memoryPercent = totalMemoryMb > 0 ? Math.min(100, Math.round((allocatedMemoryMb / totalMemoryMb) * 100)) : 100;
  const storagePercent = totalStorageGb > 0 ? Math.min(100, Math.round((allocatedStorageGb / totalStorageGb) * 100)) : 100;
  const instancePercent = maxInstances > 0 ? Math.min(100, Math.round((activeInstances / maxInstances) * 100)) : 100;

  const capacityPercent = Math.max(cpuPercent, memoryPercent, storagePercent, instancePercent);
  const clusterConfig = await getAppClusterConfig().catch(() => null);
  const publicDomain = clusterConfig?.publicDomain || '';
  const publicIp = clusterConfig?.publicIp || '';

  if (isManuallyFull) {
    return {
      available: false,
      status: 'FULL',
      capacityPercent: 100,
      activeInstances,
      maxInstances,
      allocatedCpu,
      totalCpu,
      cpuPercent: 100,
      allocatedMemoryMb,
      totalMemoryMb,
      memoryPercent: 100,
      allocatedStorageGb,
      totalStorageGb,
      storagePercent: 100,
      availablePorts,
      totalPorts,
      publicDomain,
      publicIp,
      reason: 'Application provisioning paused by administrator',
      userMessage: 'The Managed Applications cluster is temporarily undergoing maintenance or capacity expansion. New application deployments are temporarily paused.',
    };
  }

  // Check if requested resources exceed capacity
  const wouldExceedCpu = (allocatedCpu + requestedCpu) > totalCpu;
  const wouldExceedRam = (allocatedMemoryMb + requestedRamMb) > totalMemoryMb;
  const wouldExceedStorage = (allocatedStorageGb + requestedDiskGb) > totalStorageGb;
  const wouldExceedInstances = (activeInstances + 1) > maxInstances;
  const noPortsAvailable = availablePorts <= 0;

  if (wouldExceedCpu || wouldExceedRam || wouldExceedStorage || wouldExceedInstances || noPortsAvailable) {
    let reason = 'Cluster resources are full';
    let userMessage = 'The Managed Applications cluster has reached full compute/storage capacity. Deployment is paused until existing resources are scaled down or terminated.';
    if (wouldExceedCpu) {
      reason = `vCPU limit reached (${allocatedCpu}/${totalCpu} cores allocated)`;
      userMessage = `Server vCPU capacity reached (${totalCpu} cores max). Please choose a smaller compute plan or try again later.`;
    } else if (wouldExceedRam) {
      reason = `RAM limit reached (${(allocatedMemoryMb / 1024).toFixed(1)}/${(totalMemoryMb / 1024).toFixed(1)} GB allocated)`;
      userMessage = `Server RAM capacity reached (${(totalMemoryMb / 1024).toFixed(0)} GB max). Please choose a smaller compute plan or try again later.`;
    } else if (wouldExceedStorage) {
      reason = `Storage limit reached (${allocatedStorageGb}/${totalStorageGb} GB allocated)`;
      userMessage = `Server storage capacity reached (${totalStorageGb} GB max). Deployment is paused until storage is freed.`;
    } else if (noPortsAvailable) {
      reason = 'No NodePorts available in 30000-32767 range';
      userMessage = 'All service ports in the cluster are currently assigned.';
    }

    return {
      available: false,
      status: 'FULL',
      capacityPercent: 100,
      activeInstances,
      maxInstances,
      allocatedCpu,
      totalCpu,
      cpuPercent,
      allocatedMemoryMb,
      totalMemoryMb,
      memoryPercent,
      allocatedStorageGb,
      totalStorageGb,
      storagePercent,
      availablePorts,
      totalPorts,
      publicDomain,
      publicIp,
      reason,
      userMessage,
    };
  }

  const status: 'OPTIMAL' | 'WARNING' = capacityPercent >= 80 ? 'WARNING' : 'OPTIMAL';
  return {
    available: true,
    status,
    capacityPercent,
    activeInstances,
    maxInstances,
    allocatedCpu,
    totalCpu,
    cpuPercent,
    allocatedMemoryMb,
    totalMemoryMb,
    memoryPercent,
    allocatedStorageGb,
    totalStorageGb,
    storagePercent,
    availablePorts,
    totalPorts,
    publicDomain,
    publicIp,
  };
}

// In-memory cache for cluster configuration (60 seconds TTL)
let cachedAppClusterConfig: AppClusterConfig | null = null;
let appClusterConfigExpiry = 0;

/**
 * Invalidate the cluster configuration in-memory cache so updates take effect immediately.
 */
export function invalidateAppClusterConfigCache(): void {
  cachedAppClusterConfig = null;
  appClusterConfigExpiry = 0;
}

/**
 * Dynamically retrieve Kubernetes cluster credentials for Managed Apps from Database Settings.
 */
export async function getAppClusterConfig(forceRefresh = false): Promise<AppClusterConfig> {
  const now = Date.now();
  if (!forceRefresh && cachedAppClusterConfig && now < appClusterConfigExpiry) {
    return cachedAppClusterConfig;
  }

  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'managed_app_auth_mode',
          'managed_app_api_server',
          'managed_app_kubeconfig',
          'managed_app_service_token',
          'managed_app_skip_tls',
          'managed_app_ca_cert',
          'managed_app_public_domain',
          'managed_app_public_ip',
        ],
      },
    },
  });

  const settingMap = new Map<string, string>();
  for (const s of settings) {
    settingMap.set(s.key, s.value);
  }

  const authMode = (settingMap.get('managed_app_auth_mode') || 'KUBECONFIG') as 'KUBECONFIG' | 'TOKEN';
  const apiServer = settingMap.get('managed_app_api_server') || process.env.MANAGED_APP_API_SERVER || '';

  const rawKubeconfig = settingMap.get('managed_app_kubeconfig') || process.env.MANAGED_APP_KUBECONFIG || '';
  const kubeconfig = rawKubeconfig.startsWith('enc:') ? (decryptDeterministic(rawKubeconfig) || rawKubeconfig) : rawKubeconfig;

  const rawToken = settingMap.get('managed_app_service_token') || process.env.MANAGED_APP_SERVICE_TOKEN || '';
  const serviceToken = rawToken.startsWith('enc:') ? (decryptDeterministic(rawToken) || rawToken) : rawToken;

  const skipTlsSetting = settingMap.get('managed_app_skip_tls');
  const skipTlsVerify = skipTlsSetting !== undefined ? skipTlsSetting === 'true' : true;
  const caCert = settingMap.get('managed_app_ca_cert') || process.env.MANAGED_APP_CA_CERT || '';

  const publicDomain = settingMap.get('managed_app_public_domain') || process.env.MANAGED_APP_PUBLIC_DOMAIN || 'app.masdika.id';
  const publicIp = settingMap.get('managed_app_public_ip') || process.env.MANAGED_APP_PUBLIC_IP || '';

  cachedAppClusterConfig = {
    authMode,
    apiServer,
    kubeconfig,
    serviceToken,
    skipTlsVerify,
    caCert,
    publicDomain,
    publicIp,
  };
  appClusterConfigExpiry = now + 60000;

  return cachedAppClusterConfig;
}

/**
 * Build an authenticated KubeConfig instance from DB settings
 */
export async function getAppKubeConfig(): Promise<k8s.KubeConfig> {
  const config = await getAppClusterConfig();
  const kc = new k8s.KubeConfig();

  if (config.authMode === 'KUBECONFIG' && config.kubeconfig && config.kubeconfig.trim().length > 0) {
    kc.loadFromString(config.kubeconfig.trim());
    if (config.apiServer && config.apiServer.trim().length > 0) {
      const cluster = kc.getCurrentCluster();
      if (cluster) {
        (cluster as any).server = config.apiServer.trim();
        if (config.skipTlsVerify) (cluster as any).skipTLSVerify = true;
      }
    }
  } else if (config.serviceToken && config.apiServer) {
    kc.loadFromClusterAndUser(
      {
        name: 'managed-apps-cluster',
        server: config.apiServer.trim(),
        skipTLSVerify: config.skipTlsVerify,
        caData: config.caCert ? Buffer.from(config.caCert).toString('base64') : undefined,
      },
      {
        name: 'managed-apps-user',
        token: config.serviceToken.trim(),
      }
    );
  } else {
    if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
      try {
        kc.loadFromCluster();
      } catch {
        throw new Error('Kubernetes API configuration is missing for Managed Apps. Please configure Kubeconfig or API Server in Admin Settings.');
      }
    } else {
      throw new Error('Kubernetes API configuration is missing for Managed Apps. Please configure Kubeconfig or API Server in Admin Settings.');
    }
  }

  return kc;
}

/**
 * Get native K8s typed API clients
 */
export async function getAppK8sClients() {
  const kc = await getAppKubeConfig();
  return {
    kc,
    coreApi: kc.makeApiClient(k8s.CoreV1Api),
    appsApi: kc.makeApiClient(k8s.AppsV1Api),
    netApi: kc.makeApiClient(k8s.NetworkingV1Api),
    customApi: kc.makeApiClient(k8s.CustomObjectsApi),
  };
}

/**
 * Test Kubernetes connection for Managed Apps cluster
 */
export async function testAppClusterConnection(customConfig?: {
  apiServer?: string;
  kubeconfig?: string;
  serviceToken?: string;
  skipTlsVerify?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  nodes?: string[];
  latencyMs?: number;
}> {
  const startTime = Date.now();
  try {
    const kc = new k8s.KubeConfig();

    let kubeconfig = customConfig?.kubeconfig;
    let apiServer = customConfig?.apiServer;
    let serviceToken = customConfig?.serviceToken;
    let skipTls = customConfig?.skipTlsVerify ?? true;

    const isMaskedKubeconfig = !kubeconfig || kubeconfig === '••••••••' || kubeconfig.trim().length === 0;
    const isMaskedToken = !serviceToken || serviceToken === '••••••••' || serviceToken.trim().length === 0;

    // Fallback to active saved DB configuration if not provided or masked
    if (isMaskedKubeconfig && isMaskedToken) {
      const activeConfig = await getAppClusterConfig();
      if (apiServer && apiServer.trim() && activeConfig.apiServer && apiServer.trim() !== activeConfig.apiServer.trim()) {
        return {
          success: false,
          message: 'Explicit Kubeconfig YAML or Service Token is required when testing a different API Server URL.',
          latencyMs: Date.now() - startTime,
        };
      }
      kubeconfig = activeConfig.kubeconfig;
      if (!apiServer) apiServer = activeConfig.apiServer;
      if (!serviceToken) serviceToken = activeConfig.serviceToken;
      skipTls = activeConfig.skipTlsVerify;
    }

    if (kubeconfig && kubeconfig !== '••••••••' && kubeconfig.trim().length > 0) {
      kc.loadFromString(kubeconfig.trim());
      if (kc.getUsers().some((u: any) => Boolean(u?.exec))) {
        return {
          success: false,
          message: 'Kubeconfig exec auth plugins are not permitted for security reasons.',
          latencyMs: Date.now() - startTime,
        };
      }
      if (apiServer && apiServer.trim().length > 0) {
        const cluster = kc.getCurrentCluster();
        if (cluster) {
          (cluster as any).server = apiServer.trim();
          if (skipTls) (cluster as any).skipTLSVerify = true;
        }
      }
    } else if (serviceToken && serviceToken !== '••••••••' && apiServer) {
      kc.loadFromClusterAndUser(
        {
          name: 'managed-apps-cluster',
          server: apiServer.trim(),
          skipTLSVerify: skipTls,
        },
        {
          name: 'managed-apps-user',
          token: serviceToken.trim(),
        }
      );
    } else {
      return {
        success: false,
        message: 'No Kubeconfig YAML or API Server configuration provided for Managed Apps.',
        latencyMs: Date.now() - startTime,
      };
    }

    const targetServer = kc.getCurrentCluster()?.server;
    if (!targetServer) {
      return {
        success: false,
        message: 'No cluster server URL found in Kubeconfig.',
        latencyMs: Date.now() - startTime,
      };
    }
    await validateClusterOrStorageEndpoint(targetServer, 'Kubernetes API Server');

    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const nodeRes = await coreApi.listNode();
    const items = (nodeRes as any).items || (nodeRes as any).body?.items || [];
    const latencyMs = Date.now() - startTime;
    const nodes = items.map((n: any) => n.metadata?.name || 'unknown');

    return {
      success: true,
      message: `Connected successfully to Managed Apps cluster via Kubernetes API (${latencyMs}ms). Found ${nodes.length} node(s).`,
      nodes,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: err.message || 'Failed to connect to Managed Apps Kubernetes cluster',
      latencyMs,
    };
  }
}

// Mutex queue and in-memory reservation cache for collision-free atomic port allocation during concurrent orders
let appPortAllocationQueue = Promise.resolve();
const recentlyReservedAppPorts = new Map<number, number>(); // port -> expiresAt

/**
 * Release an in-memory reserved port (e.g. if order transaction fails before saving)
 */
export function releaseReservedAppPort(port: number): void {
  recentlyReservedAppPorts.delete(port);
}

export function reserveAppPort(port: number, ttlMs = 120_000): void {
  recentlyReservedAppPorts.set(port, Date.now() + ttlMs);
}

/**
 * Allocate a collision-free random available NodePort in the standard range (30000..32767).
 * Standard Kubernetes NodePort range: 30000..32767 (2,768 ports).
 * Fully atomic and race-condition protected: concurrent orders will never collide or pick the same port.
 */
export async function allocateAppPort(min = 30000, max = 32767): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    appPortAllocationQueue = appPortAllocationQueue
      .then(async () => {
        // 1. Clean up expired in-memory reservations (older than 120s)
        const now = Date.now();
        for (const [p, exp] of recentlyReservedAppPorts.entries()) {
          if (exp < now) {
            recentlyReservedAppPorts.delete(p);
          }
        }

        // 2. Query active app records in database (non-terminated)
        const usedApps = await prisma.appService.findMany({
          where: { status: { not: 'TERMINATED' } },
          select: { port: true },
        });

        const usedPorts = new Set<number>();
        usedApps.forEach((a) => usedPorts.add(a.port));

        // 3. Add currently locked in-memory ports
        for (const p of recentlyReservedAppPorts.keys()) {
          usedPorts.add(p);
        }

        // 4. Scan live Kubernetes cluster for active NodePorts across all namespaces
        try {
          const config = await getAppClusterConfig();
          const hasClusterConfig =
            (config.kubeconfig && config.kubeconfig.trim().length > 0) ||
            (config.serviceToken && config.apiServer) ||
            Boolean(process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT);

          if (hasClusterConfig) {
            const { coreApi } = await getAppK8sClients();
            const svcRes = await (coreApi as any).listServiceForAllNamespaces();
            const items = svcRes.items || svcRes.body?.items || [];
            for (const item of items) {
              const ports = item.spec?.ports || [];
              for (const p of ports) {
                if (p.nodePort) {
                  usedPorts.add(p.nodePort);
                }
              }
            }
          }
        } catch {
          // Cluster API might be unreachable; proceed with database records
        }

        // 5. Scan requested range (30000..32767)
        const availablePorts: number[] = [];
        for (let port = min; port <= max; port++) {
          if (!usedPorts.has(port)) {
            availablePorts.push(port);
          }
        }

        if (availablePorts.length === 0) {
          throw new Error(`No available NodePort remaining in application cluster range (${min}-${max})`);
        }

        // 6. Select a random available port from the safe candidates using cryptographic randomness
        const randomIndex = crypto.randomInt(0, availablePorts.length);
        const chosenPort = availablePorts[randomIndex];

        // 7. Lock this port in-memory for 120 seconds so subsequent concurrent orders skip it
        recentlyReservedAppPorts.set(chosenPort, now + 120_000);

        return chosenPort;
      })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Dynamically apply multi-document Kubernetes YAML manifests using native K8s API
 */
export async function applyKubernetesManifests(kc: k8s.KubeConfig, manifestYaml: string): Promise<void> {
  const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
  const specs = k8s.loadAllYaml(manifestYaml) as k8s.KubernetesObject[];

  for (const spec of specs) {
    if (!spec || !spec.kind || !spec.metadata?.name) continue;

    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete (spec.metadata.annotations as any)['kubectl.kubernetes.io/last-applied-configuration'];
    spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(spec);

    try {
      await objApi.create(spec);
    } catch (createErr: any) {
      const status = createErr.statusCode || createErr.code || createErr.response?.statusCode || createErr.body?.code;
      if (status === 409) {
        try {
          await objApi.patch(spec);
        } catch {
          if (spec.kind === 'Service' && spec.metadata?.name) {
            const existing = await objApi.read({
              apiVersion: spec.apiVersion || 'v1',
              kind: 'Service',
              metadata: {
                name: spec.metadata.name,
                namespace: spec.metadata.namespace || 'default',
              },
            }).catch(() => null) as any;
            if (existing?.metadata?.resourceVersion) {
              spec.metadata.resourceVersion = existing.metadata.resourceVersion;
            }
            if (existing?.spec?.clusterIP && (spec as any).spec) {
              (spec as any).spec.clusterIP = existing.spec.clusterIP;
            }
          }
          await objApi.replace(spec);
        }
      } else {
        throw createErr;
      }
    }
  }
}

const B64_PKG_RESTRICT_APK = Buffer.from(
  '#!/bin/sh\necho "Security Notice: Package installation (apk) is restricted on Masdika Cloud Managed Applications." >&2\nexit 1\n'
).toString('base64');

const B64_PKG_RESTRICT_APT = Buffer.from(
  '#!/bin/sh\necho "Security Notice: Package installation (apt/dpkg) is restricted on Masdika Cloud Managed Applications." >&2\nexit 1\n'
).toString('base64');

/**
 * Shared hardened sshd bootstrap lines (disables port/agent/X11/TUN forwarding to block SSH VPN tunneling).
 */
function buildHardenedSshdSnippet(sshPassword: string): string {
  return [
    `            ssh-keygen -A`,
    `            echo "root:${sshPassword}" | chpasswd`,
    `            sed -i 's/#*PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config`,
    `            grep -q '^PermitRootLogin yes' /etc/ssh/sshd_config || echo "PermitRootLogin yes" >> /etc/ssh/sshd_config`,
    `            grep -q '^PasswordAuthentication yes' /etc/ssh/sshd_config || echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config`,
    `            grep -q '^AllowTcpForwarding no' /etc/ssh/sshd_config || echo "AllowTcpForwarding no" >> /etc/ssh/sshd_config`,
    `            grep -q '^X11Forwarding no' /etc/ssh/sshd_config || echo "X11Forwarding no" >> /etc/ssh/sshd_config`,
    `            grep -q '^AllowAgentForwarding no' /etc/ssh/sshd_config || echo "AllowAgentForwarding no" >> /etc/ssh/sshd_config`,
    `            grep -q '^PermitTunnel no' /etc/ssh/sshd_config || echo "PermitTunnel no" >> /etc/ssh/sshd_config`,
    `            grep -q '^GatewayPorts no' /etc/ssh/sshd_config || echo "GatewayPorts no" >> /etc/ssh/sshd_config`,
  ].join('\n');
}

/**
 * Shared OS package manager lockdown executed after initial runtime bootstrap.
 */
function buildPkgLockdownSnippet(pm: 'apk' | 'apt'): string {
  if (pm === 'apk') {
    return [
      `            rm -rf /etc/apk /var/cache/apk /lib/apk`,
      `            echo "${B64_PKG_RESTRICT_APK}" | base64 -d > /sbin/apk`,
      `            chmod 755 /sbin/apk`,
    ].join('\n');
  }
  return [
    `            rm -rf /var/cache/apt /var/lib/apt/lists /etc/apt/sources.list*`,
    `            echo "${B64_PKG_RESTRICT_APT}" | base64 -d > /usr/bin/apt`,
    `            echo "${B64_PKG_RESTRICT_APT}" | base64 -d > /usr/bin/apt-get`,
    `            echo "${B64_PKG_RESTRICT_APT}" | base64 -d > /usr/bin/dpkg`,
    `            chmod 755 /usr/bin/apt /usr/bin/apt-get /usr/bin/dpkg`,
  ].join('\n');
}

/**
 * Build App environment variables and startup command according to App Type
 */
export function buildAppContainerSpec(
  app: AppServiceRecord,
  domainBase?: string,
  options?: { trustedProxies?: string[] }
) {
  const appType = app.appType.toLowerCase();
  const catalogItem = getAppDefinition(appType);
  const dataMount = catalogItem?.dataDir || '/app/data';
  const effectiveBase = domainBase || 'app.masdika.id';
  const fullDomain = `${app.subdomain}.${effectiveBase}`;

  let image = catalogItem?.defaultImage || 'docker.io/library/node:22-alpine';
  let envYaml = '';
  let commandYaml = '';
  const securityContextYaml = `
        securityContext:
          ${appType === 'openclaw' ? 'runAsUser: 0\n          ' : ''}capabilities:
            drop:
              - NET_ADMIN
              - NET_RAW
              - SYS_ADMIN
              - SYS_MODULE`;

  if (appType === 'n8n') {
    image = 'docker.io/n8nio/n8n:latest';
    envYaml = `
        - name: N8N_PORT
          value: "${app.appPort}"
        - name: N8N_HOST
          value: "0.0.0.0"
        - name: N8N_PROTOCOL
          value: "https"
        - name: WEBHOOK_URL
          value: "https://${fullDomain}/"
        - name: N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS
          value: "true"
        - name: GENERIC_TIMEZONE
          value: "Asia/Jakarta"
        - name: N8N_PAYLOAD_SIZE_MAX
          value: "64"
`;
  } else if (appType === 'hermes') {
    image = 'docker.io/library/python:3.12-slim';
    const sshPassword = app.password || 'Hermes123!';
    const authUser = app.username || 'root';
    const authSecret = crypto
      .createHash('sha256')
      .update(`${app.id}-${app.subdomain}-${sshPassword}`)
      .digest('hex');

    envYaml = `
        - name: HERMES_HOME
          value: "/app/data/.hermes"
        - name: PATH
          value: "/app/data/venv/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin"
        - name: HERMES_DASHBOARD_BASIC_AUTH_USERNAME
          value: "${authUser}"
        - name: HERMES_DASHBOARD_BASIC_AUTH_PASSWORD
          value: "${sshPassword}"
        - name: HERMES_DASHBOARD_BASIC_AUTH_SECRET
          value: "${authSecret}"
`;

    const b64HermesMotd = Buffer.from(
      '════════════════════════════════════════════════════════════\n' +
      '  Masdika Cloud - Dedicated Hermes Agent Instance\n' +
      '  Application Mode: Production AI Coding Agent (Web + SSH)\n' +
      `  Web Dashboard: https://${fullDomain} (User: ${authUser})\n` +
      '  Persistent Storage: /app/data\n' +
      '  Security Notice: Package installation & tunneling restricted.\n' +
      '\n' +
      '  Quickstart Commands:\n' +
      '    hermes model      -> Set up LLM provider & API keys\n' +
      '    hermes setup      -> Run interactive configuration wizard\n' +
      `    hermes dashboard  -> Web dashboard running at https://${fullDomain}\n` +
      '    hermes            -> Start autonomous agent loop\n' +
      '════════════════════════════════════════════════════════════\n'
    ).toString('base64');

    const b64HermesProfile = Buffer.from(
      'export PATH="/app/data/venv/bin:$PATH"\n' +
      'export HERMES_HOME="/app/data/.hermes"\n' +
      'cd /app/data 2>/dev/null || true\n'
    ).toString('base64');

    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            set -e
            export DEBIAN_FRONTEND=noninteractive
            if [ -f /etc/apt/sources.list ] || [ -d /etc/apt/sources.list.d ]; then
              apt-get update
              apt-get install -y --no-install-recommends openssh-server ca-certificates procps bash git curl nano nodejs
            fi
            mkdir -p /run/sshd /var/run/sshd ${dataMount} /app/data/.hermes
            rm -rf /root/.hermes && ln -sfn /app/data/.hermes /root/.hermes
${buildHardenedSshdSnippet(sshPassword)}
${buildPkgLockdownSnippet('apt')}
            echo "${b64HermesMotd}" | base64 -d > /etc/motd
            echo "${b64HermesProfile}" | base64 -d > /etc/profile.d/hermes.sh
            grep -q 'HERMES_HOME' /root/.bashrc 2>/dev/null || cat /etc/profile.d/hermes.sh >> /root/.bashrc
            grep -q 'HERMES_HOME' /root/.profile 2>/dev/null || cat /etc/profile.d/hermes.sh >> /root/.profile
            grep -q 'HERMES_HOME' /etc/profile 2>/dev/null || cat /etc/profile.d/hermes.sh >> /etc/profile
            /usr/sbin/sshd -p 22
            if [ ! -x /app/data/venv/bin/pip ]; then
              python3 -m venv /app/data/venv
            fi
            /app/data/venv/bin/pip install --no-cache-dir --upgrade pip "hermes-agent[web]" >> /app/data/hermes-setup.log 2>&1 || /app/data/venv/bin/pip install --no-cache-dir --upgrade "hermes-agent" uvicorn fastapi >> /app/data/hermes-setup.log 2>&1
            ln -sf /app/data/venv/bin/hermes /usr/local/bin/hermes
            ln -sf /app/data/venv/bin/hermes-agent /usr/local/bin/hermes-agent
            set +e
            while true; do
              pgrep -x sshd >/dev/null 2>&1 || /usr/sbin/sshd -p 22
              /app/data/venv/bin/hermes dashboard --host 0.0.0.0 --port 9119 --no-open --skip-build >> /app/data/hermes-dashboard.log 2>&1 || /app/data/venv/bin/hermes dashboard --host 0.0.0.0 --port 9119 --no-open >> /app/data/hermes-dashboard.log 2>&1
              sleep 3
            done
`;
  } else if (appType === 'ninerouter') {
    image = 'docker.io/decolua/9router:latest';
    const initialPassword = app.password || '123456';
    envYaml = `
        - name: PORT
          value: "${app.appPort}"
        - name: HOSTNAME
          value: "0.0.0.0"
        - name: DATA_DIR
          value: "${dataMount}"
        - name: NODE_ENV
          value: "production"
        - name: INITIAL_PASSWORD
          value: "${initialPassword}"
`;
    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            (timeout 60 npm install -g 9router@latest --prefer-online --no-audit --no-fund 2>/dev/null && \\
             if [ -d /usr/local/lib/node_modules/9router/app ]; then \\
               cp -a /usr/local/lib/node_modules/9router/app/. /app/ 2>/dev/null || true; \\
             fi || true) && \\
            exec /entrypoint.sh node custom-server.js
`;
  } else if (appType === 'omniroute') {
    image = 'docker.io/diegosouzapw/omniroute:latest';
    const initialPassword = app.password || '123456';
    envYaml = `
        - name: PORT
          value: "${app.appPort}"
        - name: HOSTNAME
          value: "0.0.0.0"
        - name: DATA_DIR
          value: "${dataMount}"
        - name: NODE_ENV
          value: "production"
        - name: INITIAL_PASSWORD
          value: "${initialPassword}"
        - name: DASHBOARD_PASSWORD
          value: "${initialPassword}"
`;
  } else if (appType === 'uptimekuma') {
    image = 'docker.io/louislam/uptime-kuma:2';
    envYaml = `
        - name: UPTIME_KUMA_PORT
          value: "${app.appPort}"
        - name: DATA_DIR
          value: "${dataMount}/"
`;
  } else if (appType === 'qwenpaw') {
    image = 'docker.io/agentscope/qwenpaw:latest';
    const authUser = app.username || 'admin';
    const authPassword = app.password || 'QwenPaw123!';
    envYaml = `
        - name: QWENPAW_PORT
          value: "${app.appPort}"
        - name: QWENPAW_AUTH_ENABLED
          value: "true"
        - name: QWENPAW_AUTH_USERNAME
          value: "${authUser}"
        - name: QWENPAW_AUTH_PASSWORD
          value: "${authPassword}"
`;
  } else if (appType === 'opencode') {
    image = 'docker.io/library/node:22-alpine';
    const sshPassword = app.password || 'OpenCode123!';
    const authUser = app.username || 'root';
    const webPort = app.appPort && app.appPort !== 22 ? app.appPort : 4096;
    const b64OpenCodeMotd = Buffer.from(
      '════════════════════════════════════════════════════════════\n' +
      '  Masdika Cloud - Dedicated OpenCode Instance\n' +
      '  Application Mode: Browser Web UI & SSH Coding Environment\n' +
      `  Web Dashboard: https://${fullDomain} (User: ${authUser})\n` +
      '  Persistent Storage: /workspace\n' +
      '  Security Notice: Package installation & tunneling restricted.\n' +
      '\n' +
      '  Quickstart Commands:\n' +
      '    opencode auth login  -> Connect OpenAI / Anthropic / Zen / API keys\n' +
      '    opencode             -> Launch interactive OpenCode AI workspace\n' +
      '    opencode --help      -> View all CLI options\n' +
      '════════════════════════════════════════════════════════════\n'
    ).toString('base64');

    const b64OpenCodeProfile = Buffer.from(
      'export PATH="/root/.opencode/bin:/usr/local/bin:$PATH"\n' +
      'cd /workspace 2>/dev/null || true\n'
    ).toString('base64');

    envYaml = `
        - name: HOME
          value: "/root"
        - name: PATH
          value: "/root/.opencode/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin"
        - name: OPENCODE_SERVER_USERNAME
          value: "${authUser}"
        - name: OPENCODE_SERVER_PASSWORD
          value: "${sshPassword}"
`;

    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            set -e
            if [ -d /etc/apk ]; then
              apk add --no-cache openssh bash git curl nano tar gzip libstdc++ libgcc ripgrep
            fi
            mkdir -p /run/sshd /var/run/sshd /etc/profile.d ${dataMount} /workspace/.opencode/home/bin /workspace/.opencode/share /workspace/.opencode/config /root/.local/share /root/.config
            rm -rf /root/.opencode /root/.local/share/opencode /root/.config/opencode
            ln -sfn /workspace/.opencode/home /root/.opencode
            ln -sfn /workspace/.opencode/share /root/.local/share/opencode
            ln -sfn /workspace/.opencode/config /root/.config/opencode
${buildHardenedSshdSnippet(sshPassword)}
${buildPkgLockdownSnippet('apk')}
            echo "${b64OpenCodeMotd}" | base64 -d > /etc/motd
            echo "${b64OpenCodeProfile}" | base64 -d > /etc/profile.d/opencode.sh
            grep -q '/root/.opencode/bin' /root/.bashrc 2>/dev/null || cat /etc/profile.d/opencode.sh >> /root/.bashrc
            grep -q '/root/.opencode/bin' /root/.profile 2>/dev/null || cat /etc/profile.d/opencode.sh >> /root/.profile
            grep -q '/root/.opencode/bin' /etc/profile 2>/dev/null || cat /etc/profile.d/opencode.sh >> /etc/profile
            /usr/sbin/sshd -p 22
            if [ -x /root/.opencode/bin/opencode ]; then
              ln -sf /root/.opencode/bin/opencode /usr/local/bin/opencode
              chmod +x /root/.opencode/bin/opencode
            fi
            export SHELL=/bin/bash HOME=/root
            if [ ! -x /root/.opencode/bin/opencode ] && ! command -v opencode >/dev/null 2>&1; then
              (curl -fsSL https://opencode.ai/install | bash -s -- --no-modify-path >> /workspace/.opencode/setup.log 2>&1 || npm install -g opencode-ai@latest --no-audit --no-fund >> /workspace/.opencode/setup.log 2>&1) || true
              npm cache clean --force >/dev/null 2>&1 || true
            fi
            if [ -x /root/.opencode/bin/opencode ]; then
              ln -sf /root/.opencode/bin/opencode /usr/local/bin/opencode
              chmod +x /root/.opencode/bin/opencode
            fi
            set +e
            while true; do
              pidof sshd >/dev/null 2>&1 || /usr/sbin/sshd -p 22
              if ! command -v opencode >/dev/null 2>&1; then
                (curl -fsSL https://opencode.ai/install | bash -s -- --no-modify-path >> /workspace/.opencode/setup.log 2>&1 || npm install -g opencode-ai@latest --no-audit --no-fund >> /workspace/.opencode/setup.log 2>&1) || true
                [ -x /root/.opencode/bin/opencode ] && ln -sf /root/.opencode/bin/opencode /usr/local/bin/opencode && chmod +x /root/.opencode/bin/opencode
              fi
              if command -v opencode >/dev/null 2>&1; then
                cd /workspace && opencode serve --hostname 0.0.0.0 --port ${webPort} --cors "https://${fullDomain}" >> /workspace/.opencode/web.log 2>&1
              fi
              sleep 3
            done
`;
  } else if (appType === 'openclaw') {
    image = 'ghcr.io/openclaw/openclaw:latest';
    const gatewayToken = app.password || 'OpenClaw123!';
    const webPort = app.appPort && app.appPort !== 22 && app.appPort !== 3000 ? app.appPort : 18789;
    const maxOldSpace = Math.max(384, Math.round((app.memoryMb || 2048) * 0.45));

    const trustedProxiesList = options?.trustedProxies?.map((s) => s.trim()).filter(Boolean) || [];
    const effectiveTrustedProxies = trustedProxiesList.length > 0 ? trustedProxiesList : ['10.42.0.9'];

    envYaml = `
        - name: HOME
          value: "/home/node"
        - name: OPENCLAW_HOME
          value: "/home/node"
        - name: OPENCLAW_STATE_DIR
          value: "/home/node/.openclaw"
        - name: OPENCLAW_GATEWAY_TOKEN
          value: "${gatewayToken}"
        - name: OPENCLAW_GATEWAY_PORT
          value: "${webPort}"
        - name: OPENCLAW_TRUSTED_PROXIES
          value: "${effectiveTrustedProxies.join(',')}"
        - name: NODE_OPTIONS
          value: "--max-old-space-size=${maxOldSpace}"
`;

    const b64OpenClawMotd = Buffer.from(
      '════════════════════════════════════════════════════════════\n' +
      '  Masdika Cloud - Dedicated OpenClaw Gateway Instance\n' +
      '  Application Mode: Browser Control UI + Multi-Channel CLI\n' +
      `  Control UI: https://${fullDomain}\n` +
      '  Persistent Storage: /home/node/.openclaw\n' +
      '  Security Notice: Package installation & tunneling restricted.\n' +
      '\n' +
      '  First-Time Browser Pairing & Quickstart:\n' +
      '    openclaw devices approve --latest  -> Approve browser after opening Control UI\n' +
      '    openclaw devices list              -> View paired / pending browsers\n' +
      '    openclaw onboard                   -> Interactive LLM & channel setup\n' +
      '    openclaw channels login            -> Connect WhatsApp / Telegram / Discord\n' +
      '════════════════════════════════════════════════════════════\n'
    ).toString('base64');

    const b64OpenClawProfile = Buffer.from(
      'export HOME="/home/node"\n' +
      'export OPENCLAW_HOME="/home/node"\n' +
      'export OPENCLAW_STATE_DIR="/home/node/.openclaw"\n' +
      `export OPENCLAW_GATEWAY_TOKEN="${gatewayToken}"\n` +
      `export OPENCLAW_GATEWAY_PORT="${webPort}"\n` +
      `export NODE_OPTIONS="--max-old-space-size=${maxOldSpace}"\n` +
      'cd /home/node/.openclaw 2>/dev/null || true\n'
    ).toString('base64');

    const b64OpenClawConfigInit = Buffer.from(
      `const fs = require("fs");\n` +
      `const p = "/home/node/.openclaw/openclaw.json";\n` +
      `let cfg = {};\n` +
      `try { cfg = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}\n` +
      `cfg.gateway = cfg.gateway || {};\n` +
      `cfg.gateway.mode = cfg.gateway.mode || "local";\n` +
      `cfg.gateway.bind = "lan";\n` +
      `cfg.gateway.port = Number(process.env.OPENCLAW_GATEWAY_PORT || ${webPort});\n` +
      `cfg.gateway.auth = { mode: "token", token: process.env.OPENCLAW_GATEWAY_TOKEN };\n` +
      `const rawProxies = (process.env.OPENCLAW_TRUSTED_PROXIES || "").split(",").map((s) => s.trim()).filter(Boolean);\n` +
      `if (rawProxies.length > 0) cfg.gateway.trustedProxies = rawProxies;\n` +
      `cfg.gateway.controlUi = cfg.gateway.controlUi || {};\n` +
      `cfg.gateway.controlUi.enabled = true;\n` +
      `const origins = new Set(Array.isArray(cfg.gateway.controlUi.allowedOrigins) ? cfg.gateway.controlUi.allowedOrigins : []);\n` +
      `origins.add("https://${fullDomain}");\n` +
      `cfg.gateway.controlUi.allowedOrigins = Array.from(origins);\n` +
      `fs.writeFileSync(p, JSON.stringify(cfg, null, 2));\n`
    ).toString('base64');

    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            set -e
            export DEBIAN_FRONTEND=noninteractive
            if [ -f /etc/apt/sources.list ] || [ -d /etc/apt/sources.list.d ]; then
              apt-get update -qq && apt-get install -y -qq --no-install-recommends openssh-server procps ca-certificates >/dev/null
            fi
            mkdir -p /run/sshd /var/run/sshd /etc/profile.d ${dataMount}
${buildHardenedSshdSnippet(gatewayToken)}
${buildPkgLockdownSnippet('apt')}
            echo "${b64OpenClawMotd}" | base64 -d > /etc/motd
            echo "${b64OpenClawProfile}" | base64 -d > /etc/profile.d/openclaw.sh
            grep -q 'OPENCLAW_GATEWAY_TOKEN' /root/.bashrc 2>/dev/null || cat /etc/profile.d/openclaw.sh >> /root/.bashrc
            grep -q 'OPENCLAW_GATEWAY_TOKEN' /root/.profile 2>/dev/null || cat /etc/profile.d/openclaw.sh >> /root/.profile
            grep -q 'OPENCLAW_GATEWAY_TOKEN' /etc/profile 2>/dev/null || cat /etc/profile.d/openclaw.sh >> /etc/profile
            echo "${b64OpenClawConfigInit}" | base64 -d | node -
            /usr/sbin/sshd -p 22
            set +e
            while true; do
              pidof sshd >/dev/null 2>&1 || /usr/sbin/sshd -p 22
              node /app/openclaw.mjs gateway --port ${webPort} --bind lan >> /home/node/.openclaw/gateway.log 2>&1
              sleep 3
            done
`;
  }

  return {
    image,
    dataMount,
    envYaml,
    commandYaml,
    securityContextYaml,
  };
}

/**
 * Deploy Managed App Pod, PVC, Service, and Let's Encrypt Ingress to Kubernetes
 */
export async function deployAppService(app: AppServiceRecord): Promise<{
  deploymentName: string;
  serviceName: string;
  pvcName: string;
  ingressName: string;
  fullDomain: string;
}> {
  const kc = await getAppKubeConfig();
  const clusterConfig = await getAppClusterConfig().catch(() => null);
  const effectiveBase = clusterConfig?.publicDomain || 'app.masdika.id';
  const ns = 'managed-apps';
  const name = `app-${app.id}-${app.subdomain}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
  const fullDomain = `${app.subdomain}.${effectiveBase}`;

  // 1. Ensure Namespace exists
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  try {
    await coreApi.readNamespace({ name: ns });
  } catch {
    try {
      await coreApi.createNamespace({
        body: {
          metadata: {
            name: ns,
            labels: { 'managed-by': 'masdika-cloud' },
          },
        },
      });
    } catch (e: any) {
      if (e.statusCode !== 409) throw e;
    }
  }

  let openclawTrustedProxies: string[] | undefined;
  if (app.appType.toLowerCase() === 'openclaw') {
    try {
      const kubeSystemPods = await coreApi.listNamespacedPod({ namespace: 'kube-system' });
      const traefikIps = (kubeSystemPods.items || [])
        .filter((p) => {
          const podName = p.metadata?.name || '';
          const appLabel = p.metadata?.labels?.['app.kubernetes.io/name'] || p.metadata?.labels?.app || '';
          return (
            (appLabel === 'traefik' || /^traefik-[a-z0-9-]+$/i.test(podName)) &&
            p.status?.phase === 'Running' &&
            Boolean(p.status?.podIP)
          );
        })
        .map((p) => p.status!.podIP!)
        .filter(Boolean);
      if (traefikIps.length > 0) {
        openclawTrustedProxies = traefikIps;
      }
    } catch {
      // Fall back to default ingress proxy IP when cluster pod lookup is unavailable
    }
  }

  const { image, dataMount, envYaml, commandYaml, securityContextYaml } = buildAppContainerSpec(app, effectiveBase, {
    trustedProxies: openclawTrustedProxies,
  });
  const catalogItem = getAppDefinition(app.appType);
  const appTypeLower = app.appType.toLowerCase();
  const isHermes = appTypeLower === 'hermes';
  const isOpencode = appTypeLower === 'opencode';
  const isOpenclaw = appTypeLower === 'openclaw';
  const isNinerouter = appTypeLower === 'ninerouter';
  const isOmniroute = appTypeLower === 'omniroute';
  const isDualWebSsh = catalogItem?.accessProtocol === 'BOTH' || isHermes || isOpencode || isOpenclaw;
  const hasWeb = catalogItem?.accessProtocol === 'WEB' || isDualWebSsh;
  const isPureSsh = catalogItem?.accessProtocol === 'SSH' && !isDualWebSsh;
  const isExtendedBoot = isDualWebSsh || isNinerouter || isOmniroute;
  const serviceType = isDualWebSsh || isPureSsh ? 'NodePort' : 'ClusterIP';

  const cpuReq = `${Math.max(0.1, Number((app.cpuShares * 0.4).toFixed(2)))}`;
  const cpuLim = `${app.cpuShares}`;
  const memReq = `${Math.max(128, Math.round(app.memoryMb * 0.5))}Mi`;
  const memLim = `${app.memoryMb}Mi`;
  const storageSize = `${Math.max(5, app.storageGb || 10)}Gi`;

  const webBackendPort = isHermes
    ? 9119
    : isOpencode
      ? (app.appPort && app.appPort !== 22 ? app.appPort : 4096)
      : isOpenclaw
        ? (app.appPort && app.appPort !== 22 && app.appPort !== 3000 ? app.appPort : 18789)
        : app.appPort;

  const ingressYaml = hasWeb ? `
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ing-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    traefik.ingress.kubernetes.io/router.entrypoints: websecure,web
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - ${fullDomain}
    secretName: tls-${app.subdomain}
  rules:
  - host: ${fullDomain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: svc-${name}
            port:
              number: ${webBackendPort}
` : '';

  const containerPortsYaml = isDualWebSsh
    ? `        ports:
        - name: ssh-port
          containerPort: 22
        - name: web-port
          containerPort: ${webBackendPort}`
    : `        ports:
        - name: app-port
          containerPort: ${app.appPort}`;

  const servicePortsYaml = isDualWebSsh
    ? `  ports:
  - name: web
    port: ${webBackendPort}
    targetPort: ${webBackendPort}
  - name: ssh
    port: 22
    targetPort: 22
    nodePort: ${app.port}`
    : isPureSsh
      ? `  ports:
  - name: app-port
    port: ${app.appPort}
    targetPort: ${app.appPort}
    nodePort: ${app.port}`
      : `  ports:
  - name: app-port
    port: ${app.appPort}
    targetPort: ${app.appPort}`;

  const readinessProbePort = isDualWebSsh ? webBackendPort : app.appPort;
  const livenessProbePort = isDualWebSsh ? 22 : app.appPort;

  const manifestYaml = `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${storageSize}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deploy-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
        managed-by: masdika-cloud
    spec:
      restartPolicy: Always
      securityContext:
        fsGroup: 1000
      containers:
      - name: ${name}
        image: ${image}
        imagePullPolicy: Always
${containerPortsYaml}${securityContextYaml}${commandYaml}${envYaml ? `\n        env:${envYaml}` : ''}
${isExtendedBoot ? `        startupProbe:
          tcpSocket:
            port: ${readinessProbePort}
          initialDelaySeconds: 15
          periodSeconds: 5
          failureThreshold: 60
` : ''}        readinessProbe:
          tcpSocket:
            port: ${readinessProbePort}
          initialDelaySeconds: 15
          periodSeconds: ${isExtendedBoot ? 5 : 10}
          failureThreshold: ${isExtendedBoot ? 60 : 6}
        livenessProbe:
          tcpSocket:
            port: ${livenessProbePort}
          initialDelaySeconds: ${isExtendedBoot ? 60 : 30}
          periodSeconds: 15
          failureThreshold: 6
        resources:
          requests:
            cpu: "${cpuReq}"
            memory: "${memReq}"
            ephemeral-storage: "256Mi"
          limits:
            cpu: "${cpuLim}"
            memory: "${memLim}"
            ephemeral-storage: "2Gi"
        volumeMounts:
${appTypeLower === 'qwenpaw' ? `        - name: app-storage
          mountPath: /app/working
          subPath: working
        - name: app-storage
          mountPath: /app/working.secret
          subPath: working-secret
        - name: app-storage
          mountPath: /app/working.backups
          subPath: working-backups` : `        - name: app-storage
          mountPath: ${dataMount}`}
      volumes:
      - name: app-storage
        persistentVolumeClaim:
          claimName: pvc-${name}
---
apiVersion: v1
kind: Service
metadata:
  name: svc-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
spec:
  type: ${serviceType}
  selector:
    app: ${name}
${servicePortsYaml}${ingressYaml}
`;

  let manifestToApply = manifestYaml;
  try {
    await applyKubernetesManifests(kc, manifestToApply);
  } catch (applyErr: any) {
    const errText = String(applyErr?.message || applyErr?.body?.message || '');
    if (errText.includes('provided port is already allocated') || errText.includes('nodePort')) {
      console.warn(`[deployAppService] Detected NodePort collision on ${app.port}. Re-allocating fresh port...`);
      const newPort = await allocateAppPort();
      const oldPort = app.port;
      app.port = newPort;
      await prisma.appService.update({
        where: { id: app.id },
        data: { port: newPort },
      }).catch(() => {});
      manifestToApply = manifestToApply.replaceAll(`nodePort: ${oldPort}`, `nodePort: ${newPort}`);
      await applyKubernetesManifests(kc, manifestToApply);
    } else {
      throw applyErr;
    }
  }

  return {
    deploymentName: `deploy-${name}`,
    serviceName: `svc-${name}`,
    pvcName: `pvc-${name}`,
    ingressName: hasWeb ? `ing-${name}` : '',
    fullDomain,
  };
}

/**
 * Zero-Data-Loss Scaling: Dynamically update Pod compute resources (vCPU/RAM)
 * without touching PersistentVolumeClaim or modifying tenant storage.
 */
export async function scaleAppService(
  app: AppServiceRecord,
  newCpuShares: number,
  newMemoryMb: number
): Promise<void> {
  const kc = await getAppKubeConfig();
  const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
  const ns = app.k8sNamespace || 'managed-apps';
  const deployName = app.k8sDeployment || `deploy-app-${app.id}-${app.subdomain}`.toLowerCase();
  const containerName = app.k8sDeployment ? deployName.replace(/^deploy-/, '') : `app-${app.id}-${app.subdomain}`;

  const cpuReq = `${Math.max(0.1, Number((newCpuShares * 0.4).toFixed(2)))}`;
  const cpuLim = `${newCpuShares}`;
  const memReq = `${Math.max(128, Math.round(newMemoryMb * 0.5))}Mi`;
  const memLim = `${newMemoryMb}Mi`;

  await objApi.patch({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deployName,
      namespace: ns,
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: containerName,
              resources: {
                requests: {
                  cpu: cpuReq,
                  memory: memReq,
                },
                limits: {
                  cpu: cpuLim,
                  memory: memLim,
                },
              },
            },
          ],
        },
      },
    },
  });
}

/**
 * Stop App Service: Scale replicas to 0
 */
export async function stopAppService(app: AppServiceRecord): Promise<void> {
  const kc = await getAppKubeConfig();
  const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
  const ns = app.k8sNamespace || 'managed-apps';
  const deployName = app.k8sDeployment || `deploy-app-${app.id}-${app.subdomain}`.toLowerCase();

  await objApi.patch({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deployName,
      namespace: ns,
    },
    spec: {
      replicas: 0,
    },
  });
}

/**
 * Start App Service: Scale replicas to 1 and ensure latest container manifests are applied
 */
export async function startAppService(app: AppServiceRecord): Promise<void> {
  const kc = await getAppKubeConfig();
  const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
  const ns = app.k8sNamespace || 'managed-apps';
  const deployName = app.k8sDeployment || `deploy-app-${app.id}-${app.subdomain}`.toLowerCase();

  try {
    await deployAppService(app);
  } catch {
    await objApi.patch({
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deployName,
        namespace: ns,
      },
      spec: {
        replicas: 1,
      },
    });
  }
}

/**
 * Restart App Service: Roll deployment pods and synchronize container manifests
 */
export async function restartAppService(app: AppServiceRecord): Promise<void> {
  const kc = await getAppKubeConfig();
  const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
  const ns = app.k8sNamespace || 'managed-apps';
  const deployName = app.k8sDeployment || `deploy-app-${app.id}-${app.subdomain}`.toLowerCase();

  try {
    await deployAppService(app);
  } catch {
    await objApi.patch({
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: deployName,
        namespace: ns,
      },
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
            },
          },
        },
      },
    });
  }
}

/**
 * Zero-Data-Loss Image & Version Update:
 * Pulls the latest container image from the registry and redeploys the pod
 * while strictly preserving the PersistentVolumeClaim storage.
 */
export async function updateAppServiceToLatest(app: AppServiceRecord): Promise<{
  success: boolean;
  message: string;
  image: string;
}> {
  const kc = await getAppKubeConfig();
  const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
  const ns = app.k8sNamespace || 'managed-apps';
  const deployName = app.k8sDeployment || `deploy-app-${app.id}-${app.subdomain}`.toLowerCase();

  // 1. Redeploy deployment with updated container image & pull policy Always
  await deployAppService(app);

  // 2. Trigger rolling restart to fetch latest container image
  const nowIso = new Date().toISOString();
  await objApi.patch({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name: deployName,
      namespace: ns,
    },
    spec: {
      template: {
        metadata: {
          annotations: {
            'kubectl.kubernetes.io/restartedAt': nowIso,
            'app.masdika.id/updatedAt': nowIso,
          },
        },
      },
    },
  });

  const { image } = buildAppContainerSpec(app);

  return {
    success: true,
    message: `Application '${app.name}' has been successfully updated to the latest image release (${image}) with zero data loss. Persistent storage remains intact.`,
    image,
  };
}

/**
 * Delete App Service and all associated Kubernetes resources
 */
export async function deleteAppService(app: AppServiceRecord): Promise<void> {
  const { coreApi, appsApi, netApi } = await getAppK8sClients();
  const ns = app.k8sNamespace || 'managed-apps';
  const deployName = app.k8sDeployment || `deploy-app-${app.id}-${app.subdomain}`.toLowerCase();
  const svcName = app.k8sService || `svc-app-${app.id}-${app.subdomain}`.toLowerCase();
  const pvcName = app.k8sPvc || `pvc-app-${app.id}-${app.subdomain}`.toLowerCase();
  const ingName = app.k8sIngress || `ing-app-${app.id}-${app.subdomain}`.toLowerCase();
  const tlsSecret = `tls-${app.subdomain}`;

  // Ingress
  try {
    await netApi.deleteNamespacedIngress({ name: ingName, namespace: ns });
  } catch { }

  // Service
  try {
    await coreApi.deleteNamespacedService({ name: svcName, namespace: ns });
  } catch { }

  // Deployment
  try {
    await appsApi.deleteNamespacedDeployment({ name: deployName, namespace: ns });
  } catch { }

  // PVC
  try {
    await coreApi.deleteNamespacedPersistentVolumeClaim({ name: pvcName, namespace: ns });
  } catch { }

  // TLS Secret
  try {
    await coreApi.deleteNamespacedSecret({ name: tlsSecret, namespace: ns });
  } catch { }
}

const LIVE_VERSION_CACHE_TTL_MS = 10 * 60 * 1000;
const liveAppVersionCache = new Map<string, { version: string; expiresAt: number }>();

function getVersionProbeCommand(appType: string): string {
  switch (appType.toLowerCase()) {
    case 'uptimekuma':
      return `node -p "require('/app/package.json').version" 2>/dev/null`;
    case 'n8n':
      return `n8n --version 2>/dev/null || node -p "require('/usr/local/lib/node_modules/n8n/package.json').version" 2>/dev/null`;
    case 'ninerouter':
      return `node -p "require('/app/package.json').version" 2>/dev/null || 9router --version 2>/dev/null`;
    case 'omniroute':
      return `node -p "require('/app/package.json').version" 2>/dev/null || omniroute --version 2>/dev/null`;
    case 'opencode':
      return `opencode --version 2>/dev/null`;
    case 'openclaw':
      return `openclaw --version 2>/dev/null || node -p "require('/app/package.json').version" 2>/dev/null`;
    case 'hermes':
      return `/app/data/venv/bin/hermes --version 2>/dev/null || /app/data/venv/bin/python -c "import importlib.metadata; print(importlib.metadata.version('hermes-agent'))" 2>/dev/null`;
    case 'qwenpaw':
      return `qwenpaw --version 2>/dev/null || python3 -c "import importlib.metadata; print(importlib.metadata.version('qwenpaw'))" 2>/dev/null`;
    default:
      return `node -p "require('/app/package.json').version" 2>/dev/null`;
  }
}

async function detectLiveAppVersion(
  kc: k8s.KubeConfig,
  namespace: string,
  podName: string,
  containerName: string,
  appType: string,
  imageId: string
): Promise<string | undefined> {
  const cacheKey = `${namespace}/${podName}/${imageId || appType}`;
  const cached = liveAppVersionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.version;
  }

  const probeCmd = getVersionProbeCommand(appType);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (version?: string) => {
      if (settled) return;
      settled = true;
      if (version) {
        liveAppVersionCache.set(cacheKey, {
          version,
          expiresAt: Date.now() + LIVE_VERSION_CACHE_TTL_MS,
        });
      }
      resolve(version);
    };

    const timer = setTimeout(() => finish(undefined), 2500);

    try {
      const exec = new k8s.Exec(kc);
      const stdoutChunks: Buffer[] = [];
      const stdoutStream = new Writable({
        write(chunk, _encoding, callback) {
          stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });
      const stderrStream = new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      });

      exec
        .exec(
          namespace,
          podName,
          containerName,
          ['/bin/sh', '-c', probeCmd],
          stdoutStream,
          stderrStream,
          null,
          false,
          () => {
            clearTimeout(timer);
            const raw = Buffer.concat(stdoutChunks).toString('utf8').trim();
            const match = raw.match(/(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)/);
            finish(match ? match[1] : undefined);
          }
        )
        .then((ws: any) => {
          ws?.on?.('close', () => {
            clearTimeout(timer);
            const raw = Buffer.concat(stdoutChunks).toString('utf8').trim();
            const match = raw.match(/(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)/);
            finish(match ? match[1] : undefined);
          });
          ws?.on?.('error', () => {
            clearTimeout(timer);
            finish(undefined);
          });
        })
        .catch(() => {
          clearTimeout(timer);
          finish(undefined);
        });
    } catch {
      clearTimeout(timer);
      finish(undefined);
    }
  });
}

/**
 * Get App Pod status & telemetry with reboot and node-recovery resilience
 */
export async function getAppPodStatus(app: AppServiceRecord): Promise<{
  phase: string;
  ready: boolean;
  restartCount: number;
  podName?: string;
  uptimeSeconds?: number;
  statusLabel?: string;
  appVersion?: string;
  imageTag?: string;
}> {
  try {
    const { kc, coreApi } = await getAppK8sClients();
    const ns = app.k8sNamespace || 'managed-apps';
    const labelSelector = `app=${app.k8sDeployment ? app.k8sDeployment.replace(/^deploy-/, '') : `app-${app.id}-${app.subdomain}`}`;

    const res = await coreApi.listNamespacedPod({
      namespace: ns,
      labelSelector,
    });

    const items = (res as any).items || (res as any).body?.items || [];
    if (!items || items.length === 0) {
      const isStopped = app.status === 'STOPPED';
      return {
        phase: isStopped ? 'Stopped' : 'Pending',
        ready: false,
        restartCount: 0,
        statusLabel: isStopped ? 'Stopped' : 'Starting',
      };
    }

    // Pick active pod: filter out pods being deleted, prioritize Running, then Pending
    const activePod =
      items.find((p: any) => p.status?.phase === 'Running' && !p.metadata?.deletionTimestamp) ||
      items.find((p: any) => p.status?.phase === 'Pending' && !p.metadata?.deletionTimestamp) ||
      items.find((p: any) => !p.metadata?.deletionTimestamp) ||
      items[0];

    const rawPhase = activePod.status?.phase || 'Pending';
    const containerStatus = activePod.status?.containerStatuses?.[0];
    const ready = Boolean(containerStatus?.ready);
    const restartCount = containerStatus?.restartCount || 0;

    let phase = rawPhase;
    let statusLabel = 'Starting';
    if (rawPhase === 'Running' && ready) {
      phase = 'Running';
      statusLabel = 'Running';
    } else if (rawPhase === 'Running' && !ready) {
      phase = 'Starting';
      statusLabel = 'Starting';
    } else if (rawPhase === 'Pending') {
      phase = 'Starting';
      statusLabel = 'Starting';
    } else if (rawPhase === 'Failed') {
      phase = 'Error';
      statusLabel = 'Error';
    }

    let uptimeSeconds: number | undefined;
    if (activePod.status?.startTime) {
      uptimeSeconds = Math.max(0, Math.floor((Date.now() - new Date(activePod.status.startTime).getTime()) / 1000));
    }

    const containerSpec = activePod.spec?.containers?.[0];
    const imageRef: string = containerSpec?.image || '';
    const imageTag = imageRef.includes(':') ? imageRef.split(':').pop() : undefined;
    const podName: string | undefined = activePod.metadata?.name;
    const containerName: string = containerSpec?.name || '';
    const imageId: string = containerStatus?.imageID || '';

    const appVersion =
      ready && podName && containerName
        ? await detectLiveAppVersion(kc, ns, podName, containerName, app.appType, imageId)
        : undefined;

    return {
      phase,
      ready,
      restartCount,
      podName,
      uptimeSeconds,
      statusLabel,
      appVersion,
      imageTag,
    };
  } catch {
    // When cluster is rebooting or kubelet is temporarily reconnecting:
    const isAppRunning = app.status === 'RUNNING';
    return {
      phase: isAppRunning ? 'Running' : 'Stopped',
      ready: isAppRunning,
      restartCount: 0,
      statusLabel: isAppRunning ? 'Running' : 'Stopped',
    };
  }
}
