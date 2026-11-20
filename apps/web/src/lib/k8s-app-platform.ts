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
  dockerfilePath?: string | null;
  rootDirectory?: string | null;
  buildCommand?: string | null;
  startCommand?: string | null;
  envVars?: string | null;
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
 * Generate standard Dockerfile if not supplied by user
 */
export function generateDockerfileForFramework(
  framework: string,
  buildCommand?: string | null,
  startCommand?: string | null,
  appPort = 3000
): string {
  const norm = (framework || 'DOCKERFILE').toUpperCase();

  switch (norm) {
    case 'LARAVEL': {
      return `# Generated by Masdika App Platform (Laravel)
FROM php:8.2-apache
WORKDIR /var/www/html
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libzip-dev libpng-dev libonig-dev && docker-php-ext-install pdo pdo_mysql mysqli mbstring zip gd && rm -rf /var/lib/apt/lists/*
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
COPY . /var/www/html/
RUN if [ -f composer.json ]; then composer install --no-dev --optimize-autoloader --no-interaction || true; fi
RUN mkdir -p /var/www/html/storage /var/www/html/bootstrap/cache && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache || true
RUN a2enmod rewrite
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!/var/www/html/public!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf
RUN sed -i 's/80/${appPort}/g' /etc/apache2/ports.conf /etc/apache2/sites-available/*.conf
EXPOSE ${appPort}
`;
    }

    case 'NEXTJS':
    case 'NODEJS':
    case 'NESTJS':
    case 'REMIX':
    case 'SVELTE':
    case 'ASTRO': {
      const build = buildCommand?.trim() || 'npm run build';
      const start = startCommand?.trim() || 'npm start';
      return `# Generated by Masdika App Platform (${norm})
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY . .
RUN if [ -f package-lock.json ]; then npm ci; elif [ -f package.json ]; then npm install; fi
RUN if [ -n "${build}" ]; then ${build} || true; fi
ENV PORT=${appPort}
ENV NODE_ENV=production
EXPOSE ${appPort}
CMD ["sh", "-c", "${start}"]
`;
    }

    case 'FASTAPI':
    case 'DJANGO':
    case 'PYTHON': {
      const start = startCommand?.trim() || (norm === 'FASTAPI' ? `uvicorn main:app --host 0.0.0.0 --port ${appPort}` : 'python app.py');
      return `# Generated by Masdika App Platform (${norm})
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY . .
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
ENV PORT=${appPort}
EXPOSE ${appPort}
CMD ["sh", "-c", "${start}"]
`;
    }

    case 'RUST': {
      return `# Generated by Masdika App Platform (Rust)
FROM rust:1.75-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY . .
RUN cargo build --release
RUN mkdir -p /root_bin && cp /app/target/release/$(find /app/target/release -maxdepth 1 -type f -perm /111 ! -name "*.*" | head -n 1) /root_bin/server 2>/dev/null || true

FROM alpine:latest
WORKDIR /root/
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /root_bin/server /root/server
ENV PORT=${appPort}
EXPOSE ${appPort}
CMD ["./server"]
`;
    }

    case 'RUBY':
    case 'RAILS': {
      return `# Generated by Masdika App Platform (Ruby on Rails)
FROM ruby:3.2-slim
WORKDIR /app
RUN apt-get update -qq && apt-get install -y --no-install-recommends build-essential libpq-dev nodejs && rm -rf /var/lib/apt/lists/*
COPY . .
RUN if [ -f Gemfile ]; then bundle install; fi
ENV PORT=${appPort}
EXPOSE ${appPort}
CMD ["sh", "-c", "bundle exec rails server -b 0.0.0.0 -p ${appPort} || ruby app.rb"]
`;
    }

    case 'GOLANG': {
      return `# Generated by Masdika App Platform (Go)
FROM golang:1.22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.* ./
RUN if [ -f go.mod ]; then go mod download; fi
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/
COPY --from=builder /app/server ./
ENV PORT=${appPort}
EXPOSE ${appPort}
CMD ["./server"]
`;
    }

    case 'PHP': {
      return `# Generated by Masdika App Platform (PHP)
FROM php:8.2-apache
RUN docker-php-ext-install pdo pdo_mysql mysqli
RUN a2enmod rewrite
COPY . /var/www/html/
RUN sed -i 's/80/${appPort}/g' /etc/apache2/ports.conf /etc/apache2/sites-available/*.conf
EXPOSE ${appPort}
`;
    }

    case 'STATIC': {
      const build = buildCommand?.trim();
      if (build) {
        return `# Generated by Masdika App Platform (Static Site Builder)
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN if [ -f package-lock.json ]; then npm ci; elif [ -f package.json ]; then npm install; fi
RUN ${build}
RUN mkdir -p /app/public_out && if [ -d /app/dist ]; then cp -r /app/dist/* /app/public_out/; elif [ -d /app/build ]; then cp -r /app/build/* /app/public_out/; elif [ -d /app/out ]; then cp -r /app/out/* /app/public_out/; else cp -r ./* /app/public_out/ 2>/dev/null || true; fi

FROM nginx:alpine
COPY --from=builder /app/public_out /usr/share/nginx/html
EXPOSE 80
`;
      }
      return `# Generated by Masdika App Platform (Static HTML)
FROM nginx:alpine
COPY . /usr/share/nginx/html/
EXPOSE 80
`;
    }

    default:
      return '';
  }
}

/**
 * Parse environment variables string into K8s env array
 */
function parseEnvVarsToK8sEnv(envVarsString?: string | null): Array<{ name: string; value: string }> {
  if (!envVarsString) return [];
  const envs: Array<{ name: string; value: string }> = [];

  // Try parsing as JSON first
  try {
    const parsed = JSON.parse(envVarsString);
    if (typeof parsed === 'object' && parsed !== null) {
      for (const [key, val] of Object.entries(parsed)) {
        if (key && typeof key === 'string') {
          envs.push({ name: key.trim(), value: String(val) });
        }
      }
      return envs;
    }
  } catch {
    // If not JSON, parse line by line (KEY=VALUE)
  }

  const lines = envVarsString.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const name = trimmed.substring(0, idx).trim();
      const value = trimmed.substring(idx + 1).trim();
      if (name) {
        envs.push({ name, value });
      }
    }
  }

  return envs;
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
            const existing = (await objApi.read({
              apiVersion: spec.apiVersion || 'v1',
              kind: 'Service',
              metadata: {
                name: spec.metadata.name,
                namespace: spec.metadata.namespace || 'default',
              },
            }).catch(() => null)) as any;
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

/**
 * Create Kaniko build job in the cluster
 */
export async function triggerAppPlatformBuild(
  app: AppPlatformRecord
): Promise<{ jobName: string; imageTag: string }> {
  const { batchApi, coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const timestamp = Date.now();
  const imageTag = `b${timestamp.toString(36)}`;
  const jobName = `build-${app.subdomain}-${timestamp.toString(36)}`;
  const destinationImage = `127.0.0.1:5000/${app.subdomain}:${imageTag}`;

  // Ensure namespace exists
  try {
    await (coreApi as any).createNamespace({
      body: { metadata: { name: namespace } },
    });
  } catch (err: any) {
    if (err?.statusCode !== 409 && err?.response?.statusCode !== 409) {
      // Ignore if exists
    }
  }

  // Handle custom Dockerfile generation if needed
  let configMapName: string | undefined = undefined;
  const isCustomFramework = app.buildType !== 'DOCKERFILE';
  if (isCustomFramework) {
    const generatedDockerfile = generateDockerfileForFramework(
      app.buildType,
      app.buildCommand,
      app.startCommand,
      app.appPort
    );
    if (generatedDockerfile) {
      configMapName = `cm-df-${jobName}`;
      await (coreApi as any).createNamespacedConfigMap({
        namespace,
        body: {
          metadata: {
            name: configMapName,
            labels: {
              app: app.subdomain,
              'app.kubernetes.io/managed-by': 'masdika-app-platform',
            },
          },
          data: {
            Dockerfile: generatedDockerfile,
          },
        },
      });
    }
  }

  const gitUrl = app.gitUrl.trim();
  const branch = (app.branch || 'main').trim();

  // Kaniko Job Specification
  // Uses an init container with git to clone shallow repo into emptyDir /workspace
  // Then Kaniko builds and pushes directly to in-cluster registry
  const jobManifest: k8s.V1Job = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: jobName,
      namespace,
      labels: {
        app: app.subdomain,
        'app.kubernetes.io/managed-by': 'masdika-app-platform',
        'build.app-platform/image-tag': imageTag,
      },
    },
    spec: {
      ttlSecondsAfterFinished: 3600, // clean up after 1 hour
      backoffLimit: 1,
      template: {
        metadata: {
          labels: {
            app: app.subdomain,
            job: jobName,
          },
        },
        spec: {
          restartPolicy: 'Never',
          volumes: [
            {
              name: 'workspace',
              emptyDir: {},
            },
            ...(configMapName
              ? [
                  {
                    name: 'custom-dockerfile',
                    configMap: {
                      name: configMapName,
                    },
                  },
                ]
              : []),
          ],
          initContainers: [
            {
              name: 'git-clone',
              image: 'alpine/git:latest',
              command: ['sh', '-c'],
              args: [
                `echo "Cloning ${gitUrl} (branch: ${branch})..." && git clone --depth=1 --branch ${branch} ${gitUrl} /workspace/src && cp -rf /workspace/src/. /workspace/ && rm -rf /workspace/src && echo "Clone completed."`,
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
              name: 'kaniko',
              image: 'gcr.io/kaniko-project/executor:latest',
              args: [
                '--context=dir:///workspace',
                ...(configMapName
                  ? ['--dockerfile=/custom-dockerfile/Dockerfile']
                  : [
                      `--dockerfile=${
                        app.dockerfilePath && app.dockerfilePath.trim() ? app.dockerfilePath.trim() : 'Dockerfile'
                      }`,
                    ]),
                `--destination=${destinationImage}`,
                '--insecure',
                '--skip-tls-verify',
                '--cache=true',
                '--cache-dir=/workspace/cache',
              ],
              volumeMounts: [
                {
                  name: 'workspace',
                  mountPath: '/workspace',
                },
                ...(configMapName
                  ? [
                      {
                        name: 'custom-dockerfile',
                        mountPath: '/custom-dockerfile',
                      },
                    ]
                  : []),
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
      lastBuildStatus: 'BUILDING',
      lastBuildLog: `Build job [${jobName}] queued for repository ${app.gitUrl} on branch ${branch}...\n`,
    },
  });

  return { jobName, imageTag };
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
  const clusterImage = `registry.app-platform.svc.cluster.local:5000/${app.subdomain}:${imageTag}`;
  const publicDomain = config.publicDomain || 'app.masdikacloud.my.id';
  const appHost = `${app.subdomain}.${publicDomain}`;

  // Parse user environment variables
  const userEnvs = parseEnvVarsToK8sEnv(app.envVars);
  const defaultEnvs = [
    { name: 'PORT', value: String(app.appPort) },
    { name: 'NODE_ENV', value: 'production' },
    { name: 'APP_SUBDOMAIN', value: app.subdomain },
    { name: 'APP_DOMAIN', value: appHost },
  ];

  // Merge envs (user envs override defaults)
  const envMap = new Map<string, string>();
  for (const e of defaultEnvs) envMap.set(e.name, e.value);
  for (const e of userEnvs) envMap.set(e.name, e.value);
  const finalEnvs = Array.from(envMap.entries()).map(([k, v]) => ({ name: k, value: v }));

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

  const ingressManifest: k8s.V1Ingress = {
    apiVersion: 'networking.k8s.io/v1',
    kind: 'Ingress',
    metadata: {
      name,
      namespace,
      annotations: {
        'cert-manager.io/cluster-issuer': 'letsencrypt-prod',
        'traefik.ingress.kubernetes.io/router.entrypoints': 'web,websecure',
        'traefik.ingress.kubernetes.io/router.tls': 'true',
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

/**
 * Watch Kaniko build job in the background and update deployment upon completion
 */
export async function trackAppPlatformBuildAsync(
  appId: number,
  jobName: string,
  imageTag: string
): Promise<void> {
  const maxWaitMs = 15 * 60 * 1000; // 15 minutes timeout
  const pollIntervalMs = 4000; // poll every 4 seconds
  const startTime = Date.now();

  try {
    const { batchApi, coreApi } = await getAppPlatformK8sClients();
    const namespace = 'app-platform';

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));

      // 1. Fetch Job status
      let jobStatus: any;
      try {
        const jobRes: any = await (batchApi as any).readNamespacedJob({ name: jobName, namespace });
        jobStatus = jobRes?.status || jobRes?.body?.status;
      } catch (err) {
        console.warn(`[AppPlatform] Read job ${jobName} status error:`, err);
        continue;
      }

      // 2. Fetch pod logs to update build log in DB
      let podLogs = '';
      try {
        let podsRes: any = await (coreApi as any).listNamespacedPod({
          namespace,
          labelSelector: `job-name=${jobName}`,
        });
        let pods = podsRes?.items || podsRes?.body?.items || [];
        if (pods.length === 0) {
          podsRes = await (coreApi as any).listNamespacedPod({
            namespace,
            labelSelector: `job=${jobName}`,
          });
          pods = podsRes?.items || podsRes?.body?.items || [];
        }
        if (pods.length > 0) {
          const podName = pods[0]?.metadata?.name;
          if (podName) {
            const logRes: any = await (coreApi as any).readNamespacedPodLog({
              name: podName,
              namespace,
              container: 'kaniko',
            });
            podLogs = typeof logRes === 'string' ? logRes : (logRes?.body || String(logRes || ''));
          }
        }
      } catch {
        // Logs might not be ready yet
      }

      if (podLogs) {
        await prisma.appPlatformService.update({
          where: { id: appId },
          data: {
            lastBuildLog: podLogs.slice(-25000), // Keep last 25KB
          },
        });
      }

      // 3. Check if Job succeeded
      if (jobStatus?.succeeded && jobStatus.succeeded > 0) {
        console.log(`[AppPlatform] Build job ${jobName} succeeded! Deploying resources...`);
        const app = await prisma.appPlatformService.findUnique({ where: { id: appId } });
        if (!app) return;

        await applyAppPlatformResources(app as any, imageTag);

        await prisma.appPlatformService.update({
          where: { id: appId },
          data: {
            status: 'RUNNING',
            lastBuildStatus: 'SUCCESS',
            lastDeployedAt: new Date(),
            k8sDeployment: `app-${app.subdomain}`,
            k8sService: `app-${app.subdomain}`,
            k8sIngress: `app-${app.subdomain}`,
          },
        });
        return;
      }

      // 4. Check if Job failed
      if (jobStatus?.failed && jobStatus.failed > 0) {
        console.error(`[AppPlatform] Build job ${jobName} failed.`);
        await prisma.appPlatformService.update({
          where: { id: appId },
          data: {
            status: 'ERROR',
            lastBuildStatus: 'FAILED',
          },
        });
        return;
      }
    }

    // Timed out
    await prisma.appPlatformService.update({
      where: { id: appId },
      data: {
        status: 'ERROR',
        lastBuildStatus: 'FAILED',
        lastBuildLog: (await prisma.appPlatformService.findUnique({ where: { id: appId } }))?.lastBuildLog + '\n[Build timed out after 15 minutes]',
      },
    });
  } catch (err: any) {
    console.error(`[AppPlatform] Build tracking error for ${jobName}:`, err);
    await prisma.appPlatformService.update({
      where: { id: appId },
      data: {
        status: 'ERROR',
        lastBuildStatus: 'FAILED',
      },
    }).catch(() => {});
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
  const { coreApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';

  const podsRes: any = await (coreApi as any).listNamespacedPod({
    namespace,
    labelSelector: `app=${app.subdomain}`,
  });
  const pods = podsRes?.items || podsRes?.body?.items || [];
  if (pods.length === 0) {
    return 'No active pods found for this application.';
  }

  const runningPod = pods.find((p: any) => p?.status?.phase === 'Running') || pods[0];
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
    return `Failed to fetch logs: ${err?.message || 'Unknown error'}`;
  }
}

/**
 * Delete deployment, service, ingress, and clean up resources
 */
export async function deleteAppPlatformResources(app: AppPlatformRecord): Promise<void> {
  const { appsApi, coreApi, netApi } = await getAppPlatformK8sClients();
  const namespace = app.k8sNamespace || 'app-platform';
  const name = `app-${app.subdomain}`;

  // Delete Deployment
  try {
    await (appsApi as any).deleteNamespacedDeployment({ name, namespace });
  } catch {}

  // Delete Service
  try {
    await (coreApi as any).deleteNamespacedService({ name, namespace });
  } catch {}

  // Delete Ingress
  try {
    await (netApi as any).deleteNamespacedIngress({ name, namespace });
  } catch {}

  // Delete TLS secret
  try {
    await (coreApi as any).deleteNamespacedSecret({ name: `tls-${app.subdomain}`, namespace });
  } catch {}

  releaseReservedAppPlatformPort(app.port);
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
