import crypto from 'crypto';
import * as k8s from '@kubernetes/client-node';
import { prisma } from './prisma';
import { decryptDeterministic, encryptDeterministic } from './encryption';
import { getAppDefinition } from './app-catalog';

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

    // Fallback to active saved DB configuration if not provided or masked
    if (!kubeconfig || kubeconfig === '••••••••' || kubeconfig.trim().length === 0) {
      const activeConfig = await getAppClusterConfig();
      kubeconfig = activeConfig.kubeconfig;
      if (!apiServer) apiServer = activeConfig.apiServer;
      if (!serviceToken) serviceToken = activeConfig.serviceToken;
      skipTls = activeConfig.skipTlsVerify;
    }

    if (kubeconfig && kubeconfig !== '••••••••' && kubeconfig.trim().length > 0) {
      kc.loadFromString(kubeconfig.trim());
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
          await objApi.replace(spec);
        }
      } else {
        throw createErr;
      }
    }
  }
}

/**
 * Build App environment variables and startup command according to App Type
 */
export function buildAppContainerSpec(app: AppServiceRecord, domainBase?: string) {
  const appType = app.appType.toLowerCase();
  const catalogItem = getAppDefinition(appType);
  const dataMount = catalogItem?.dataDir || '/app/data';
  const effectiveBase = domainBase || 'app.masdika.id';
  const fullDomain = `${app.subdomain}.${effectiveBase}`;

  let image = catalogItem?.defaultImage || 'docker.io/library/node:22-alpine';
  let envYaml = '';
  let commandYaml = '';

  const b64ApkRestrict = Buffer.from(
    '#!/bin/sh\necho "Security Notice: Package installation (apk) is restricted on Masdika Cloud Managed Applications."\nexit 1\n'
  ).toString('base64');

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
        - name: N8N_BASIC_AUTH_ACTIVE
          value: "true"
        - name: N8N_BASIC_AUTH_USER
          value: "${app.username || 'admin'}"
        - name: N8N_BASIC_AUTH_PASSWORD
          value: "${app.password || 'MasdikaCloud123!'}"
`;
  } else if (appType === 'hermes') {
    image = 'docker.io/library/node:22-alpine';
    const sshPassword = app.password || 'Hermes123!';
    const b64HermesMotd = Buffer.from(
      '════════════════════════════════════════════════════════════\n' +
      '  Masdika Cloud - Dedicated Hermes Agent Instance\n' +
      '  Application Mode: Sandboxed AI Coding Agent (Web + SSH)\n' +
      `  Web Dashboard: https://${fullDomain}\n` +
      '  Persistent Storage: /app/data\n' +
      '\n' +
      '  Quickstart Commands:\n' +
      '    hermes model      -> Set up LLM provider & API keys\n' +
      '    hermes setup      -> Run interactive configuration wizard\n' +
      `    hermes dashboard  -> Web dashboard running at https://${fullDomain}\n` +
      '    hermes            -> Start autonomous agent loop\n' +
      '════════════════════════════════════════════════════════════\n'
    ).toString('base64');

    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            apk add --no-cache openssh bash git curl nano python3 py3-pip && \\
            pip install --no-cache-dir --break-system-packages "hermes-agent[web]" uvicorn fastapi || pip install --no-cache-dir --break-system-packages hermes-agent uvicorn fastapi && \\
            ln -sf /usr/bin/hermes /usr/local/bin/hermes && \\
            ln -sf /usr/bin/hermes-agent /usr/local/bin/hermes-agent && \\
            ssh-keygen -A && \\
            echo "root:${sshPassword}" | chpasswd && \\
            sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \\
            echo "PermitRootLogin yes" >> /etc/ssh/sshd_config && \\
            echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config && \\
            echo "AllowTcpForwarding no" >> /etc/ssh/sshd_config && \\
            echo "X11Forwarding no" >> /etc/ssh/sshd_config && \\
            echo "AllowAgentForwarding no" >> /etc/ssh/sshd_config && \\
            echo "PermitTunnel no" >> /etc/ssh/sshd_config && \\
            echo "GatewayPorts no" >> /etc/ssh/sshd_config && \\
            mkdir -p ${dataMount} /root/.hermes && \\
            echo "${b64HermesMotd}" | base64 -d > /etc/motd && \\
            echo "cd /app/data" >> /root/.bashrc && \\
            echo "cd /app/data" >> /etc/profile && \\
            rm -rf /etc/apk /var/cache/apk /lib/apk && \\
            echo "${b64ApkRestrict}" | base64 -d > /sbin/apk && \\
            chmod 755 /sbin/apk && \\
            (while true; do hermes dashboard --host 0.0.0.0 --port 9119 --no-open; sleep 5; done >> /app/data/hermes-dashboard.log 2>&1) & \\
            exec /usr/sbin/sshd -D -e -p 22
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
  } else if (appType === 'opencode') {
    image = 'docker.io/library/node:22-alpine';
    const sshPassword = app.password || 'OpenCode123!';
    const b64OpenCodeBin = Buffer.from(
      '#!/bin/sh\ncd /workspace\nexec npx --yes opencode "$@" 2>/dev/null || echo "OpenCode Developer Workspace ready in /workspace"\n'
    ).toString('base64');
    const b64OpenCodeMotd = Buffer.from(
      '════════════════════════════════════════════════════════════\n' +
      '  Masdika Cloud - Dedicated OpenCode Instance\n' +
      '  Application Mode: Sandboxed Developer Environment\n' +
      '  Persistent Storage: /workspace\n' +
      '  Security Notice: Package installation & tunneling restricted.\n' +
      '════════════════════════════════════════════════════════════\n'
    ).toString('base64');

    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            apk add --no-cache openssh bash git curl nano && \\
            ssh-keygen -A && \\
            echo "root:${sshPassword}" | chpasswd && \\
            sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \\
            echo "PermitRootLogin yes" >> /etc/ssh/sshd_config && \\
            echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config && \\
            echo "AllowTcpForwarding no" >> /etc/ssh/sshd_config && \\
            echo "X11Forwarding no" >> /etc/ssh/sshd_config && \\
            echo "AllowAgentForwarding no" >> /etc/ssh/sshd_config && \\
            echo "PermitTunnel no" >> /etc/ssh/sshd_config && \\
            echo "GatewayPorts no" >> /etc/ssh/sshd_config && \\
            mkdir -p ${dataMount} && \\
            echo "${b64OpenCodeBin}" | base64 -d > /usr/local/bin/opencode && \\
            chmod 755 /usr/local/bin/opencode && \\
            echo "${b64OpenCodeMotd}" | base64 -d > /etc/motd && \\
            echo "cd /workspace" >> /root/.bashrc && \\
            echo "cd /workspace" >> /etc/profile && \\
            rm -rf /etc/apk /var/cache/apk /lib/apk && \\
            echo "${b64ApkRestrict}" | base64 -d > /sbin/apk && \\
            chmod 755 /sbin/apk && \\
            exec /usr/sbin/sshd -D -e -p ${app.appPort}
`;
  } else if (appType === 'openclaw') {
    image = 'docker.io/library/node:22-alpine';
    const serverJs = `const http = require('http');
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.writeHead(200);
  res.end(\`<!DOCTYPE html>
<html>
<head>
  <title>OpenClaw Agent - Masdika Cloud</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; max-width: 580px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px 0; color: #fff; }
    p { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 20px 0; }
    .info-box { background: #0f0f11; border: 1px solid #27272a; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 13px; color: #e4e4e7; margin-bottom: 20px; word-break: break-all; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .btn { display: inline-block; background: #059669; color: #fff; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 8px; text-decoration: none; transition: background 0.2s; }
    .btn:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="status-dot"></span> Ready for Messaging Tasks</div>
    <h1>OpenClaw Agent Platform</h1>
    <p>Autonomous crawler & multi-channel chat automation engine operational on Masdika Cloud.</p>
    <div class="info-box">
      <div><b>Endpoint:</b> https://${fullDomain}</div>
      <div><b>Port:</b> ${app.appPort}</div>
    </div>
    <a href="https://openclaw.ai" target="_blank" class="btn">OpenClaw Docs &rarr;</a>
  </div>
</body>
</html>\`);
});
server.listen(${app.appPort}, '0.0.0.0', () => {
  console.log('OpenClaw listening on port ${app.appPort}');
});
`;
    const b64OpenClaw = Buffer.from(serverJs).toString('base64');
    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            echo "${b64OpenClaw}" | base64 -d > /server.js && \\
            exec node /server.js
`;
  }

  return {
    image,
    dataMount,
    envYaml,
    commandYaml,
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

  const { image, dataMount, envYaml, commandYaml } = buildAppContainerSpec(app, effectiveBase);
  const catalogItem = getAppDefinition(app.appType);
  const isHermes = app.appType.toLowerCase() === 'hermes';
  const hasWeb = catalogItem?.accessProtocol === 'WEB' || catalogItem?.accessProtocol === 'BOTH' || isHermes;
  const isPureSsh = catalogItem?.accessProtocol === 'SSH' && !isHermes;

  const cpuReq = `${Math.max(0.1, Number((app.cpuShares * 0.4).toFixed(2)))}`;
  const cpuLim = `${app.cpuShares}`;
  const memReq = `${Math.max(128, Math.round(app.memoryMb * 0.5))}Mi`;
  const memLim = `${app.memoryMb}Mi`;
  const storageSize = `${Math.max(5, app.storageGb || 10)}Gi`;

  const webBackendPort = isHermes ? 9119 : app.appPort;

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

  const containerPortsYaml = isHermes
    ? `        ports:
        - name: ssh-port
          containerPort: 22
        - name: web-port
          containerPort: 9119`
    : `        ports:
        - name: app-port
          containerPort: ${app.appPort}`;

  const servicePortsYaml = isHermes
    ? `  ports:
  - name: web
    port: 9119
    targetPort: 9119
  - name: ssh
    port: 22
    targetPort: 22
    nodePort: ${app.port}`
    : `  ports:
  - name: app-port
    port: ${app.appPort}
    targetPort: ${app.appPort}
    nodePort: ${app.port}`;

  const probePort = isHermes ? 22 : app.appPort;

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
${containerPortsYaml}${commandYaml}${envYaml ? `\n        env:${envYaml}` : ''}
        readinessProbe:
          tcpSocket:
            port: ${probePort}
          initialDelaySeconds: 5
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          tcpSocket:
            port: ${probePort}
          initialDelaySeconds: 15
          periodSeconds: 15
          failureThreshold: 5
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
        - name: app-storage
          mountPath: ${dataMount}
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
  type: NodePort
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
    message: `Aplikasi '${app.name}' berhasil diperbarui ke rilis image terbaru (${image}). Seluruh data persistent storage Anda tetap aman (Zero Data Loss).`,
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
}> {
  try {
    const { coreApi } = await getAppK8sClients();
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

    return {
      phase,
      ready,
      restartCount,
      podName: activePod.metadata?.name,
      uptimeSeconds,
      statusLabel,
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
