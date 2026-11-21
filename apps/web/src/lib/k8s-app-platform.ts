import * as k8s from '@kubernetes/client-node';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';

export interface AppPlatformRecord {
  id: number;
  userId: number;
  name: string;
  gitUrl: string;
  branch: string;
  buildType: string; // DOCKERFILE, NODEJS, PYTHON, GOLANG, PHP, STATIC
  buildMode?: string | null; // DOCKERFILE, AUTO, BUILDPACK
  dockerfilePath?: string | null;
  rootDirectory?: string | null;
  buildCommand?: string | null;
  startCommand?: string | null;
  envVars?: string | null;
  healthCheckPath?: string | null;
  persistentVolumePath?: string | null;
  persistentVolumeGb?: number | null;
  enableBuildCache?: boolean | null;
  prPreviewEnabled?: boolean | null;
  subdomain: string;
  customDomain?: string | null;
  host: string;
  port: number;
  appPort: number;
  lastCommitHash?: string | null;
  lastCommitMessage?: string | null;
  lastBuildLog?: string | null;
  lastBuildStatus?: string | null;
  lastDeployedAt?: Date | null;
  planName: string;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  billingMode: string;
  monthlyPrice: number;
  hourlyRate: number;
  accumulatedCost: number;
  status: string;
  suspendReason?: string | null;
  terminationDate?: Date | null;
  node?: string | null;
  k8sNamespace?: string | null;
  k8sDeployment?: string | null;
  k8sService?: string | null;
  k8sPvc?: string | null;
  k8sIngress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppPlatformClusterConfig {
  authMode: 'KUBECONFIG' | 'TOKEN';
  apiServer: string;
  kubeconfig?: string;
  serviceToken?: string;
  skipTlsVerify: boolean;
  publicDomain: string;
  publicIp: string;
  maxInstances: number;
  maxCpu: number;
  maxRamGb: number;
  maxDiskGb: number;
}

export interface AppPlatformCapacity {
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

// In-memory atomic queue for port allocation to prevent race conditions
let portAllocationQueue: Promise<any> = Promise.resolve();
const recentlyReservedPorts = new Map<number, number>();

/**
 * Get App Platform Cluster configuration from database settings
 */
export async function getAppPlatformClusterConfig(): Promise<AppPlatformClusterConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'app_platform_auth_mode',
          'app_platform_api_server',
          'app_platform_kubeconfig',
          'app_platform_service_token',
          'app_platform_skip_tls',
          'app_platform_public_domain',
          'app_platform_public_ip',
          'app_platform_max_instances',
          'app_platform_max_cpu',
          'app_platform_max_ram_gb',
          'app_platform_max_disk_gb',
        ],
      },
    },
  });

  const map = new Map<string, string>();
  for (const s of settings) {
    map.set(s.key, s.value);
  }

  let kubeconfig = map.get('app_platform_kubeconfig');
  if (kubeconfig) {
    try {
      kubeconfig = decryptDeterministic(kubeconfig);
    } catch {
      // Leave as is if not encrypted
    }
  }

  let serviceToken = map.get('app_platform_service_token');
  if (serviceToken) {
    try {
      serviceToken = decryptDeterministic(serviceToken);
    } catch {
      // Leave as is
    }
  }

  return {
    authMode: (map.get('app_platform_auth_mode') as 'KUBECONFIG' | 'TOKEN') || 'KUBECONFIG',
    apiServer: map.get('app_platform_api_server') || 'https://192.168.79.20:6443',
    kubeconfig,
    serviceToken,
    skipTlsVerify: map.get('app_platform_skip_tls') !== 'false',
    publicDomain: map.get('app_platform_public_domain') || 'app.masdikacloud.my.id',
    publicIp: map.get('app_platform_public_ip') || '206.237.98.230',
    maxInstances: parseInt(map.get('app_platform_max_instances') || '50', 10),
    maxCpu: parseFloat(map.get('app_platform_max_cpu') || '8.0'),
    maxRamGb: parseFloat(map.get('app_platform_max_ram_gb') || '16.0'),
    maxDiskGb: parseFloat(map.get('app_platform_max_disk_gb') || '96.0'),
  };
}

/**
 * Build KubeConfig instance for App Platform cluster
 */
export async function getAppPlatformKubeConfig(): Promise<k8s.KubeConfig> {
  const config = await getAppPlatformClusterConfig();
  const kc = new k8s.KubeConfig();

  if (config.authMode === 'KUBECONFIG' && config.kubeconfig && config.kubeconfig.trim().length > 0) {
    kc.loadFromString(config.kubeconfig.trim());
    const cluster = kc.getCurrentCluster();
    if (cluster && config.apiServer) {
      (cluster as any).server = config.apiServer.trim();
      if (config.skipTlsVerify) (cluster as any).skipTLSVerify = true;
    }
  } else if (config.serviceToken && config.apiServer) {
    kc.loadFromClusterAndUser(
      {
        name: 'app-platform-cluster',
        server: config.apiServer.trim(),
        skipTLSVerify: config.skipTlsVerify,
      },
      {
        name: 'app-platform-user',
        token: config.serviceToken.trim(),
      }
    );
  } else {
    throw new Error('Kubernetes API configuration is missing for App Platform.');
  }

  return kc;
}

/**
 * Get native K8s typed API clients
 */
export async function getAppPlatformK8sClients() {
  const kc = await getAppPlatformKubeConfig();
  return {
    kc,
    coreApi: kc.makeApiClient(k8s.CoreV1Api),
    appsApi: kc.makeApiClient(k8s.AppsV1Api),
    batchApi: kc.makeApiClient(k8s.BatchV1Api),
    netApi: kc.makeApiClient(k8s.NetworkingV1Api),
    customApi: kc.makeApiClient(k8s.CustomObjectsApi),
  };
}

/**
 * Check cluster capacity before ordering or deploying
 */
export async function checkAppPlatformCapacity(
  requestedCpu = 0,
  requestedRamMb = 0,
  requestedDiskGb = 0
): Promise<AppPlatformCapacity> {
  const config = await getAppPlatformClusterConfig();

  // Active instances in DB (exclude terminated or error instances)
  const activeApps = await prisma.appPlatformService.findMany({
    where: { status: { notIn: ['TERMINATED', 'ERROR'] } },
    select: { id: true, port: true, cpuShares: true, memoryMb: true, storageGb: true },
  });

  const activeInstances = activeApps.length;
  const allocatedCpu = parseFloat(activeApps.reduce((sum, a) => sum + (a.cpuShares || 0), 0).toFixed(1));
  const allocatedMemoryMb = activeApps.reduce((sum, a) => sum + (a.memoryMb || 0), 0);
  const allocatedStorageGb = activeApps.reduce((sum, a) => sum + (a.storageGb || 5), 0);
  const usedPorts = new Set(activeApps.map((a) => a.port));
  const totalPorts = 2768; // NodePort range 30000 - 32767
  const availablePorts = Math.max(0, totalPorts - usedPorts.size);

  const totalCpu = config.maxCpu > 0 ? config.maxCpu : 8.0;
  const totalMemoryMb = config.maxRamGb > 0 ? config.maxRamGb * 1024 : 16384;
  const totalStorageGb = config.maxDiskGb > 0 ? config.maxDiskGb : 96;
  const maxInstances = config.maxInstances > 0 ? config.maxInstances : 50;

  const cpuPercent = totalCpu > 0 ? Math.min(100, Math.round((allocatedCpu / totalCpu) * 100)) : 100;
  const memoryPercent = totalMemoryMb > 0 ? Math.min(100, Math.round((allocatedMemoryMb / totalMemoryMb) * 100)) : 100;
  const storagePercent = totalStorageGb > 0 ? Math.min(100, Math.round((allocatedStorageGb / totalStorageGb) * 100)) : 100;
  const instancePercent = maxInstances > 0 ? Math.min(100, Math.round((activeInstances / maxInstances) * 100)) : 100;

  const capacityPercent = Math.max(cpuPercent, memoryPercent, storagePercent, instancePercent);

  // Check if requested capacity fits
  const willExceedCpu = allocatedCpu + requestedCpu > totalCpu;
  const willExceedMemory = allocatedMemoryMb + requestedRamMb > totalMemoryMb;
  const willExceedStorage = allocatedStorageGb + requestedDiskGb > totalStorageGb;
  const willExceedInstances = activeInstances + 1 > maxInstances;
  const willExceedPorts = availablePorts < 1;

  const hasCapacity = !willExceedCpu && !willExceedMemory && !willExceedStorage && !willExceedInstances && !willExceedPorts;

  let status: 'OPTIMAL' | 'WARNING' | 'FULL' = 'OPTIMAL';
  if (!hasCapacity || capacityPercent >= 95) {
    status = 'FULL';
  } else if (capacityPercent >= 80) {
    status = 'WARNING';
  }

  let userMessage = 'Cluster capacity is optimal.';
  if (!hasCapacity) {
    if (willExceedInstances) userMessage = 'Cluster has reached maximum instance limit.';
    else if (willExceedCpu) userMessage = 'Cluster CPU capacity is fully allocated.';
    else if (willExceedMemory) userMessage = 'Cluster RAM capacity is fully allocated.';
    else if (willExceedStorage) userMessage = 'Cluster storage capacity is fully allocated.';
    else if (willExceedPorts) userMessage = 'All available NodePorts are currently in use.';
  }

  return {
    available: hasCapacity,
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
    publicDomain: config.publicDomain,
    publicIp: config.publicIp,
    userMessage,
  };
}

/**
 * Allocate a unique atomic NodePort within range 30000..32767
 */
export async function allocateAppPlatformPort(min = 30000, max = 32767): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    portAllocationQueue = portAllocationQueue
      .then(async () => {
        const now = Date.now();
        for (const [p, exp] of recentlyReservedPorts.entries()) {
          if (exp < now) {
            recentlyReservedPorts.delete(p);
          }
        }

        // Active app records in DB
        const usedApps = await prisma.appPlatformService.findMany({
          where: { status: { not: 'TERMINATED' } },
          select: { port: true },
        });

        // Also check Managed Apps so there are no port clashes across both PaaS products
        const usedManagedApps = await prisma.appService.findMany({
          where: { status: { not: 'TERMINATED' } },
          select: { port: true },
        });

        const usedPorts = new Set<number>();
        usedApps.forEach((a) => usedPorts.add(a.port));
        usedManagedApps.forEach((a) => usedPorts.add(a.port));
        for (const p of recentlyReservedPorts.keys()) {
          usedPorts.add(p);
        }

        // Scan live cluster services
        try {
          const { coreApi } = await getAppPlatformK8sClients();
          const svcRes = await (coreApi as any).listServiceForAllNamespaces();
          const items = svcRes.items || svcRes.body?.items || [];
          for (const svc of items) {
            const ports = svc.spec?.ports || [];
            for (const sp of ports) {
              if (sp.nodePort) {
                usedPorts.add(sp.nodePort);
              }
            }
          }
        } catch (clusterErr) {
          console.warn('[AppPlatform] NodePort live scan warning:', clusterErr);
        }

        for (let port = min; port <= max; port++) {
          if (!usedPorts.has(port)) {
            recentlyReservedPorts.set(port, now + 120_000); // 2 minute reservation
            return port;
          }
        }

        throw new Error('All NodePorts in range 30000..32767 are currently occupied.');
      })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Release in-memory port reservation
 */
export function releaseReservedAppPlatformPort(port: number): void {
  recentlyReservedPorts.delete(port);
}

/**
 * Parse environment variables string into K8s env array (supports .env KEY=VALUE, export, quotes, CRLF, and JSON)
 */
export function parseEnvVarsToK8sEnv(envVarsString?: string | null): Array<{ name: string; value: string }> {
  if (!envVarsString || !envVarsString.trim()) return [];
  const envMap = new Map<string, string>();

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(envVarsString);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      for (const [key, val] of Object.entries(parsed)) {
        const cleanKey = String(key || '').trim();
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(cleanKey) && val !== undefined) {
          envMap.set(cleanKey, val === null ? '' : String(val));
        }
      }
      return Array.from(envMap.entries()).map(([name, value]) => ({ name, value }));
    }
  } catch {
    // If not JSON, parse line by line (KEY=VALUE)
  }

  const lines = envVarsString.split(/\r?\n/);
  for (const line of lines) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^export\s+/i.test(trimmed)) {
      trimmed = trimmed.replace(/^export\s+/i, '').trim();
    }
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const name = trimmed.substring(0, idx).trim();
      let value = trimmed.substring(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
      ) {
        value = value.slice(1, -1);
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        envMap.set(name, value);
      }
    }
  }

  return Array.from(envMap.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * Ensure in-cluster private Docker Registry (registry:2) is deployed and running
 */
export async function ensureAppPlatformRegistry(): Promise<void> {
  const { kc, coreApi, appsApi } = await getAppPlatformK8sClients();
  const namespace = 'app-platform';

  // Ensure namespace exists
  try {
    await (coreApi as any).createNamespace({
      body: { metadata: { name: namespace } },
    });
  } catch (err: any) {
    if (err?.statusCode !== 409 && err?.response?.statusCode !== 409) {
      // ignore
    }
  }

  // Clean up any old broken PVC if it exists to avoid blocking
  try {
    await (coreApi as any).deleteNamespacedPersistentVolumeClaim({
      name: 'app-platform-registry-pvc',
      namespace,
    });
  } catch {}

  // Check if existing deployment is stuck with old PVC and recreate if needed
  try {
    const existingDep = await (appsApi as any).readNamespacedDeployment({
      name: 'app-platform-registry',
      namespace,
    });
    const depObj = existingDep?.body || existingDep;
    const vols = depObj?.spec?.template?.spec?.volumes || [];
    const hasPvc = vols.some((v: any) => v.persistentVolumeClaim);
    if (hasPvc) {
      await (appsApi as any).deleteNamespacedDeployment({
        name: 'app-platform-registry',
        namespace,
      });
      const podsRes: any = await (coreApi as any).listNamespacedPod({
        namespace,
        labelSelector: 'app=app-platform-registry',
      });
      for (const p of podsRes?.items || podsRes?.body?.items || []) {
        if (p?.metadata?.name) {
          await (coreApi as any).deleteNamespacedPod({ name: p.metadata.name, namespace }).catch(() => {});
        }
      }
    }
  } catch {}

  const registryYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-platform-registry
  namespace: ${namespace}
  labels:
    app: app-platform-registry
    app.kubernetes.io/managed-by: masdika-app-platform
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: app-platform-registry
  template:
    metadata:
      labels:
        app: app-platform-registry
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: registry
        image: registry:2
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 5000
          hostPort: 5000
        env:
        - name: REGISTRY_HTTP_ADDR
          value: "0.0.0.0:5000"
        - name: REGISTRY_STORAGE_DELETE_ENABLED
          value: "true"
        volumeMounts:
        - name: registry-data
          mountPath: /var/lib/registry
        readinessProbe:
          tcpSocket:
            port: 5000
          initialDelaySeconds: 2
          periodSeconds: 3
          failureThreshold: 20
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: registry-data
        hostPath:
          path: /var/lib/masdika/registry
          type: DirectoryOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: registry
  namespace: ${namespace}
  labels:
    app: app-platform-registry
    app.kubernetes.io/managed-by: masdika-app-platform
spec:
  type: ClusterIP
  selector:
    app: app-platform-registry
  ports:
  - port: 5000
    targetPort: 5000
    name: http
`;

  await applyKubernetesManifests(kc, registryYaml);

  // Sweep any lingering completed/failed build pods in background
  cleanOrphanedBuildResources().catch(() => {});
}

/**
 * Wait for the in-cluster Docker registry pod to be Ready before triggering Kaniko build.
 * Polls every 2s for up to 60s. Throws if the registry does not become ready.
 */
async function waitForRegistryReady(coreApi: k8s.CoreV1Api, maxWaitMs = 60000): Promise<void> {
  const namespace = 'app-platform';
  const startTime = Date.now();

  let lastPodState = 'Initializing';
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const podsRes: any = await (coreApi as any).listNamespacedPod({
        namespace,
        labelSelector: 'app=app-platform-registry',
      });
      const pods = podsRes?.items || podsRes?.body?.items || [];
      if (pods.length > 0) {
        const pod = pods[0];
        const phase = pod?.status?.phase || 'Unknown';
        const conditions = pod?.status?.conditions || [];
        const isReady = conditions.some((c: any) => c.type === 'Ready' && c.status === 'True');
        const containerWaiting = pod?.status?.containerStatuses?.[0]?.state?.waiting?.reason;
        lastPodState = `Phase: ${phase}, Ready: ${isReady}, Reason: ${containerWaiting || 'none'}`;

        if (isReady) {
          return; // Registry is ready and accepting traffic
        }
      }
    } catch {
      // ignore transient API errors during polling
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`In-cluster Docker registry did not become ready within ${maxWaitMs / 1000}s. Last state: [${lastPodState}].`);
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

    const readExisting = async (): Promise<any> => {
      const res = (await objApi.read({
        apiVersion: spec.apiVersion || 'v1',
        kind: spec.kind!,
        metadata: {
          name: spec.metadata!.name!,
          namespace: spec.metadata!.namespace || 'default',
        },
      }).catch(() => null)) as any;
      return res?.body ?? res ?? null;
    };

    const applyUpdate = async (existing: any) => {
      if (existing?.metadata?.resourceVersion) {
        spec.metadata!.resourceVersion = existing.metadata.resourceVersion;
      }
      if (spec.kind === 'Service' && (spec as any).spec) {
        if (existing?.spec?.clusterIP) {
          (spec as any).spec.clusterIP = existing.spec.clusterIP;
        }
        if (Array.isArray(existing?.spec?.clusterIPs)) {
          (spec as any).spec.clusterIPs = existing.spec.clusterIPs;
        }
      }
      try {
        await objApi.replace(spec);
      } catch (replaceErr) {
        try {
          await objApi.patch(spec);
        } catch {
          if (spec.kind === 'Service') {
            const targetPort = (spec as any).spec?.ports?.[0];
            const curPort = existing?.spec?.ports?.[0];
            if (
              targetPort &&
              curPort &&
              curPort.port === targetPort.port &&
              curPort.nodePort === targetPort.nodePort
            ) {
              return;
            }
          }
          throw replaceErr;
        }
      }
    };

    const existing = await readExisting();
    if (existing) {
      await applyUpdate(existing);
    } else {
      try {
        await objApi.create(spec);
      } catch (createErr: any) {
        const status = createErr.statusCode || createErr.code || createErr.response?.statusCode || createErr.body?.code;
        if (status === 409 || status === 422) {
          const retryExisting = await readExisting();
          if (retryExisting) {
            await applyUpdate(retryExisting);
            continue;
          }
        }
        throw createErr;
      }
    }
  }
}

/**
 * Create Kaniko build job in the cluster
 */
export async function triggerAppPlatformBuild(
  app: AppPlatformRecord,
  deploymentId?: number,
  commitHash?: string | null,
  imageTagOverride?: string | null
): Promise<{ jobName: string; imageTag: string; deploymentId?: number }> {
  const { batchApi, coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const timestamp = Date.now();
  const imageTag = imageTagOverride || `b${timestamp.toString(36)}`;
  const jobName = `build-${app.subdomain}-${timestamp.toString(36)}`;
  const destinationImage = `127.0.0.1:5000/${app.subdomain}:${imageTag}`;

  // Ensure deployment record exists
  let activeDepId = deploymentId;
  if (!activeDepId && app.id) {
    try {
      const depCount = await prisma.appPlatformDeployment.count({ where: { appId: app.id } });
      const created = await prisma.appPlatformDeployment.create({
        data: {
          appId: app.id,
          deploymentNumber: depCount + 1,
          branch: app.branch || 'main',
          trigger: 'INITIAL',
          status: 'BUILDING',
          imageTag,
        },
      });
      activeDepId = created.id;
    } catch (depErr) {
      console.warn('[AppPlatform] Deployment record creation error:', depErr);
    }
  } else if (activeDepId) {
    try {
      await prisma.appPlatformDeployment.update({
        where: { id: activeDepId },
        data: { status: 'BUILDING', imageTag },
      });
    } catch {}
  }

  // Ensure in-cluster private registry is running and wait for readiness
  await ensureAppPlatformRegistry();
  await waitForRegistryReady(coreApi);

  // Clean up any old completed/failed build jobs and pods for this app to avoid clutter
  try {
    const prevJobsRes: any = await (batchApi as any).listNamespacedJob({
      namespace,
      labelSelector: `build.app-platform/app=${app.subdomain}`,
    });
    const prevJobs = prevJobsRes?.items || prevJobsRes?.body?.items || [];
    for (const j of prevJobs) {
      const jName = j?.metadata?.name;
      if (jName && jName !== jobName) {
        await (batchApi as any).deleteNamespacedJob({
          name: jName,
          namespace,
          propagationPolicy: 'Background',
        }).catch(() => {});
        const oldPods: any = await (coreApi as any).listNamespacedPod({
          namespace,
          labelSelector: `job-name=${jName}`,
        }).catch(() => null);
        for (const op of oldPods?.items || oldPods?.body?.items || []) {
          if (op?.metadata?.name) {
            await (coreApi as any).deleteNamespacedPod({ name: op.metadata.name, namespace }).catch(() => {});
          }
        }
      }
    }
  } catch {}

  // Also clean up any orphaned failed/completed build pods BEFORE creating new ConfigMap/Job
  await cleanOrphanedBuildResources().catch(() => {});

  const rawDfPath = (
    app.dockerfilePath && app.dockerfilePath.trim() ? app.dockerfilePath.trim() : 'Dockerfile'
  ).replace(/['"`$\\;\r\n]/g, '');
  const requestedDockerfilePath =
    rawDfPath
      .split('/')
      .filter((seg) => seg && seg !== '.' && seg !== '..')
      .join('/') || 'Dockerfile';

  // Pure Dockerfile-only build: inline Dockerfile (in buildCommand) or repository Dockerfile
  const isInlineDockerfile = Boolean(
    app.buildCommand &&
    (/^\s*FROM\s+/im.test(app.buildCommand) ||
     app.buildCommand.includes('# Dockerfile') ||
     /^\s*(ENTRYPOINT|CMD)\s+/im.test(app.buildCommand))
  );
  const inlineDockerfile = isInlineDockerfile ? app.buildCommand!.trim() : '';
  const presetDfB64 = inlineDockerfile ? Buffer.from(inlineDockerfile, 'utf8').toString('base64') : '';

  const gitUrl = app.gitUrl.trim();
  const safeDisplayUrl = gitUrl.replace(/\/\/[^/@]+@/, '//***@');
  const branch = (app.branch || 'main').trim() || 'main';

  const cleanRootDir = app.rootDirectory
    ? app.rootDirectory
        .trim()
        .replace(/['"`$\\;\r\n]/g, '')
        .split('/')
        .filter((seg) => seg && seg !== '.' && seg !== '..')
        .join('/')
    : '';
  const workspaceAppDir = cleanRootDir ? `/workspace/${cleanRootDir}` : '/workspace';

  const dockerfilePrepHook = isInlineDockerfile
    ? ` && mkdir -p "${workspaceAppDir}" && printf '%s' "$MASDIKA_PRESET_DF_B64" | base64 -d > "${workspaceAppDir}/.masdika.Dockerfile" && echo "[Masdika BuildKit] Using Inline Dockerfile."`
    : ` && cd "${workspaceAppDir}" && DF_SRC="${workspaceAppDir}/$MASDIKA_DOCKERFILE_PATH" && if [ ! -f "$DF_SRC" ]; then echo "ERROR: Dockerfile not found at '$MASDIKA_DOCKERFILE_PATH'. Please add a Dockerfile to your repository or use the Inline Dockerfile editor."; exit 1; fi && cp "$DF_SRC" "${workspaceAppDir}/.masdika.Dockerfile" && echo "[Masdika BuildKit] Using repository Dockerfile: $MASDIKA_DOCKERFILE_PATH"`;

  // Job Specification: BuildKit Builder (Dockerfile-only)
  const jobManifest: k8s.V1Job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace,
      labels: {
        'build.app-platform/app': app.subdomain,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
        'build.app-platform/image-tag': imageTag,
        'build.app-platform/engine': 'buildkit',
      },
    },
    spec: {
      ttlSecondsAfterFinished: 600, // 10m safety net if server restarts; active sync deletes sooner
      backoffLimit: 0, // Fail fast without retrying failed build
      template: {
        metadata: {
          labels: {
            'build.app-platform/app': app.subdomain,
            job: jobName,
          },
        },
        spec: {
          hostNetwork: true,
          dnsPolicy: 'ClusterFirstWithHostNet',
          restartPolicy: 'Never',
          volumes: [
            {
              name: 'workspace',
              emptyDir: {},
            },
          ],
          initContainers: [
            {
              name: 'git-clone',
              image: 'alpine/git:latest',
              imagePullPolicy: 'IfNotPresent',
              env: [
                { name: 'MASDIKA_GIT_URL', value: gitUrl },
                { name: 'MASDIKA_SAFE_URL', value: safeDisplayUrl },
                { name: 'MASDIKA_GIT_BRANCH', value: branch },
                { name: 'MASDIKA_DOCKERFILE_PATH', value: requestedDockerfilePath },
                ...(presetDfB64 ? [{ name: 'MASDIKA_PRESET_DF_B64', value: presetDfB64 }] : []),
              ],
              command: ['sh', '-c'],
              args: [
                commitHash && /^[a-fA-F0-9]{4,40}$/.test(commitHash.trim())
                  ? `echo "Cloning $MASDIKA_SAFE_URL and checking out commit ${commitHash.trim()}..." && git clone "$MASDIKA_GIT_URL" /workspace/src && cd /workspace/src && git checkout "${commitHash.trim()}" && cp -rf /workspace/src/. /workspace/ && cd /workspace && rm -rf /workspace/src${dockerfilePrepHook} && chmod -R 777 /workspace && echo "Commit ${commitHash.trim()} checked out. Handing off to BuildKit..."`
                  : `echo "Cloning $MASDIKA_SAFE_URL (branch: $MASDIKA_GIT_BRANCH)..." && (git clone --depth=1 --branch "$MASDIKA_GIT_BRANCH" "$MASDIKA_GIT_URL" /workspace/src 2>/dev/null || git clone --depth=1 "$MASDIKA_GIT_URL" /workspace/src) && cp -rf /workspace/src/. /workspace/ && cd /workspace && rm -rf /workspace/src${dockerfilePrepHook} && chmod -R 777 /workspace && echo "Clone completed. Handing off to BuildKit..."`,
              ],
              volumeMounts: [
                {
                  name: 'workspace',
                  mountPath: '/workspace',
                },
              ],
            },
          ],
          containers: [
            {
              name: 'buildkit',
              image: 'moby/buildkit:latest',
              imagePullPolicy: 'IfNotPresent',
              securityContext: {
                runAsUser: 0,
                privileged: true,
              },
              command: ['buildctl-daemonless.sh'],
              args: [
                'build',
                '--frontend',
                'dockerfile.v0',
                '--local',
                `context=${workspaceAppDir}`,
                '--local',
                `dockerfile=${workspaceAppDir}`,
                '--opt',
                'filename=.masdika.Dockerfile',
                '--output',
                `type=image,name=${destinationImage},push=true,registry.insecure=true`,
                ...(app.enableBuildCache !== false
                  ? [
                      '--import-cache',
                      `type=registry,ref=127.0.0.1:5000/${app.subdomain}-cache,registry.insecure=true`,
                      '--export-cache',
                      `type=registry,ref=127.0.0.1:5000/${app.subdomain}-cache,mode=max,registry.insecure=true`,
                    ]
                  : []),
              ],
                  volumeMounts: [
                    {
                      name: 'workspace',
                      mountPath: '/workspace',
                    },
                  ],
                  resources: {
                    requests: {
                      cpu: '500m',
                      memory: '512Mi',
                    },
                    limits: {
                      cpu: '2000m',
                      memory: '2048Mi',
                    },
                  },
                },
              ],
        },
      },
    },
  };

  await (batchApi as any).createNamespacedJob({
    namespace,
    body: jobManifest,
  });

  // Update DB status to BUILDING
  await prisma.appPlatformService.update({
    where: { id: app.id },
    data: {
      status: 'BUILDING',
      lastBuildStatus: 'BUILDING',
      lastBuildLog: `Build job [${jobName}] queued for repository ${app.gitUrl} on branch ${branch}...\n`,
    },
  });

  return { jobName, imageTag, deploymentId: activeDepId };
}

/**
 * Apply or update Kubernetes Deployment, Service, and Ingress for the app
 */
export async function applyAppPlatformResources(
  app: AppPlatformRecord,
  imageTag: string
): Promise<{ ingressUrl: string; nodePortUrl: string }> {
  const { kc } = await getAppPlatformK8sClients();
  const config = await getAppPlatformClusterConfig();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = `app-${app.subdomain}`;
  const clusterImage = `127.0.0.1:5000/${app.subdomain}:${imageTag}`;
  const publicDomain = config.publicDomain || 'app.masdikacloud.my.id';
  const appHost = `${app.subdomain}.${publicDomain}`;

  // Parse user environment variables
  const userEnvs = parseEnvVarsToK8sEnv(app.envVars);
  const defaultEnvs = [
    { name: 'PORT', value: String(app.appPort) },
    { name: 'NODE_ENV', value: 'production' },
    { name: 'APP_SUBDOMAIN', value: app.subdomain },
    { name: 'APP_DOMAIN', value: appHost },
    { name: 'APP_URL', value: `https://${appHost}` },
  ];

  // Merge envs (user envs override defaults)
  const envMap = new Map<string, string>();
  for (const e of defaultEnvs) envMap.set(e.name, e.value);
  for (const e of userEnvs) envMap.set(e.name, e.value);
  const finalEnvs = Array.from(envMap.entries()).map(([k, v]) => ({ name: k, value: v }));

  // 0. Create or verify PersistentVolumeClaim if Persistent Storage is enabled
  const hasPersistentVolume = Boolean(
    app.persistentVolumePath &&
    app.persistentVolumePath.trim().startsWith('/') &&
    app.persistentVolumeGb &&
    app.persistentVolumeGb > 0
  );
  const pvcName = `pvc-${app.subdomain}`;

  if (hasPersistentVolume) {
    const { coreApi } = await getAppPlatformK8sClients();
    try {
      await (coreApi as any).readNamespacedPersistentVolumeClaim({ name: pvcName, namespace });
    } catch {
      await (coreApi as any).createNamespacedPersistentVolumeClaim({
        namespace,
        body: {
          apiVersion: 'v1',
          kind: 'PersistentVolumeClaim',
          metadata: {
            name: pvcName,
            namespace,
            labels: {
              app: app.subdomain,
              'app.kubernetes.io/managed-by': 'masdika-app-platform',
            },
          },
          spec: {
            accessModes: ['ReadWriteOnce'],
            storageClassName: 'local-path',
            resources: {
              requests: {
                storage: `${app.persistentVolumeGb}Gi`,
              },
            },
          },
        },
      }).catch((pvcErr: any) => {
        console.warn('[AppPlatform] PVC creation warning:', pvcErr?.message || pvcErr);
      });
    }
  }

  // Health Check Probes for Zero-Downtime Rolling Updates
  const cleanHealthPath = app.healthCheckPath && app.healthCheckPath.trim()
    ? (app.healthCheckPath.trim().startsWith('/') ? app.healthCheckPath.trim() : `/${app.healthCheckPath.trim()}`)
    : null;

  const probes = cleanHealthPath
    ? {
        readinessProbe: {
          httpGet: { path: cleanHealthPath, port: app.appPort || 3000 },
          initialDelaySeconds: 5,
          periodSeconds: 5,
          timeoutSeconds: 3,
          failureThreshold: 6,
        },
        livenessProbe: {
          httpGet: { path: cleanHealthPath, port: app.appPort || 3000 },
          initialDelaySeconds: 25,
          periodSeconds: 15,
          timeoutSeconds: 5,
          failureThreshold: 4,
        },
      }
    : {};

  // 1. Create or Update Deployment
  const replicas = app.status === 'STOPPED' || app.status === 'SUSPENDED' ? 0 : 1;
  const cpuReqM = Math.max(100, Math.round(app.cpuShares * 500));
  const cpuLimM = Math.max(250, Math.round(app.cpuShares * 1000));
  const memReqMi = Math.max(128, Math.round(app.memoryMb * 0.5));
  const memLimMi = Math.max(256, app.memoryMb);

  const deploymentManifest: k8s.V1Deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
      labels: {
        app: app.subdomain,
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      replicas,
      strategy: hasPersistentVolume
        ? { type: 'Recreate' }
        : {
            type: 'RollingUpdate',
            rollingUpdate: { maxUnavailable: 0, maxSurge: 1 },
          },
      selector: {
        matchLabels: {
          app: app.subdomain,
        },
      },
      template: {
        metadata: {
          labels: {
            app: app.subdomain,
          },
          annotations: {
            'app-platform/image-tag': imageTag,
            'app-platform/deployed-at': new Date().toISOString(),
          },
        },
        spec: {
          ...(hasPersistentVolume
            ? {
                volumes: [
                  {
                    name: 'app-data',
                    persistentVolumeClaim: { claimName: pvcName },
                  },
                ],
              }
            : {}),
          containers: [
            {
              name: 'app',
              image: clusterImage,
              imagePullPolicy: 'Always',
              ports: [
                {
                  containerPort: app.appPort,
                  name: 'http',
                },
              ],
              env: finalEnvs,
              ...probes,
              ...(hasPersistentVolume
                ? {
                    volumeMounts: [
                      {
                        name: 'app-data',
                        mountPath: app.persistentVolumePath!.trim(),
                      },
                    ],
                  }
                : {}),
              resources: {
                requests: {
                  cpu: `${cpuReqM}m`,
                  memory: `${memReqMi}Mi`,
                },
                limits: {
                  cpu: `${cpuLimM}m`,
                  memory: `${memLimMi}Mi`,
                },
              },
            },
          ],
        },
      },
    },
  };

  // 2. Create or Update Service (NodePort)
  const serviceManifest: k8s.V1Service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      namespace,
      labels: {
        app: app.subdomain,
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      type: 'NodePort',
      selector: {
        app: app.subdomain,
      },
      ports: [
        {
          name: 'http',
          port: app.appPort,
          targetPort: app.appPort as any,
          nodePort: app.port,
          protocol: 'TCP',
        },
      ],
    },
  };

  // 3. Create or Update Ingress (Traefik + cert-manager auto SSL)
  const hosts = [appHost];
  if (app.customDomain && app.customDomain.trim()) {
    hosts.push(app.customDomain.trim());
  }

  const ingressRules = hosts.map((h) => ({
    host: h,
    http: {
      paths: [
        {
          path: '/',
          pathType: 'Prefix',
          backend: {
            service: {
              name,
              port: {
                number: app.appPort,
              },
            },
          },
        },
      ],
    },
  }));

  const redirectMiddlewareManifest = {
    apiVersion: 'traefik.io/v1alpha1',
    kind: 'Middleware',
    metadata: {
      name: 'redirect-https',
      namespace,
      labels: {
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      redirectScheme: {
        scheme: 'https',
        permanent: true,
      },
    },
  };

  let redirectMiddlewareReady = false;
  try {
    await applyKubernetesManifests(kc, k8s.dumpYaml(redirectMiddlewareManifest));
    redirectMiddlewareReady = true;
  } catch (mwErr: any) {
    console.warn('[AppPlatform] Traefik redirect-https Middleware warning:', mwErr?.body?.message || mwErr?.message || mwErr);
  }

  const ingressManifest: k8s.V1Ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name,
      namespace,
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'traefik.ingress.kubernetes.io/router.entrypoints': 'web,websecure',
        ...(redirectMiddlewareReady
          ? { 'traefik.ingress.kubernetes.io/router.middlewares': `${namespace}-redirect-https@kubernetescrd` }
          : { 'traefik.ingress.kubernetes.io/router.tls': 'true' }),
      },
      labels: {
        app: app.subdomain,
        'app.kubernetes.io/name': name,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
      },
    },
    spec: {
      rules: ingressRules,
      tls: [
        {
          hosts,
          secretName: `tls-${app.subdomain}`,
        },
      ],
    },
  };

  const manifestsYaml = [
    k8s.dumpYaml(deploymentManifest),
    k8s.dumpYaml(serviceManifest),
    k8s.dumpYaml(ingressManifest),
  ].join('\n---\n');

  await applyKubernetesManifests(kc, manifestsYaml);

  const ingressUrl = `https://${appHost}`;
  const nodePortUrl = `http://${config.publicIp}:${app.port}`;

  return { ingressUrl, nodePortUrl };
}

const syncingBuildPromises = new Map<number, Promise<void>>();

/**
 * Self-healing reconciler: pulls live Kubernetes build logs (git-clone + kaniko + Pod init status)
 * and syncs completion/failure state to PostgreSQL. Safe to call both from background watcher and HTTP polls.
 */
export async function syncAppPlatformBuildProgress(appId: number): Promise<void> {
  const existing = syncingBuildPromises.get(appId);
  if (existing) {
    return existing;
  }

  const runPromise = (async () => {
    const app = await prisma.appPlatformService.findUnique({ where: { id: appId } });
    if (!app) return;

    const isStillBuilding =
      app.status === 'BUILDING' ||
      app.status === 'PROVISIONING' ||
      app.lastBuildStatus === 'BUILDING' ||
      app.lastBuildStatus === 'QUEUED';
    if (!isStillBuilding) return;

    const latestDep = await prisma.appPlatformDeployment.findFirst({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });

    const namespace = app.k8sNamespace || 'app-platform';
    const { batchApi, coreApi } = await getAppPlatformK8sClients();

    const byNewest = (a: any, b: any) =>
      new Date(b?.metadata?.creationTimestamp || 0).getTime() -
      new Date(a?.metadata?.creationTimestamp || 0).getTime();

    const jobsRes: any = await (batchApi as any)
      .listNamespacedJob({ namespace, labelSelector: `build.app-platform/app=${app.subdomain}` })
      .catch(() => null);
    const jobs = ((jobsRes?.items || jobsRes?.body?.items || []) as any[]).sort(byNewest);
    const job = jobs[0];

    const podsRes: any = await (coreApi as any)
      .listNamespacedPod({ namespace, labelSelector: `build.app-platform/app=${app.subdomain}` })
      .catch(() => null);
    const pods = ((podsRes?.items || podsRes?.body?.items || []) as any[])
      .filter((p) => (p?.metadata?.name || '').startsWith('build-'))
      .sort(byNewest);
    const buildPod = pods[0];

    const jobName: string = job?.metadata?.name || buildPod?.metadata?.labels?.['job-name'] || '';
    const resolvedImageTag: string =
      job?.metadata?.labels?.['build.app-platform/image-tag'] ||
      latestDep?.imageTag ||
      'latest';

    const startedAtMs = latestDep?.createdAt
      ? new Date(latestDep.createdAt).getTime()
      : job?.metadata?.creationTimestamp
      ? new Date(job.metadata.creationTimestamp).getTime()
      : Date.now();
    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAtMs) / 1000));

    // Collect live container logs from build pod (initContainer git-clone + kaniko/buildpack)
    let podLogs = '';
    if (buildPod?.metadata?.name) {
      const podName = buildPod.metadata.name;
      const parts: string[] = [];

      const readContainerLog = async (containerName: string): Promise<string> => {
        try {
          const logRes: any = await (coreApi as any).readNamespacedPodLog({
            name: podName,
            namespace,
            container: containerName,
          });
          const txt = typeof logRes === 'string' ? logRes : logRes?.body || '';
          return typeof txt === 'string' ? txt.trim() : '';
        } catch {
          return '';
        }
      };

      const gitTxt = await readContainerLog('git-clone');
      if (gitTxt) parts.push(gitTxt);

      for (const builderName of ['buildkit', 'kaniko', 'buildpack']) {
        const bTxt = await readContainerLog(builderName);
        if (bTxt) {
          parts.push(bTxt);
          break;
        }
      }

      if (parts.length > 0) {
        podLogs = parts.join('\n');
      } else {
        // Container still pulling images / initializing: surface live Pod status immediately
        const baseQueueLine =
          (app.lastBuildLog || '').split('\n')[0] ||
          `Build job [${jobName || 'pending'}] queued for repository ${app.gitUrl}...`;
        const phase = buildPod.status?.phase || 'Pending';
        const statusSummary: string[] = [];

        for (const cs of [
          ...(buildPod.status?.initContainerStatuses || []),
          ...(buildPod.status?.containerStatuses || []),
        ]) {
          if (cs?.state?.waiting?.reason) {
            statusSummary.push(
              `${cs.name}: ${cs.state.waiting.reason}${cs.state.waiting.message ? ` (${cs.state.waiting.message})` : ''}`
            );
          } else if (cs?.state?.running) {
            statusSummary.push(`${cs.name}: Running`);
          } else if (cs?.state?.terminated) {
            statusSummary.push(`${cs.name}: ${cs.state.terminated.reason || 'Terminated'}`);
          }
        }

        const podConds = (buildPod.status?.conditions || [])
          .filter((c: any) => c.status === 'False' && c.message)
          .map((c: any) => `${c.type}: ${c.message}`);

        const detailText = statusSummary.join(' | ') || podConds.join(' | ') || 'Preparing container sandbox...';
        podLogs = `${baseQueueLine}\n[Kubernetes Pod: ${podName}] Phase: ${phase} · ${detailText} (${elapsedSec}s)`;
      }
    }

    if (podLogs) {
      await prisma.appPlatformService
        .update({
          where: { id: appId },
          data: { lastBuildLog: podLogs.slice(-25000) },
        })
        .catch(() => {});

      if (latestDep) {
        await prisma.appPlatformDeployment
          .update({
            where: { id: latestDep.id },
            data: {
              buildLogs: podLogs.slice(-50000),
              durationSeconds: elapsedSec,
            },
          })
          .catch(() => {});
      }
    }

    const markSuccess = async (finalTag: string) => {
      await applyAppPlatformResources(app as any, finalTag);

      await prisma.appPlatformService
        .update({
          where: { id: appId },
          data: {
            status: 'RUNNING',
            lastBuildStatus: 'SUCCESS',
            lastDeployedAt: new Date(),
            k8sDeployment: `app-${app.subdomain}`,
            k8sService: `app-${app.subdomain}`,
            k8sIngress: `app-${app.subdomain}`,
          },
        })
        .catch(() => {});

      if (latestDep) {
        await prisma.appPlatformDeployment
          .update({
            where: { id: latestDep.id },
            data: {
              status: 'SUCCESS',
              ...(podLogs ? { buildLogs: podLogs.slice(-50000) } : {}),
              imageTag: finalTag,
              durationSeconds: elapsedSec,
            },
          })
          .catch(() => {});
      }

      if (jobName) {
        await cleanupFinishedBuildJob(namespace, jobName).catch(() => {});
      }
      const successDeps = await prisma.appPlatformDeployment
        .findMany({
          where: { appId, status: 'SUCCESS', imageTag: { not: null } },
          select: { imageTag: true },
        })
        .catch(() => [] as { imageTag: string | null }[]);
      const keepTags = Array.from(
        new Set([finalTag, ...successDeps.map((d) => d.imageTag || '').filter(Boolean)])
      );
      pruneAppPlatformRegistryImages(app.subdomain, keepTags, false).catch(() => {});
    };

    try {
      // Case A: Job Succeeded
      if (job?.status?.succeeded && job.status.succeeded > 0) {
        await markSuccess(resolvedImageTag);
        return;
      }

      // Case B: Job Failed
      if (job?.status?.failed && job.status.failed > 0) {
        await prisma.appPlatformService
          .update({
            where: { id: appId },
            data: {
              status: 'ERROR',
              lastBuildStatus: 'FAILED',
            },
          })
          .catch(() => {});

        if (latestDep) {
          await prisma.appPlatformDeployment
            .update({
              where: { id: latestDep.id },
              data: {
                status: 'FAILED',
                ...(podLogs ? { buildLogs: podLogs.slice(-50000) } : {}),
                durationSeconds: elapsedSec,
              },
            })
            .catch(() => {});
        }

        if (jobName) {
          await cleanupFinishedBuildJob(namespace, jobName).catch(() => {});
        }
        runRegistryGarbageCollect().catch(() => {});
        return;
      }

      // Case C: Job & Pod disappeared (e.g., TTL cleaned up during Next.js restart)
      if (!job && !buildPod) {
        if (latestDep?.imageTag) {
          const tagsRes = await fetch(`http://127.0.0.1:5000/v2/${app.subdomain}/tags/list`).catch(() => null);
          if (tagsRes && tagsRes.ok) {
            const tagData = (await tagsRes.json().catch(() => null)) as { tags?: string[] } | null;
            if (Array.isArray(tagData?.tags) && tagData.tags.includes(latestDep.imageTag)) {
              await markSuccess(latestDep.imageTag);
              return;
            }
          }
        }

        if (elapsedSec > 900) {
          await prisma.appPlatformService
            .update({
              where: { id: appId },
              data: {
                status: 'ERROR',
                lastBuildStatus: 'FAILED',
                lastBuildLog: `${app.lastBuildLog || ''}\n[Build timed out or job removed after 15 minutes]`.slice(-25000),
              },
            })
            .catch(() => {});
          if (latestDep) {
            await prisma.appPlatformDeployment
              .update({
                where: { id: latestDep.id },
                data: { status: 'FAILED', durationSeconds: elapsedSec },
              })
              .catch(() => {});
          }
        }
      }
    } catch (syncErr: any) {
      const errMsg = syncErr?.body?.message || syncErr?.message || String(syncErr);
      await prisma.appPlatformService
        .update({
          where: { id: appId },
          data: {
            status: 'ERROR',
            lastBuildStatus: 'FAILED',
            lastBuildLog: `${podLogs || app.lastBuildLog || ''}\n[Deploy/Tracking Error] ${errMsg}`.slice(-25000),
          },
        })
        .catch(() => {});
      if (latestDep) {
        await prisma.appPlatformDeployment
          .update({
            where: { id: latestDep.id },
            data: { status: 'FAILED', durationSeconds: elapsedSec },
          })
          .catch(() => {});
      }
    }
  })().finally(() => {
    syncingBuildPromises.delete(appId);
  });

  syncingBuildPromises.set(appId, runPromise);
  return runPromise;
}

/**
 * Watch Kaniko build job in the background and update deployment upon completion
 */
export async function trackAppPlatformBuildAsync(
  appId: number,
  jobName: string,
  imageTag: string,
  deploymentId?: number
): Promise<void> {
  const maxWaitMs = 15 * 60 * 1000; // 15 minutes timeout
  const pollIntervalMs = 4000; // poll every 4 seconds
  const startTime = Date.now();
  const namespace = 'app-platform';

  try {
    // Immediate first sync so git-clone / PodInitializing state appears within 2 seconds
    await new Promise((r) => setTimeout(r, 1500));
    await syncAppPlatformBuildProgress(appId);

    while (Date.now() - startTime < maxWaitMs) {
      const cur = await prisma.appPlatformService
        .findUnique({
          where: { id: appId },
          select: { status: true, lastBuildStatus: true },
        })
        .catch(() => null);

      if (
        !cur ||
        (cur.lastBuildStatus !== 'BUILDING' &&
          cur.lastBuildStatus !== 'QUEUED' &&
          cur.status !== 'BUILDING' &&
          cur.status !== 'PROVISIONING')
      ) {
        return;
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs));
      await syncAppPlatformBuildProgress(appId);
    }

    // Timed out after 15 minutes
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    const existingApp = await prisma.appPlatformService
      .findUnique({ where: { id: appId }, select: { lastBuildLog: true } })
      .catch(() => null);

    await prisma.appPlatformService
      .update({
        where: { id: appId },
        data: {
          status: 'ERROR',
          lastBuildStatus: 'FAILED',
          lastBuildLog: `${existingApp?.lastBuildLog || ''}\n[Build timed out after 15 minutes]`.slice(-25000),
        },
      })
      .catch(() => {});

    if (deploymentId) {
      await prisma.appPlatformDeployment
        .update({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
            durationSeconds: elapsedSec,
          },
        })
        .catch(() => {});
    }

    await cleanupFinishedBuildJob(namespace, jobName).catch(() => {});
    runRegistryGarbageCollect().catch(() => {});
  } catch (err: any) {
    console.error(`[AppPlatform] Build tracking error for ${jobName}:`, err);
    const errMsg = err?.body?.message || err?.message || String(err);
    const existingApp = await prisma.appPlatformService
      .findUnique({
        where: { id: appId },
        select: { lastBuildLog: true },
      })
      .catch(() => null);
    await prisma.appPlatformService
      .update({
        where: { id: appId },
        data: {
          status: 'ERROR',
          lastBuildStatus: 'FAILED',
          lastBuildLog: `${existingApp?.lastBuildLog || ''}\n[Deploy/Tracking Error] ${errMsg}`.slice(-25000),
        },
      })
      .catch(() => {});

    if (deploymentId) {
      await prisma.appPlatformDeployment
        .update({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
          },
        })
        .catch(() => {});
    }
  }
}

/**
 * Scale deployment (Start: 1, Stop: 0)
 */
export async function scaleAppPlatform(app: AppPlatformRecord, replicas: number): Promise<void> {
  const { appsApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = app.k8sDeployment || `app-${app.subdomain}`;

  await (appsApi as any).patchNamespacedDeployment(
    {
      name,
      namespace,
      body: {
        spec: { replicas },
      },
    },
    { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
  );

  await prisma.appPlatformService.update({
    where: { id: app.id },
    data: {
      status: replicas > 0 ? 'RUNNING' : 'STOPPED',
      ...(replicas > 0 ? { suspendReason: null, terminationDate: null } : {}),
    },
  });
}

/**
 * Restart deployment (Rollout restart)
 */
export async function restartAppPlatform(app: AppPlatformRecord): Promise<void> {
  const { appsApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = app.k8sDeployment || `app-${app.subdomain}`;

  await (appsApi as any).patchNamespacedDeployment(
    {
      name,
      namespace,
      body: {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
              },
            },
          },
        },
      },
    },
    { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
  );

  await prisma.appPlatformService.update({
    where: { id: app.id },
    data: {
      status: 'RUNNING',
    },
  });
}

/**
 * Fetch live runtime logs from the active deployment pod
 */
export async function getAppPlatformRuntimeLogs(app: AppPlatformRecord, tailLines = 200): Promise<string> {
  if (app.status === 'PROVISIONING' || app.status === 'BUILDING' || app.status === 'ERROR') {
    if (app.lastBuildStatus === 'BUILDING') {
      return 'Application is currently building. Please check the Build Logs tab.';
    }
    if (app.lastBuildStatus === 'FAILED') {
      return 'Application build failed. Please check the Build Logs tab for build error details.';
    }
  }

  const { coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';

  const podsRes: any = await (coreApi as any).listNamespacedPod({
    namespace,
    labelSelector: `app=${app.subdomain}`,
  });
  const allPods = podsRes?.items || podsRes?.body?.items || [];

  // Only select runtime deployment pods that contain container 'app'
  const appPods = allPods.filter((p: any) =>
    p.spec?.containers?.some((c: any) => c.name === 'app')
  );

  if (appPods.length === 0) {
    return 'No active runtime pods found for this application. If you just deployed, please check the Build Logs tab.';
  }

  const runningPod = appPods.find((p: any) => p?.status?.phase === 'Running') || appPods[0];
  const podName = runningPod?.metadata?.name;
  if (!podName) return 'Pod name unavailable.';

  try {
    const logRes: any = await (coreApi as any).readNamespacedPodLog({
      name: podName,
      namespace,
      container: 'app',
      tailLines,
    });
    return typeof logRes === 'string' ? logRes : (logRes?.body || 'No log output produced.');
  } catch (err: any) {
    return `Runtime logs unavailable: ${err?.message || 'Pod is initializing'}`;
  }
}

/**
 * Immediately delete a completed/failed Kaniko build Job, its Pods, and its temporary Dockerfile ConfigMap
 */
export async function cleanupFinishedBuildJob(
  namespace: string,
  jobName: string
): Promise<void> {
  try {
    const { coreApi, batchApi } = await getAppPlatformK8sClients();

    await (coreApi as any).deleteNamespacedConfigMap({
      name: `cm-df-${jobName}`,
      namespace,
    }).catch(() => {});

    await (batchApi as any).deleteNamespacedJob({
      name: jobName,
      namespace,
      propagationPolicy: 'Background',
    }).catch(() => {});

    const podsRes: any = await (coreApi as any).listNamespacedPod({
      namespace,
      labelSelector: `job-name=${jobName}`,
    }).catch(() => null);
    for (const p of podsRes?.items || podsRes?.body?.items || []) {
      if (p?.metadata?.name) {
        await (coreApi as any).deleteNamespacedPod({
          name: p.metadata.name,
          namespace,
        }).catch(() => {});
      }
    }
  } catch {}
}

/**
 * Automatically clean up completed or failed build jobs/pods and stale Dockerfile ConfigMaps
 */
export async function cleanOrphanedBuildResources(): Promise<void> {
  try {
    const { coreApi, batchApi } = await getAppPlatformK8sClients();
    const namespace = 'app-platform';
    const activeJobNames = new Set<string>();

    // 1. Clean completed/failed jobs
    const jobsRes: any = await (batchApi as any).listNamespacedJob({ namespace }).catch(() => null);
    const jobs = jobsRes?.items || jobsRes?.body?.items || [];
    for (const j of jobs) {
      const jName = j?.metadata?.name;
      const isFinished = (j?.status?.succeeded || 0) > 0 || (j?.status?.failed || 0) > 0;
      if (isFinished && jName) {
        await (batchApi as any).deleteNamespacedJob({
          name: jName,
          namespace,
          propagationPolicy: 'Background',
        }).catch(() => {});
      } else if (jName) {
        activeJobNames.add(jName);
      }
    }

    // 2. Clean Error/Completed/Failed pods in app-platform namespace
    const podsRes: any = await (coreApi as any).listNamespacedPod({ namespace }).catch(() => null);
    const pods = podsRes?.items || podsRes?.body?.items || [];
    for (const p of pods) {
      const pName = p?.metadata?.name || '';
      const phase = p?.status?.phase;
      const isTerminated = p?.status?.containerStatuses?.some((c: any) => c?.state?.terminated !== undefined);
      if (pName.startsWith('build-') && (phase === 'Succeeded' || phase === 'Failed' || phase === 'Error' || isTerminated)) {
        await (coreApi as any).deleteNamespacedPod({ name: pName, namespace }).catch(() => {});
      }
    }

    // 3. Clean stale temporary Dockerfile ConfigMaps (>5m old) whose build job is no longer active
    const cmsRes: any = await (coreApi as any).listNamespacedConfigMap({ namespace }).catch(() => null);
    const cms = cmsRes?.items || cmsRes?.body?.items || [];
    const nowMs = Date.now();
    for (const cm of cms) {
      const cmName = cm?.metadata?.name || '';
      if (cmName.startsWith('cm-df-build-')) {
        const linkedJobName = cmName.slice('cm-df-'.length);
        const createdMs = cm?.metadata?.creationTimestamp ? new Date(cm.metadata.creationTimestamp).getTime() : 0;
        const isOldEnough = createdMs > 0 && nowMs - createdMs > 5 * 60 * 1000;
        if (isOldEnough && !activeJobNames.has(linkedJobName)) {
          await (coreApi as any).deleteNamespacedConfigMap({ name: cmName, namespace }).catch(() => {});
        }
      }
    }
  } catch {}
}

/**
 * Run Docker Registry v2 garbage collection to physically free deleted manifests/blobs from disk immediately
 */
export async function runRegistryGarbageCollect(): Promise<void> {
  try {
    const { kc, coreApi } = await getAppPlatformK8sClients();
    const namespace = 'app-platform';
    const podsRes: any = await (coreApi as any).listNamespacedPod({
      namespace,
      labelSelector: 'app=app-platform-registry',
    }).catch(() => null);
    const pods = podsRes?.items || podsRes?.body?.items || [];
    const runningPod = pods.find((p: any) => p?.status?.phase === 'Running') || pods[0];
    const podName = runningPod?.metadata?.name;
    if (!podName) return;

    const exec = new k8s.Exec(kc);
    const { PassThrough } = await import('stream');
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    stdoutStream.resume();
    stderrStream.resume();

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 20000);
      exec
        .exec(
          namespace,
          podName,
          'registry',
          ['/bin/registry', 'garbage-collect', '/etc/docker/registry/config.yml', '--delete-untagged=true'],
          stdoutStream,
          stderrStream,
          null,
          false,
          () => {
            clearTimeout(timer);
            resolve();
          }
        )
        .catch(() => {
          clearTimeout(timer);
          resolve();
        });
    });
  } catch {}
}

/**
 * Immediately prune old/unreferenced image manifests and intermediate Kaniko cache layers for an app,
 * then run Registry GC to reclaim disk space immediately instead of waiting 7 days.
 */
export async function pruneAppPlatformRegistryImages(
  subdomain: string,
  keepImageTags: string[],
  clearBuildCache = true
): Promise<void> {
  try {
    const registryBaseUrl = 'http://127.0.0.1:5000';
    const keepSet = new Set(keepImageTags.filter(Boolean));
    let deletedAny = false;

    const deleteTagManifest = async (repoName: string, tag: string) => {
      const manifestRes = await fetch(`${registryBaseUrl}/v2/${repoName}/manifests/${tag}`, {
        headers: {
          Accept:
            'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.oci.image.index.v1+json',
        },
      }).catch(() => null);
      const digest = manifestRes?.headers?.get('Docker-Content-Digest');
      if (digest) {
        const delRes = await fetch(`${registryBaseUrl}/v2/${repoName}/manifests/${digest}`, {
          method: 'DELETE',
        }).catch(() => null);
        if (delRes && delRes.ok) deletedAny = true;
      }
    };

    if (clearBuildCache) {
      const cacheRepo = `${subdomain}-cache`;
      const cacheTagsRes = await fetch(`${registryBaseUrl}/v2/${cacheRepo}/tags/list`).catch(() => null);
      if (cacheTagsRes && cacheTagsRes.ok) {
        const cacheTagList = (await cacheTagsRes.json()) as { tags?: string[] };
        for (const tag of cacheTagList.tags || []) {
          await deleteTagManifest(cacheRepo, tag);
        }
      }
    }

    const appTagsRes = await fetch(`${registryBaseUrl}/v2/${subdomain}/tags/list`).catch(() => null);
    if (appTagsRes && appTagsRes.ok) {
      const appTagList = (await appTagsRes.json()) as { tags?: string[] };
      for (const tag of appTagList.tags || []) {
        if (!keepSet.has(tag)) {
          await deleteTagManifest(subdomain, tag);
        }
      }
    }

    if (deletedAny) {
      await runRegistryGarbageCollect();
    }
  } catch {}
}

/**
 * Delete deployment, service, ingress, and clean up resources
 */
export async function deleteAppPlatformResources(app: AppPlatformRecord): Promise<void> {
  const { appsApi, coreApi, netApi, batchApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = `app-${app.subdomain}`;
  const subdomain = app.subdomain;

  // 1. Delete Deployment
  try {
    await (appsApi as any).deleteNamespacedDeployment({ name, namespace });
  } catch {}

  // 2. Delete Service
  try {
    await (coreApi as any).deleteNamespacedService({ name, namespace });
  } catch {}

  // 3. Delete Ingress
  try {
    await (netApi as any).deleteNamespacedIngress({ name, namespace });
  } catch {}

  // 4. Delete TLS secret
  try {
    await (coreApi as any).deleteNamespacedSecret({ name: `tls-${subdomain}`, namespace });
  } catch {}

  // 5. Delete all Build Jobs for this app
  try {
    const jobsRes: any = await (batchApi as any).listNamespacedJob({ namespace });
    const jobs = jobsRes?.items || jobsRes?.body?.items || [];
    for (const j of jobs) {
      const jName = j?.metadata?.name || '';
      const isMatch = jName.startsWith(`build-${subdomain}-`) || j?.metadata?.labels?.['build.app-platform/app'] === subdomain;
      if (isMatch) {
        await (batchApi as any).deleteNamespacedJob({
          name: jName,
          namespace,
          propagationPolicy: 'Background',
        }).catch(() => {});
      }
    }
  } catch {}

  // 6. Delete all Pods for this app (both runtime and build pods)
  try {
    const podsRes: any = await (coreApi as any).listNamespacedPod({ namespace });
    const pods = podsRes?.items || podsRes?.body?.items || [];
    for (const p of pods) {
      const pName = p?.metadata?.name || '';
      const labels = p?.metadata?.labels || {};
      const isMatch =
        pName.startsWith(`build-${subdomain}-`) ||
        pName.startsWith(`app-${subdomain}-`) ||
        labels['build.app-platform/app'] === subdomain ||
        labels['app'] === `app-${subdomain}` ||
        labels['app'] === subdomain;
      if (isMatch) {
        await (coreApi as any).deleteNamespacedPod({
          name: pName,
          namespace,
        }).catch(() => {});
      }
    }
  } catch {}

  // 7. Delete all ConfigMaps for this app
  try {
    const cmsRes: any = await (coreApi as any).listNamespacedConfigMap({ namespace });
    const cms = cmsRes?.items || cmsRes?.body?.items || [];
    for (const cm of cms) {
      const cmName = cm?.metadata?.name || '';
      const labels = cm?.metadata?.labels || {};
      const isMatch = cmName.startsWith(`cm-df-build-${subdomain}-`) || labels['build.app-platform/app'] === subdomain;
      if (isMatch) {
        await (coreApi as any).deleteNamespacedConfigMap({
          name: cmName,
          namespace,
        }).catch(() => {});
      }
    }
  } catch {}

  // 8. Clean up built images AND layer cache repos from in-cluster registry and run GC immediately
  await pruneAppPlatformRegistryImages(subdomain, [], true).catch(() => {});

  // 8b. Clean up any lingering PR Preview Environments for this app
  try {
    const prDepsRes: any = await (appsApi as any).listNamespacedDeployment({
      namespace,
      labelSelector: `app-platform/pr-parent=${subdomain}`,
    });
    for (const d of (prDepsRes?.items || prDepsRes?.body?.items || [])) {
      const prDepName = d?.metadata?.name;
      const prSub = d?.metadata?.labels?.app;
      if (prDepName) {
        await (netApi as any).deleteNamespacedIngress({ name: prDepName, namespace }).catch(() => {});
        await (coreApi as any).deleteNamespacedService({ name: prDepName, namespace }).catch(() => {});
        await (appsApi as any).deleteNamespacedDeployment({ name: prDepName, namespace, propagationPolicy: 'Foreground' }).catch(() => {});
        if (prSub) {
          await (coreApi as any).deleteNamespacedSecret({ name: `tls-${prSub}`, namespace }).catch(() => {});
        }
      }
    }
  } catch {}

  // 9. Clean up PersistentVolumeClaim if exists
  await (coreApi as any).deleteNamespacedPersistentVolumeClaim({
    name: `pvc-${subdomain}`,
    namespace,
  }).catch(() => {});

  // 10. Clean up any general orphaned build pods
  cleanOrphanedBuildResources().catch(() => {});

  releaseReservedAppPlatformPort(app.port);
}

/**
 * Execute a shell command inside the running App Platform Pod (Web Terminal)
 */
export async function execAppPlatformCommand(
  app: AppPlatformRecord,
  command: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { kc, coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const podsRes: any = await (coreApi as any).listNamespacedPod({
    namespace,
    labelSelector: `app=${app.subdomain}`,
  });
  const pods = podsRes?.items || podsRes?.body?.items || [];
  const runningPod = pods.find((p: any) => p?.status?.phase === 'Running') || pods[0];

  if (!runningPod?.metadata?.name) {
    throw new Error('No running container pod found for this application.');
  }

  const podName = runningPod.metadata.name;
  const containerName = runningPod.spec?.containers?.[0]?.name || 'app';

  const exec = new k8s.Exec(kc);
  const { PassThrough } = await import('stream');

  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  let stdout = '';
  let stderr = '';

  stdoutStream.on('data', (chunk: Buffer) => {
    if (stdout.length < 64000) stdout += chunk.toString('utf8');
  });
  stderrStream.on('data', (chunk: Buffer) => {
    if (stderr.length < 32000) stderr += chunk.toString('utf8');
  });

  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({
        stdout,
        stderr: stderr + '\n[Command timed out after 30s]',
        exitCode: 124,
      });
    }, 30000);

    exec
      .exec(
        namespace,
        podName,
        containerName,
        ['sh', '-c', command],
        stdoutStream,
        stderrStream,
        null,
        false,
        (status: any) => {
          clearTimeout(timer);
          const isSuccess = status?.status === 'Success';
          resolve({
            stdout,
            stderr: isSuccess ? stderr : (stderr || status?.message || ''),
            exitCode: isSuccess ? 0 : 1,
          });
        }
      )
      .catch((err: any) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Deploy an ephemeral PR Preview Environment (pr-<number>-<subdomain>)
 */
export async function applyPrPreviewResources(
  app: AppPlatformRecord,
  prNumber: number,
  imageTag: string
): Promise<{ previewUrl: string }> {
  const { kc } = await getAppPlatformK8sClients();
  const config = await getAppPlatformClusterConfig();
  const namespace = app.k8sNamespace || 'app-platform';
  const previewSubdomain = `pr-${prNumber}-${app.subdomain}`;
  const name = `app-${previewSubdomain}`;
  const clusterImage = `127.0.0.1:5000/${app.subdomain}:${imageTag}`;
  const publicDomain = config.publicDomain || 'app.masdikacloud.my.id';
  const previewHost = `${previewSubdomain}.${publicDomain}`;

  const appsApi = kc.makeApiClient(k8s.AppsV1Api);
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

  const userEnvs = parseEnvVarsToK8sEnv(app.envVars);
  const finalEnvs = [
    { name: 'PORT', value: String(app.appPort || 3000) },
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PR_NUMBER', value: String(prNumber) },
    ...userEnvs,
  ];

  const deploymentManifest: k8s.V1Deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
      labels: {
        app: previewSubdomain,
        'app-platform/pr-parent': app.subdomain,
        'app-platform/pr-number': String(prNumber),
      },
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: previewSubdomain } },
      template: {
        metadata: { labels: { app: previewSubdomain } },
        spec: {
          containers: [
            {
              name: 'app',
              image: clusterImage,
              imagePullPolicy: 'Always',
              ports: [{ containerPort: app.appPort || 3000, name: 'http' }],
              env: finalEnvs,
              resources: {
                requests: { cpu: '100m', memory: '128Mi' },
                limits: { cpu: '500m', memory: '512Mi' },
              },
            },
          ],
        },
      },
    },
  };

  try {
    await (appsApi as any).replaceNamespacedDeployment({ name, namespace, body: deploymentManifest });
  } catch {
    await (appsApi as any).createNamespacedDeployment({ namespace, body: deploymentManifest });
  }

  const serviceManifest: k8s.V1Service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { name, namespace, labels: { app: previewSubdomain, 'app-platform/pr-parent': app.subdomain } },
    spec: {
      type: 'ClusterIP',
      selector: { app: previewSubdomain },
      ports: [{ port: app.appPort || 3000, targetPort: app.appPort || 3000, name: 'http' }],
    },
  };

  try {
    await (coreApi as any).replaceNamespacedService({ name, namespace, body: serviceManifest });
  } catch {
    await (coreApi as any).createNamespacedService({ namespace, body: serviceManifest });
  }

  const ingressManifest: k8s.V1Ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name,
      namespace,
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-production',
        'traefik.ingress.kubernetes.io/router.entrypoints': 'websecure',
        'traefik.ingress.kubernetes.io/router.tls': 'true',
      },
    },
    spec: {
      ingressClassName: 'traefik',
      rules: [
        {
          host: previewHost,
          http: {
            paths: [
              {
                path: '/',
                pathType: 'Prefix',
                backend: { service: { name, port: { number: app.appPort || 3000 } } },
              },
            ],
          },
        },
      ],
      tls: [{ hosts: [previewHost], secretName: `tls-${previewSubdomain}` }],
    },
  };

  try {
    await (networkingApi as any).replaceNamespacedIngress({ name, namespace, body: ingressManifest });
  } catch {
    await (networkingApi as any).createNamespacedIngress({ namespace, body: ingressManifest });
  }

  return { previewUrl: `https://${previewHost}` };
}

/**
 * Clean up an ephemeral PR Preview Environment when PR is closed or merged
 */
export async function deletePrPreviewResources(
  app: AppPlatformRecord,
  prNumber: number
): Promise<void> {
  const { appsApi, coreApi, netApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const previewSubdomain = `pr-${prNumber}-${app.subdomain}`;
  const name = `app-${previewSubdomain}`;

  await (netApi as any).deleteNamespacedIngress({ name, namespace }).catch(() => {});
  await (coreApi as any).deleteNamespacedService({ name, namespace }).catch(() => {});
  await (appsApi as any).deleteNamespacedDeployment({ name, namespace, propagationPolicy: 'Foreground' }).catch(() => {});
  await (coreApi as any).deleteNamespacedSecret({ name: `tls-${previewSubdomain}`, namespace }).catch(() => {});
}

/**
 * Test Kubernetes connection and fetch cluster nodes for Cloud Apps (App Platform)
 */
export async function testAppPlatformClusterConnection(customConfig?: {
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
      const activeConfig = await getAppPlatformClusterConfig();
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
          name: 'app-platform-cluster',
          server: apiServer.trim(),
          skipTLSVerify: skipTls,
        },
        {
          name: 'app-platform-user',
          token: serviceToken.trim(),
        }
      );
    } else {
      return {
        success: false,
        message: 'No Kubeconfig YAML or API Server configuration provided for Cloud Apps (App Platform).',
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
    const { validateClusterOrStorageEndpoint } = await import('@/lib/ssrf');
    await validateClusterOrStorageEndpoint(targetServer, 'Kubernetes API Server');

    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const nodeRes = await coreApi.listNode();
    const items = (nodeRes as any).items || (nodeRes as any).body?.items || [];
    const latencyMs = Date.now() - startTime;
    const nodes = items.map((n: any) => n.metadata?.name || 'unknown');

    // Pre-warm / ensure private registry is running in background
    ensureAppPlatformRegistry().catch(() => {});

    return {
      success: true,
      message: `Connected successfully to Cloud Apps Kubernetes cluster (${latencyMs}ms). Found ${nodes.length} node(s): ${nodes.join(', ')}`,
      nodes,
      latencyMs,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error?.message || 'Unable to connect to Cloud Apps Kubernetes API'}`,
      latencyMs: Date.now() - startTime,
    };
  }
}
