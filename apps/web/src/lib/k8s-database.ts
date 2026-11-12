import * as k8s from '@kubernetes/client-node';
import { Writable, Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import tarStream from 'tar-stream';
import { prisma } from './prisma';
import { decryptDeterministic, encryptDeterministic } from './encryption';

export interface DatabaseServiceRecord {
  id: number;
  userId: number;
  name: string;
  type: string;
  version: string;
  planName?: string | null;
  region: string;
  node: string;
  host: string;
  port: number;
  dbName: string;
  username: string;
  password?: string | null;
  rootPassword?: string | null;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  billingMode?: string;
  monthlyPrice?: number;
  hourlyRate?: number;
  accumulatedCost?: number;
  status: string;
  k8sNamespace?: string | null;
  lastBilledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface K8sClusterConfig {
  authMode: 'KUBECONFIG' | 'TOKEN';
  apiServer: string;
  kubeconfig?: string;
  serviceToken?: string;
  skipTlsVerify: boolean;
  caCert?: string;
  publicDomain: string;
  publicIp: string;
  pmaUrl: string;
  pgadminUrl: string;
  mongoUrl: string;
}

// In-memory cache for cluster configuration (60 seconds TTL)
let cachedClusterConfig: K8sClusterConfig | null = null;
let clusterConfigExpiry = 0;

/**
 * Invalidate the cluster configuration in-memory cache so updates take effect immediately.
 */
export function invalidateK8sClusterConfigCache(): void {
  cachedClusterConfig = null;
  clusterConfigExpiry = 0;
}

/**
 * Dynamically retrieve Kubernetes cluster credentials from Database Settings (`Setting` table).
 * Never store hardcoded plaintext IP or passwords in source scripts.
 */
export async function getK8sClusterConfig(forceRefresh = false): Promise<K8sClusterConfig> {
  const now = Date.now();
  if (!forceRefresh && cachedClusterConfig && now < clusterConfigExpiry) {
    return cachedClusterConfig;
  }

  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'managed_db_auth_mode',
          'managed_db_api_server',
          'managed_db_kubeconfig',
          'managed_db_service_token',
          'managed_db_skip_tls',
          'managed_db_ca_cert',
          'managed_db_public_domain',
          'managed_db_public_ip',
          'managed_db_pma_url',
          'managed_db_pgadmin_url',
          'managed_db_mongo_url',
        ],
      },
    },
  });

  const settingMap = new Map<string, string>();
  for (const s of settings) {
    settingMap.set(s.key, s.value);
  }

  const authMode = (settingMap.get('managed_db_auth_mode') || 'KUBECONFIG') as 'KUBECONFIG' | 'TOKEN';
  const apiServer = settingMap.get('managed_db_api_server') || process.env.MANAGED_DB_API_SERVER || '';

  const rawKubeconfig = settingMap.get('managed_db_kubeconfig') || process.env.MANAGED_DB_KUBECONFIG || '';
  const kubeconfig = rawKubeconfig.startsWith('enc:') ? (decryptDeterministic(rawKubeconfig) || rawKubeconfig) : rawKubeconfig;

  const rawToken = settingMap.get('managed_db_service_token') || process.env.MANAGED_DB_SERVICE_TOKEN || '';
  const serviceToken = rawToken.startsWith('enc:') ? (decryptDeterministic(rawToken) || rawToken) : rawToken;

  const skipTlsSetting = settingMap.get('managed_db_skip_tls');
  const skipTlsVerify = skipTlsSetting !== undefined ? skipTlsSetting === 'true' : true;
  const caCert = settingMap.get('managed_db_ca_cert') || process.env.MANAGED_DB_CA_CERT || '';

  const publicDomain = settingMap.get('managed_db_public_domain') || process.env.MANAGED_DB_PUBLIC_DOMAIN || 'db.masdika.id';
  const publicIp = settingMap.get('managed_db_public_ip') || process.env.MANAGED_DB_PUBLIC_IP || '103.247.10.61';
  const pmaUrl = settingMap.get('managed_db_pma_url') || process.env.MANAGED_DB_PMA_URL || 'https://pma.db.masdika.id';
  const pgadminUrl = settingMap.get('managed_db_pgadmin_url') || process.env.MANAGED_DB_PGADMIN_URL || 'https://pgadmin.db.masdika.id';
  const mongoUrl = settingMap.get('managed_db_mongo_url') || process.env.MANAGED_DB_MONGO_URL || 'https://mongo.db.masdika.id';

  cachedClusterConfig = {
    authMode,
    apiServer,
    kubeconfig,
    serviceToken,
    skipTlsVerify,
    caCert,
    publicDomain,
    publicIp,
    pmaUrl,
    pgadminUrl,
    mongoUrl,
  };
  clusterConfigExpiry = now + 60000;

  return cachedClusterConfig;
}

export const MANAGED_DB_PUBLIC_DOMAIN = process.env.MANAGED_DB_PUBLIC_DOMAIN || 'db.masdika.id';
export const MANAGED_DB_PUBLIC_IP = process.env.MANAGED_DB_PUBLIC_IP || '103.247.10.61';
export const MANAGED_DB_PMA_URL = process.env.MANAGED_DB_PMA_URL || 'https://pma.db.masdika.id';
export const MANAGED_DB_PGADMIN_URL = process.env.MANAGED_DB_PGADMIN_URL || 'https://pgadmin.db.masdika.id';
export const MANAGED_DB_MONGO_URL = process.env.MANAGED_DB_MONGO_URL || 'https://mongo.db.masdika.id';

/**
 * Build an authenticated KubeConfig instance from DB settings
 */
export async function getK8sKubeConfig(): Promise<k8s.KubeConfig> {
  const config = await getK8sClusterConfig();
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
        name: 'k3s-cluster',
        server: config.apiServer.trim(),
        skipTLSVerify: config.skipTlsVerify,
        caData: config.caCert ? Buffer.from(config.caCert).toString('base64') : undefined,
      },
      {
        name: 'k3s-service-account',
        token: config.serviceToken.trim(),
      }
    );
  } else {
    // In-cluster fallback
    try {
      kc.loadFromCluster();
    } catch {
      throw new Error('Kubernetes API configuration is missing. Please configure Kubeconfig or API Server in Admin Settings.');
    }
  }

  return kc;
}

/**
 * Ensure the target Kubernetes namespace exists
 */
export async function ensureNamespace(kc: k8s.KubeConfig, ns = 'managed-db'): Promise<void> {
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  try {
    await coreApi.readNamespace({ name: ns });
  } catch (err: any) {
    const status = err.statusCode || err.code || err.response?.statusCode || err.body?.code;
    if (status === 404) {
      await coreApi.createNamespace({
        body: {
          metadata: {
            name: ns,
            labels: {
              'managed-by': 'masdika-cloud',
            },
          },
        },
      });
    }
  }
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
 * Execute a command inside a Kubernetes pod container using the native WebSocket Exec API
 */
export async function execInPod(
  kc: k8s.KubeConfig,
  namespace: string,
  podName: string,
  containerName: string,
  command: string[],
  stdinData?: Buffer | string
): Promise<{ stdout: string; stderr: string; success: boolean; error?: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const exec = new k8s.Exec(kc);
      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];

      const stdoutStream = new Writable({
        write(chunk, encoding, callback) {
          stdoutChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });

      const stderrStream = new Writable({
        write(chunk, encoding, callback) {
          stderrChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          callback();
        },
      });

      let stdinStream: Readable | null = null;
      if (stdinData) {
        stdinStream = Readable.from([Buffer.isBuffer(stdinData) ? stdinData : Buffer.from(stdinData)]);
      }

      let statusResult: any = null;

      const ws = await exec.exec(
        namespace,
        podName,
        containerName,
        command,
        stdoutStream,
        stderrStream,
        stdinStream,
        false, // tty
        (status) => {
          statusResult = status;
        }
      );

      const timeout = setTimeout(() => {
        try {
          ws.close();
        } catch {}
        resolve({
          stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
          stderr: 'Command execution timed out after 120 seconds',
          success: false,
          error: 'Execution timed out',
        });
      }, 120000);

      const finish = () => {
        clearTimeout(timeout);
        setTimeout(() => {
          const stdout = Buffer.concat(stdoutChunks).toString('utf-8');
          const stderr = Buffer.concat(stderrChunks).toString('utf-8');
          const isSuccess = !statusResult || statusResult.status === 'Success';
          const errorMsg = !isSuccess
            ? (stderr?.trim() ? stderr.trim() : statusResult?.message || 'Command execution failed')
            : undefined;
          resolve({
            stdout,
            stderr,
            success: isSuccess,
            error: errorMsg,
          });
        }, 50);
      };

      if (typeof (ws as any).on === 'function') {
        (ws as any).on('close', finish);
        (ws as any).on('error', (err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      } else {
        (ws as any).onclose = finish;
        (ws as any).onerror = (err: any) => {
          clearTimeout(timeout);
          reject(err);
        };
      }
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Allocate a unique NodePort (30000 - 32767) for direct TCP database access
 */
export async function allocateAvailablePort(min = 30500, max = 32000): Promise<number> {
  const usedDbs = await prisma.databaseService.findMany({
    where: { status: { not: 'TERMINATED' } },
    select: { port: true },
  });
  const usedPorts = new Set(usedDbs.map((d) => d.port));

  for (let port = min; port <= max; port++) {
    if (!usedPorts.has(port)) {
      return port;
    }
  }
  throw new Error('No available NodePort in allocated database port range (30500-32000)');
}

/**
 * Helper to parse resource limits from a plan's specs JSON or string
 */
export function parseDatabasePlanLimits(planSpecsJson?: string | null): {
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  shared?: boolean;
} {
  const fallback = { cpuShares: 0.5, memoryMb: 1024, storageGb: 10, shared: true };
  if (!planSpecsJson) return fallback;

  try {
    const parsed = typeof planSpecsJson === 'string' ? JSON.parse(planSpecsJson) : planSpecsJson;
    const shared = parsed.shared !== undefined ? Boolean(parsed.shared) : undefined;
    let cpuShares = 0.5;
    if (parsed.cpu) {
      const cpuStr = String(parsed.cpu).trim();
      const milliMatch = cpuStr.match(/(\d+)\s*m(?:illi)?\b/i);
      const vcpuMatch = cpuStr.match(/([\d.]+)\s*(?:v?cpu|cores?)/i);

      if (milliMatch) {
        cpuShares = parseInt(milliMatch[1], 10) / 1000;
      } else if (vcpuMatch) {
        cpuShares = parseFloat(vcpuMatch[1]);
      } else {
        const val = parseFloat(cpuStr.replace(/[^0-9.]/g, ''));
        cpuShares = isNaN(val) ? 0.5 : val;
      }
    }

    let memoryMb = 1024;
    if (parsed.ram) {
      const ramStr = String(parsed.ram).toLowerCase();
      if (ramStr.includes('gb')) {
        memoryMb = (parseFloat(ramStr.replace(/[^0-9.]/g, '')) || 1) * 1024;
      } else {
        memoryMb = parseInt(ramStr.replace(/[^0-9]/g, ''), 10) || 1024;
      }
    }

    let storageGb = 10;
    if (parsed.storage || parsed.disk) {
      const stStr = String(parsed.storage || parsed.disk).toLowerCase();
      storageGb = parseInt(stStr.replace(/[^0-9]/g, ''), 10) || 10;
    }

    return { cpuShares, memoryMb, storageGb, shared };
  } catch {
    return fallback;
  }
}

/**
 * Generate Kubernetes YAML manifest for MySQL, MariaDB, PostgreSQL, or MongoDB
 */
export function generateDatabaseManifest(db: DatabaseServiceRecord): string {
  const typeUpper = db.type.toUpperCase();
  const ns = db.k8sNamespace || 'managed-db';
  const name = `db-${db.id}`;
  const svcName = `svc-${name}`;
  const pvcName = `data-${name}`;
  const secretName = `secret-${name}`;

  const cpuMillicores = Math.max(250, Math.round((db.cpuShares || 0.5) * 1000));
  const reqCpu = Math.max(100, Math.round(cpuMillicores * 0.4));
  const memMb = db.memoryMb || 1024;
  const reqMem = Math.max(256, Math.round(memMb * 0.5));

  let image = 'mysql:8.0';
  let containerPort = 3306;
  let mountPath = '/var/lib/mysql';
  let envYaml = '';

  const passwordBase64 = Buffer.from(db.password || 'SecretDbPass123!').toString('base64');
  const rootPasswordBase64 = Buffer.from(db.rootPassword || 'RootSecret123!').toString('base64');

  if (typeUpper === 'MYSQL') {
    const version = db.version || '8.0';
    image = `mysql:${version}`;
    containerPort = 3306;
    mountPath = '/var/lib/mysql';
    envYaml = `
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: root-password
        - name: MYSQL_DATABASE
          value: "${db.dbName}"
        - name: MYSQL_USER
          value: "${db.username}"
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
`;
  } else if (typeUpper === 'MARIADB') {
    const version = db.version || '10.11';
    image = `mariadb:${version}`;
    containerPort = 3306;
    mountPath = '/var/lib/mysql';
    envYaml = `
        - name: MARIADB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: root-password
        - name: MARIADB_DATABASE
          value: "${db.dbName}"
        - name: MARIADB_USER
          value: "${db.username}"
        - name: MARIADB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
`;
  } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
    const version = db.version || '16';
    image = `postgres:${version}`;
    containerPort = 5432;
    mountPath = '/var/lib/postgresql/data';
    envYaml = `
        - name: POSTGRES_DB
          value: "${db.dbName}"
        - name: POSTGRES_USER
          value: "${db.username}"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
`;
  } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
    const version = db.version || '7.0';
    image = `mongo:${version}`;
    containerPort = 27017;
    mountPath = '/data/db';
    envYaml = `
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "${db.username}"
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
        - name: MONGO_INITDB_DATABASE
          value: "${db.dbName}"
`;
  }

  const isMongo = typeUpper === 'MONGODB' || typeUpper === 'MONGO';
  const mongoExpressContainer = isMongo
    ? `
      - name: mongo-express
        image: mongo-express:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8081
          name: web-gui
        env:
        - name: ME_CONFIG_MONGODB_SERVER
          value: "127.0.0.1"
        - name: ME_CONFIG_MONGODB_PORT
          value: "27017"
        - name: ME_CONFIG_MONGODB_ENABLE_ADMIN
          value: "true"
        - name: ME_CONFIG_MONGODB_AUTH_DATABASE
          value: "admin"
        - name: ME_CONFIG_MONGODB_AUTH_USERNAME
          value: "${db.username}"
        - name: ME_CONFIG_MONGODB_AUTH_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
        - name: ME_CONFIG_BASICAUTH
          value: "true"
        - name: ME_CONFIG_BASICAUTH_USERNAME
          value: "${db.username}"
        - name: ME_CONFIG_BASICAUTH_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
        - name: ME_CONFIG_SITE_COOKIESECRET
          value: "masdika-cookie-${db.id}"
        - name: ME_CONFIG_SITE_SESSIONSECRET
          value: "masdika-session-${db.id}"
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 250m
            memory: 256Mi`
    : '';

  const mongoExpressServicePort = isMongo
    ? `
  - name: web-gui
    port: 8081
    targetPort: 8081`
    : '';

  const mongoExpressIngress = isMongo
    ? `---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: traefik
  tls:
  - hosts:
    - ${name}-mongo.db.masdika.id
    secretName: tls-${name}-mongo
  rules:
  - host: ${name}-mongo.db.masdika.id
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${svcName}
            port:
              number: 8081
`
    : '';

  return `apiVersion: v1
kind: Secret
metadata:
  name: ${secretName}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
type: Opaque
data:
  password: ${passwordBase64}
  root-password: ${rootPasswordBase64}
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${pvcName}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: ${db.storageGb}Gi
  storageClassName: local-path
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
    db-type: ${typeUpper.toLowerCase()}
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
        db-type: ${typeUpper.toLowerCase()}
      annotations:
        container.apparmor.security.beta.kubernetes.io/database: "unconfined"
    spec:
      securityContext:
        appArmorProfile:
          type: Unconfined
      containers:
      - name: database
        image: ${image}
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: ${containerPort}
          name: db-port
        env:
${envYaml}
        volumeMounts:
        - name: db-storage
          mountPath: ${mountPath}
        resources:
          requests:
            cpu: ${reqCpu}m
            memory: ${reqMem}Mi
          limits:
            cpu: ${cpuMillicores}m
            memory: ${memMb}Mi
        startupProbe:
          tcpSocket:
            port: ${containerPort}
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 30
        readinessProbe:
          tcpSocket:
            port: ${containerPort}
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
        livenessProbe:
          tcpSocket:
            port: ${containerPort}
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 5${mongoExpressContainer}
      volumes:
      - name: db-storage
        persistentVolumeClaim:
          claimName: ${pvcName}
---
apiVersion: v1
kind: Service
metadata:
  name: ${svcName}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
spec:
  type: NodePort
  selector:
    app: ${name}
  ports:
  - name: db-port
    port: ${containerPort}
    targetPort: ${containerPort}
    nodePort: ${db.port}${mongoExpressServicePort}
${mongoExpressIngress}`;
}

/**
 * Automatically synchronize isolated customer database credentials and server registration into pgAdmin
 */
export async function syncPgAdminUser(
  db: DatabaseServiceRecord,
  action: 'create' | 'delete' = 'create'
): Promise<void> {
  try {
    const kc = await getK8sKubeConfig();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const ns = 'managed-db';

    const podList = await coreApi.listNamespacedPod({
      namespace: ns,
      labelSelector: 'app=pgadmin',
    });
    const pgAdminPod = podList.items?.find((p) => p.status?.phase === 'Running');
    if (!pgAdminPod || !pgAdminPod.metadata?.name) return;

    const podName = pgAdminPod.metadata.name;
    const userEmail = `${db.username}@db.masdika.id`;

    if (action === 'create') {
      // 1. Add user into pgAdmin in Server Mode
      await execInPod(kc, ns, podName, 'pgadmin', [
        '/venv/bin/python3',
        '/pgadmin4/setup.py',
        'add-user',
        userEmail,
        db.password || 'Masdika123!',
      ]);

      // 2. Load dedicated server registration for this user
      const serverConfig = {
        Servers: {
          '1': {
            Name: `${db.name} (${db.dbName})`,
            Group: 'Managed Databases',
            Port: 5432,
            Username: db.username,
            Host: `svc-db-${db.id}`,
            SSLMode: 'prefer',
            MaintenanceDB: db.dbName,
          },
        },
      };

      const b64 = Buffer.from(JSON.stringify(serverConfig)).toString('base64');
      const loadCmd = `echo "${b64}" | base64 -d > /tmp/srv_${db.id}.json && /venv/bin/python3 /pgadmin4/setup.py load-servers --user "${userEmail}" /tmp/srv_${db.id}.json; rm -f /tmp/srv_${db.id}.json`;
      await execInPod(kc, ns, podName, 'pgadmin', ['sh', '-c', loadCmd]);
    } else {
      // Clean up user from pgAdmin
      await execInPod(kc, ns, podName, 'pgadmin', [
        '/venv/bin/python3',
        '/pgadmin4/setup.py',
        'delete-user',
        userEmail,
      ]);
    }
  } catch (err) {
    console.error('[pgAdmin Sync Error]', err);
  }
}

/**
 * Deploy a database instance onto Kubernetes using the native Kubernetes API
 */
export async function deployDatabase(db: DatabaseServiceRecord): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const ns = db.k8sNamespace || 'managed-db';
    await ensureNamespace(kc, ns);

    const manifestYaml = generateDatabaseManifest(db);
    await applyKubernetesManifests(kc, manifestYaml);

    const typeUpper = db.type.toUpperCase();
    if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
      syncPgAdminUser(db, 'create').catch((e) => console.error('[pgAdmin Auto-Provision Failed]', e));
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Kubernetes API deployment failed' };
  }
}

/**
 * Stop database by scaling deployment to 0 replicas via Kubernetes API
 */
export async function stopDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
    await objApi.patch({
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `db-${id}`,
        namespace: ns,
      },
      spec: {
        replicas: 0,
      },
    });
    return { success: true };
  } catch (err: any) {
    const msg = err?.response?.body?.message || err?.body?.message || err?.message || 'Scale down failed';
    return { success: false, error: msg };
  }
}

/**
 * Start database by scaling deployment to 1 replica via Kubernetes API
 */
export async function startDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
    await objApi.patch({
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `db-${id}`,
        namespace: ns,
      },
      spec: {
        replicas: 1,
      },
    });
    return { success: true };
  } catch (err: any) {
    const msg = err?.response?.body?.message || err?.body?.message || err?.message || 'Scale up failed';
    return { success: false, error: msg };
  }
}

/**
 * Restart database by triggering rolling restart via Kubernetes API
 */
export async function restartDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);
    await objApi.patch({
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `db-${id}`,
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
    return { success: true };
  } catch (err: any) {
    const msg = err?.response?.body?.message || err?.body?.message || err?.message || 'Rollout restart failed';
    return { success: false, error: msg };
  }
}

/**
 * Permanently delete database deployment, service, secret, and PVC via Kubernetes API
 */
export async function deleteDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const appsApi = kc.makeApiClient(k8s.AppsV1Api);
    const networkingApi = kc.makeApiClient(k8s.NetworkingV1Api);

    try {
      const dbRecord = await prisma.databaseService.findUnique({ where: { id } });
      if (dbRecord && (dbRecord.type.toUpperCase().includes('POSTGRES'))) {
        await syncPgAdminUser(dbRecord, 'delete').catch(() => {});
      }
    } catch {}

    await Promise.allSettled([
      appsApi.deleteNamespacedDeployment({ name: `db-${id}`, namespace: ns }),
      coreApi.deleteNamespacedService({ name: `svc-db-${id}`, namespace: ns }),
      coreApi.deleteNamespacedSecret({ name: `secret-db-${id}`, namespace: ns }),
      coreApi.deleteNamespacedPersistentVolumeClaim({ name: `data-db-${id}`, namespace: ns }),
      networkingApi.deleteNamespacedIngress({ name: `ingress-db-${id}`, namespace: ns }),
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete database resources' };
  }
}

/**
 * Get live status and metrics of a database instance via Kubernetes API
 */
export async function getDatabaseStatus(
  id: number,
  ns = 'managed-db'
): Promise<{
  status: 'RUNNING' | 'STOPPED' | 'PENDING' | 'ERROR';
  podName?: string;
  ready: boolean;
  cpu: string;
  memory: string;
  restarts: number;
  uptime?: string;
}> {
  try {
    const kc = await getK8sKubeConfig();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);

    const podList = await coreApi.listNamespacedPod({
      namespace: ns,
      labelSelector: `app=db-${id}`,
    });

    const pod = podList.items?.[0];
    if (!pod) {
      return { status: 'STOPPED', ready: false, cpu: '0m', memory: '0Mi', restarts: 0 };
    }

    const podName = pod.metadata?.name;
    const phase = pod.status?.phase;
    const containerStatus = pod.status?.containerStatuses?.[0];
    const ready = containerStatus?.ready ?? false;
    const restarts = containerStatus?.restartCount ?? 0;
    const uptime = pod.metadata?.creationTimestamp ? new Date(pod.metadata.creationTimestamp).toISOString() : undefined;

    const container = pod.spec?.containers?.[0];
    const cpuLimit = container?.resources?.limits?.cpu || '500m';
    const memoryLimit = container?.resources?.limits?.memory || '1024Mi';

    let status: 'RUNNING' | 'STOPPED' | 'PENDING' | 'ERROR' = 'PENDING';
    if (phase === 'Running' && ready) status = 'RUNNING';
    else if (phase === 'Running' && !ready) status = 'PENDING';
    else if (phase === 'Failed') status = 'ERROR';
    else if (phase === 'Succeeded' || !podName) status = 'STOPPED';

    return {
      status,
      podName,
      ready,
      cpu: cpuLimit,
      memory: memoryLimit,
      restarts,
      uptime,
    };
  } catch {
    return { status: 'ERROR', ready: false, cpu: '0m', memory: '0Mi', restarts: 0 };
  }
}

/**
 * Run database dump (mysqldump / pg_dump / mongodump) inside the pod via native K8s Exec
 */
export async function exportDatabaseDump(
  db: DatabaseServiceRecord
): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const ns = db.k8sNamespace || 'managed-db';

    const podList = await coreApi.listNamespacedPod({
      namespace: ns,
      labelSelector: `app=db-${db.id}`,
    });

    const pod = podList.items?.[0];
    if (!pod || pod.status?.phase !== 'Running') {
      return { success: false, error: 'Database pod is not running' };
    }

    const podName = pod.metadata?.name;
    if (!podName) {
      return { success: false, error: 'Pod name not found' };
    }
    const typeUpper = db.type.toUpperCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    let command: string[] = [];
    let filename = `${db.name}-${timestamp}.sql`;

    if (typeUpper === 'MYSQL' || typeUpper === 'MARIADB') {
      filename = `${db.dbName}-${timestamp}.sql`;
      command = ['mysqldump', `-u${db.username}`, `-p${db.password}`, db.dbName];
    } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
      filename = `${db.dbName}-${timestamp}.sql`;
      command = ['sh', '-c', `PGPASSWORD="${db.password}" pg_dump -h 127.0.0.1 -U "${db.username}" -d "${db.dbName}"`];
    } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
      filename = `${db.dbName}-${timestamp}.json`;
      command = [
        'mongodump',
        `--username=${db.username}`,
        `--password=${db.password}`,
        '--authenticationDatabase=admin',
        `--db=${db.dbName}`,
        '--archive',
      ];
    } else {
      return { success: false, error: `Unsupported database engine for dump: ${db.type}` };
    }

    const res = await execInPod(kc, ns, podName, 'database', command);
    if (!res.success && !res.stdout) {
      return { success: false, error: res.error || res.stderr || 'Database dump failed' };
    }

    return {
      success: true,
      data: res.stdout,
      filename,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to export database' };
  }
}

/**
 * Run database import (.sql or .json) inside the pod by staging file into container /tmp
 */
export async function importDatabaseDump(
  db: DatabaseServiceRecord,
  fileContent: Buffer | string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const ns = db.k8sNamespace || 'managed-db';

    const podList = await coreApi.listNamespacedPod({
      namespace: ns,
      labelSelector: `app=db-${db.id}`,
    });

    const pod = podList.items?.[0];
    if (!pod || pod.status?.phase !== 'Running') {
      return { success: false, error: 'Database pod is not running' };
    }

    const podName = pod.metadata?.name;
    if (!podName) {
      return { success: false, error: 'Pod name not found' };
    }
    const typeUpper = db.type.toUpperCase();

    // Stage dump file into container /tmp via in-memory tar stream to avoid host disk race condition & stdin pipe termination
    const dumpFileName = `import_${Date.now()}_dump`;
    const pack = tarStream.pack();
    const chunks: Buffer[] = [];
    pack.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    const tarPromise = new Promise<Buffer>((resolve, reject) => {
      pack.on('end', () => resolve(Buffer.concat(chunks)));
      pack.on('error', reject);
    });

    const rawBuf = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, 'utf-8');
    pack.entry({ name: dumpFileName, mode: 0o644 }, rawBuf);
    pack.finalize();

    const tarBuffer = await tarPromise;

    // Upload & extract tar archive inside container /tmp
    const stageRes = await execInPod(kc, ns, podName, 'database', ['tar', 'xf', '-', '-C', '/tmp'], tarBuffer);
    if (!stageRes.success) {
      return {
        success: false,
        error: stageRes.error || stageRes.stderr || 'Failed to stage database dump into container',
      };
    }

    const remoteFile = `/tmp/${dumpFileName}`;
    let execCmd = '';

    if (typeUpper === 'MYSQL' || typeUpper === 'MARIADB') {
      execCmd = `mysql -u"${db.username}" -p"${db.password}" "${db.dbName}" < "${remoteFile}"; STATUS=$?; rm -f "${remoteFile}"; exit $STATUS`;
    } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
      execCmd = `PGPASSWORD="${db.password}" psql -h 127.0.0.1 -U "${db.username}" -d "${db.dbName}" -f "${remoteFile}"; STATUS=$?; rm -f "${remoteFile}"; exit $STATUS`;
    } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
      execCmd = `mongorestore --username="${db.username}" --password="${db.password}" --authenticationDatabase=admin --db="${db.dbName}" --archive="${remoteFile}" || mongoimport --username="${db.username}" --password="${db.password}" --authenticationDatabase=admin --db="${db.dbName}" --file="${remoteFile}"; STATUS=$?; rm -f "${remoteFile}"; exit $STATUS`;
    } else {
      return { success: false, error: `Unsupported database engine for import: ${db.type}` };
    }

    const res = await execInPod(kc, ns, podName, 'database', ['sh', '-c', execCmd]);
    if (!res.success) {
      return { success: false, error: res.error || res.stderr || 'Database import execution failed' };
    }

    return {
      success: true,
      message: 'Database import completed successfully.',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to import database' };
  }
}

/**
 * Helper to build standard connection parameters & code snippets
 */
export function buildConnectionDetails(db: DatabaseServiceRecord, clusterConfig?: Partial<K8sClusterConfig>) {
  const host = clusterConfig?.publicDomain || cachedClusterConfig?.publicDomain || MANAGED_DB_PUBLIC_DOMAIN;
  const directIp = clusterConfig?.publicIp || cachedClusterConfig?.publicIp || MANAGED_DB_PUBLIC_IP;
  const pmaBase = clusterConfig?.pmaUrl || cachedClusterConfig?.pmaUrl || MANAGED_DB_PMA_URL;
  const pgadminBase = clusterConfig?.pgadminUrl || cachedClusterConfig?.pgadminUrl || MANAGED_DB_PGADMIN_URL;
  const mongoBase = clusterConfig?.mongoUrl || cachedClusterConfig?.mongoUrl || MANAGED_DB_MONGO_URL;

  const port = db.port;
  const typeUpper = db.type.toUpperCase();

  let pmaUrl: string | null = null;
  let pgAdminUrl: string | null = null;
  let mongoUrl: string | null = null;
  let connectionUri = '';
  let laravelEnv = '';

  if (typeUpper === 'MYSQL' || typeUpper === 'MARIADB') {
    pmaUrl = pmaBase ? `${pmaBase}/?pma_servername=${encodeURIComponent((host || directIp) + ':' + port)}&pma_username=${encodeURIComponent(db.username)}` : null;
    connectionUri = `mysql://${db.username}:${db.password}@${host}:${port}/${db.dbName}`;
    laravelEnv = `DB_CONNECTION=mysql\nDB_HOST=${host}\nDB_PORT=${port}\nDB_DATABASE=${db.dbName}\nDB_USERNAME=${db.username}\nDB_PASSWORD=${db.password}`;
  } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
    pgAdminUrl = pgadminBase || null;
    connectionUri = `postgresql://${db.username}:${db.password}@${host}:${port}/${db.dbName}?sslmode=prefer`;
    laravelEnv = `DB_CONNECTION=pgsql\nDB_HOST=${host}\nDB_PORT=${port}\nDB_DATABASE=${db.dbName}\nDB_USERNAME=${db.username}\nDB_PASSWORD=${db.password}`;
  } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
    mongoUrl = `https://db-${db.id}-mongo.db.masdika.id`;
    connectionUri = `mongodb://${db.username}:${db.password}@${host}:${port}/${db.dbName}?authSource=admin`;
    laravelEnv = `DB_CONNECTION=mongodb\nDB_URI=${connectionUri}`;
  }

  return {
    host,
    directIp,
    port,
    dbName: db.dbName,
    username: db.username,
    password: db.password,
    connectionUri,
    uri: connectionUri,
    laravelEnv,
    pmaUrl,
    pgAdminUrl,
    pgadminUrl: pgAdminUrl,
    mongoUrl,
    mongoExpressUrl: mongoUrl,
  };
}

/**
 * Test connectivity directly to the Kubernetes API Server (CoreV1Api.listNode)
 */
export async function testK8sClusterConnection(customConfig?: {
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

    // If missing from request, read from DB settings
    if (!kubeconfig && !serviceToken && !apiServer) {
      const activeConfig = await getK8sClusterConfig();
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
          name: 'k3s-cluster',
          server: apiServer.trim(),
          skipTLSVerify: skipTls,
        },
        {
          name: 'k3s-user',
          token: serviceToken.trim(),
        }
      );
    } else {
      const activeConfig = await getK8sClusterConfig();
      if (activeConfig.kubeconfig) {
        kc.loadFromString(activeConfig.kubeconfig);
        if (activeConfig.apiServer) {
          const cluster = kc.getCurrentCluster();
          if (cluster) {
            (cluster as any).server = activeConfig.apiServer;
            if (activeConfig.skipTlsVerify) (cluster as any).skipTLSVerify = true;
          }
        }
      } else if (activeConfig.serviceToken && activeConfig.apiServer) {
        kc.loadFromClusterAndUser(
          {
            name: 'k3s-cluster',
            server: activeConfig.apiServer,
            skipTLSVerify: activeConfig.skipTlsVerify,
          },
          {
            name: 'k3s-user',
            token: activeConfig.serviceToken,
          }
        );
      } else {
        return {
          success: false,
          message: 'No Kubeconfig YAML or API Server configuration provided.',
          latencyMs: Date.now() - startTime,
        };
      }
    }

    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const nodesRes = await coreApi.listNode();
    const latencyMs = Date.now() - startTime;

    const items = nodesRes.items || [];
    const nodeSummaries = items.map((node) => {
      const name = node.metadata?.name || 'unknown';
      const version = node.status?.nodeInfo?.kubeletVersion || 'v1.x';
      const os = `${node.status?.nodeInfo?.operatingSystem || 'linux'}/${node.status?.nodeInfo?.architecture || 'amd64'}`;
      const isReady = node.status?.conditions?.some((c) => c.type === 'Ready' && c.status === 'True');
      return `${name} (${version}, ${isReady ? 'Ready' : 'NotReady'}, ${os})`;
    });

    return {
      success: true,
      message: `Successfully connected to Kubernetes API! Found ${items.length} node(s).`,
      nodes: nodeSummaries,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Kubernetes API',
      latencyMs: Date.now() - startTime,
    };
  }
}
