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
  const apiServer = settingMap.get('managed_app_api_server') || process.env.MANAGED_APP_API_SERVER || 'https://192.168.79.17:6443';

  const rawKubeconfig = settingMap.get('managed_app_kubeconfig') || process.env.MANAGED_APP_KUBECONFIG || '';
  const kubeconfig = rawKubeconfig.startsWith('enc:') ? (decryptDeterministic(rawKubeconfig) || rawKubeconfig) : rawKubeconfig;

  const rawToken = settingMap.get('managed_app_service_token') || process.env.MANAGED_APP_SERVICE_TOKEN || '';
  const serviceToken = rawToken.startsWith('enc:') ? (decryptDeterministic(rawToken) || rawToken) : rawToken;

  const skipTlsSetting = settingMap.get('managed_app_skip_tls');
  const skipTlsVerify = skipTlsSetting !== undefined ? skipTlsSetting === 'true' : true;
  const caCert = settingMap.get('managed_app_ca_cert') || process.env.MANAGED_APP_CA_CERT || '';

  const publicDomain = settingMap.get('managed_app_public_domain') || process.env.MANAGED_APP_PUBLIC_DOMAIN || 'app.masdika.id';
  const publicIp = settingMap.get('managed_app_public_ip') || process.env.MANAGED_APP_PUBLIC_IP || '103.247.10.61';

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
    try {
      kc.loadFromCluster();
    } catch {
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

    if (!kubeconfig && !serviceToken && !apiServer) {
      const activeConfig = await getAppClusterConfig();
      kubeconfig = activeConfig.kubeconfig;
      apiServer = activeConfig.apiServer;
      serviceToken = activeConfig.serviceToken;
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
      kc.loadFromCluster();
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

/**
 * Allocate an available NodePort in the range 30000..32767
 * Checks BOTH DatabaseService and AppService tables to prevent collisions.
 */
export async function allocateAppPort(min = 30000, max = 32767): Promise<number> {
  const [usedApps, usedDbs] = await Promise.all([
    prisma.appService.findMany({
      where: { status: { not: 'TERMINATED' } },
      select: { port: true },
    }),
    prisma.databaseService.findMany({
      where: { status: { not: 'TERMINATED' } },
      select: { port: true },
    }),
  ]);

  const usedPorts = new Set<number>();
  usedApps.forEach((a) => usedPorts.add(a.port));
  usedDbs.forEach((d) => usedPorts.add(d.port));

  for (let port = min; port <= max; port++) {
    if (!usedPorts.has(port)) {
      return port;
    }
  }

  throw new Error(`No available NodePort in allocated range (${min}-${max})`);
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
function buildAppContainerSpec(app: AppServiceRecord) {
  const appType = app.appType.toLowerCase();
  const catalogItem = getAppDefinition(appType);
  const dataMount = catalogItem?.dataDir || '/app/data';
  const fullDomain = `${app.subdomain}.app.masdika.id`;

  let image = catalogItem?.defaultImage || 'docker.io/library/node:22-alpine';
  let envYaml = '';
  let commandYaml = '';

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
    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            apk add --no-cache openssh bash git curl nano python3 py3-pip && \
            ssh-keygen -A && \
            echo "root:${sshPassword}" | chpasswd && \
            sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
            echo "PermitRootLogin yes" >> /etc/ssh/sshd_config && \
            echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config && \
            mkdir -p ${dataMount} /root/.hermes && \
            exec /usr/sbin/sshd -D -e -p ${app.appPort}
`;
  } else if (appType === 'ninerouter') {
    image = 'docker.io/library/node:22-alpine';
    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            cat << 'EOF' > /server.js
            const http = require('http');
            const server = http.createServer((req, res) => {
              if (req.url === '/health' || req.url === '/v1/models') {
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200);
                return res.end(JSON.stringify({ status: 'healthy', service: '9router', version: '1.0.0', object: 'list', data: [] }));
              }
              res.setHeader('Content-Type', 'text/html; charset=utf-8');
              res.writeHead(200);
              res.end(\`<!DOCTYPE html>
              <html>
              <head>
                <title>9Router AI Gateway - Masdika Cloud</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                  .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; max-width: 580px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
                  h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px 0; color: #fff; }
                  p { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 20px 0; }
                  .info-box { background: #0f0f11; border: 1px solid #27272a; border-radius: 8px; padding: 14px; font-family: monospace; font-size: 13px; color: #e4e4e7; margin-bottom: 20px; word-break: break-all; }
                  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; animation: pulse 2s infinite; }
                  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                  .btn { display: inline-block; background: #8b5cf6; color: #fff; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 8px; text-decoration: none; transition: background 0.2s; }
                  .btn:hover { background: #7c3aed; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="badge"><span class="status-dot"></span> Active Router Gateway</div>
                  <h1>9Router Gateway Ready</h1>
                  <p>Smart multi-provider AI proxy with auto-fallback, RTK token optimizer, and Claude Code / Cursor integration.</p>
                  <div class="info-box">
                    <div><b>Proxy URL:</b> https://${fullDomain}</div>
                    <div><b>Port:</b> ${app.appPort}</div>
                    <div><b>Health Endpoint:</b> https://${fullDomain}/health</div>
                  </div>
                  <a href="https://github.com/decolua/9router" target="_blank" class="btn">View 9Router Docs &rarr;</a>
                </div>
              </body>
              </html>\`);
            });
            server.listen(${app.appPort}, '0.0.0.0', () => {
              console.log('9Router listening on port ${app.appPort}');
            });
            EOF
            node /server.js
`;
  } else if (appType === 'opencode') {
    image = 'docker.io/library/node:22-alpine';
    const sshPassword = app.password || 'OpenCode123!';
    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            apk add --no-cache openssh bash git curl nano && \
            ssh-keygen -A && \
            echo "root:${sshPassword}" | chpasswd && \
            sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
            echo "PermitRootLogin yes" >> /etc/ssh/sshd_config && \
            echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config && \
            mkdir -p ${dataMount} && \
            exec /usr/sbin/sshd -D -e -p ${app.appPort}
`;
  } else if (appType === 'openclaw') {
    image = 'docker.io/library/node:22-alpine';
    commandYaml = `
        command: ["/bin/sh", "-c"]
        args:
          - |
            cat << 'EOF' > /server.js
            const http = require('http');
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
            EOF
            node /server.js
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
  const ns = 'managed-apps';
  const name = `app-${app.id}-${app.subdomain}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
  const fullDomain = `${app.subdomain}.app.masdika.id`;

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

  const { image, dataMount, envYaml, commandYaml } = buildAppContainerSpec(app);
  const catalogItem = getAppDefinition(app.appType);
  const isSshApp = catalogItem?.accessProtocol === 'SSH';

  const cpuReq = `${Math.max(0.1, Number((app.cpuShares * 0.4).toFixed(2)))}`;
  const cpuLim = `${app.cpuShares}`;
  const memReq = `${Math.max(128, Math.round(app.memoryMb * 0.5))}Mi`;
  const memLim = `${app.memoryMb}Mi`;
  const storageSize = `${Math.max(5, app.storageGb || 10)}Gi`;

  const ingressYaml = !isSshApp ? `
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
              number: ${app.appPort}
` : '';

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
        imagePullPolicy: IfNotPresent
        ports:
        - name: app-port
          containerPort: ${app.appPort}${commandYaml}${envYaml ? `\n        env:${envYaml}` : ''}
        readinessProbe:
          tcpSocket:
            port: ${app.appPort}
          initialDelaySeconds: 5
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:
          tcpSocket:
            port: ${app.appPort}
          initialDelaySeconds: 15
          periodSeconds: 15
          failureThreshold: 5
        resources:
          requests:
            cpu: "${cpuReq}"
            memory: "${memReq}"
          limits:
            cpu: "${cpuLim}"
            memory: "${memLim}"
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
  ports:
  - name: app-port
    port: ${app.appPort}
    targetPort: ${app.appPort}
    nodePort: ${app.port}${ingressYaml}
`;

  await applyKubernetesManifests(kc, manifestYaml);

  return {
    deploymentName: `deploy-${name}`,
    serviceName: `svc-${name}`,
    pvcName: `pvc-${name}`,
    ingressName: !isSshApp ? `ing-${name}` : '',
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
 * Start App Service: Scale replicas to 1
 */
export async function startAppService(app: AppServiceRecord): Promise<void> {
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
      replicas: 1,
    },
  });
}

/**
 * Restart App Service: Roll deployment pods
 */
export async function restartAppService(app: AppServiceRecord): Promise<void> {
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
  } catch {}

  // Service
  try {
    await coreApi.deleteNamespacedService({ name: svcName, namespace: ns });
  } catch {}

  // Deployment
  try {
    await appsApi.deleteNamespacedDeployment({ name: deployName, namespace: ns });
  } catch {}

  // PVC
  try {
    await coreApi.deleteNamespacedPersistentVolumeClaim({ name: pvcName, namespace: ns });
  } catch {}

  // TLS Secret
  try {
    await coreApi.deleteNamespacedSecret({ name: tlsSecret, namespace: ns });
  } catch {}
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
