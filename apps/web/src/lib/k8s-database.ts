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
 * Safely escape an argument for POSIX shell (sh / bash) execution.
 * Wraps in single quotes and safely escapes internal single quotes to prevent command & shell injection.
 */
export function escapeShellArg(arg: string | number | undefined | null): string {
  if (arg === undefined || arg === null) return "''";
  const str = String(arg);
  return "'" + str.replace(/'/g, "'\\''") + "'";
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
): Promise<{ stdout: string; stdoutBuffer?: Buffer; stderr: string; success: boolean; error?: string }> {
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
        } catch { }
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
          const stdoutBuffer = Buffer.concat(stdoutChunks);
          const stdout = stdoutBuffer.toString('utf-8');
          const stderr = Buffer.concat(stderrChunks).toString('utf-8');
          const isSuccess = !statusResult || statusResult.status === 'Success';
          const errorMsg = !isSuccess
            ? (stderr?.trim() ? stderr.trim() : statusResult?.message || 'Command execution failed')
            : undefined;
          resolve({
            stdout,
            stdoutBuffer,
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
    const planLower = ((db.planName || '') + ' ' + (db.version || '')).toLowerCase();
    const isPostgisTarget = planLower.includes('postgis') || planLower.includes('gis');
    const isVectorTarget = planLower.includes('vector') || planLower.includes('pgvector');

    if (isPostgisTarget && isVectorTarget) {
      image = 'postgres:16-postgis-pgvector';
    } else if (isPostgisTarget) {
      image = 'postgis/postgis:16-3.4';
    } else if (isVectorTarget) {
      image = 'pgvector/pgvector:pg16';
    } else if (version === '17' || version.startsWith('17.')) {
      image = 'postgres:17.12';
    } else if (version === '16' || version.startsWith('16.')) {
      image = 'postgres:16.16';
    } else if (version === '15' || version.startsWith('15.')) {
      image = 'postgres:15.20';
    } else {
      image = `postgres:${version}`;
    }
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
  } else if (typeUpper === 'REDIS') {
    const version = db.version || '7.2';
    image = `redis:${version}-alpine`;
    containerPort = 6379;
    mountPath = '/data';
    envYaml = `
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
`;
  }

  const isMysqlLike = typeUpper === 'MYSQL' || typeUpper === 'MARIADB';
  const isMongo = typeUpper === 'MONGODB' || typeUpper === 'MONGO';
  const isRedis = typeUpper === 'REDIS';
  const isPostgres = typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL';
  const planCheck = ((db.planName || '') + ' ' + (db.version || '')).toLowerCase();
  const isPostgis = isPostgres && (planCheck.includes('postgis') || planCheck.includes('gis'));
  const isVector = isPostgres && (planCheck.includes('vector') || planCheck.includes('pgvector'));
  const isPgVariant = isPostgres && (isPostgis || isVector);

  // MySQL / MariaDB: grant full privileges to tenant user (single-tenant Pod, safe)
  const rootPwEnv = typeUpper === 'MARIADB' ? 'MARIADB_ROOT_PASSWORD' : 'MYSQL_ROOT_PASSWORD';
  const mysqlInitConfigMap = isMysqlLike
    ? `---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cm-db-init-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
data:
  01-grant-admin.sql: |
    GRANT ALL PRIVILEGES ON *.* TO '${db.username}'@'%' WITH GRANT OPTION;
    FLUSH PRIVILEGES;
`
    : '';

  const mysqlInitVolumeMount = isMysqlLike
    ? `
        - name: db-init-sql
          mountPath: /docker-entrypoint-initdb.d/01-grant-admin.sql
          subPath: 01-grant-admin.sql`
    : '';

  const mysqlInitVolume = isMysqlLike
    ? `
      - name: db-init-sql
        configMap:
          name: cm-db-init-${name}`
    : '';

  const redisCommand = isRedis ? `
        command:
        - redis-server
        - --requirepass
        - $(REDIS_PASSWORD)
        - --appendonly
        - "yes"
        - --dir
        - /data` : '';

  const mongoConfigMap = isMongo
    ? `---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cm-mongo-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
data:
  config.js: |
    module.exports = {
      mongodb: {
        whitelist: ['${db.dbName}']
      }
    };
`
    : '';

  const pgInitConfigMap = isPgVariant
    ? `---
apiVersion: v1
kind: ConfigMap
metadata:
  name: cm-pg-init-${name}
  namespace: ${ns}
  labels:
    app: ${name}
    managed-by: masdika-cloud
data:
  01-init-extensions.sql: |
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
${isPostgis ? '    CREATE EXTENSION IF NOT EXISTS postgis;\n    CREATE EXTENSION IF NOT EXISTS postgis_topology;\n' : ''}${isVector ? '    CREATE EXTENSION IF NOT EXISTS vector;\n' : ''}`
    : '';

  const mongoExpressContainer = isMongo
    ? `
      - name: mongo-express
        image: mongo-express:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8081
          name: web-gui
        env:
        - name: ME_CONFIG_MONGODB_URL
          value: "mongodb://127.0.0.1:27017"
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
        volumeMounts:
        - name: mongo-config
          mountPath: /app/config.js
          subPath: config.js
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 250m
            memory: 256Mi`
    : '';

  const redisCommanderContainer = isRedis
    ? `
      - name: redis-commander
        image: rediscommander/redis-commander:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8081
          name: web-gui
        env:
        - name: PORT
          value: "8081"
        - name: REDIS_HOST
          value: "127.0.0.1"
        - name: REDIS_PORT
          value: "6379"
        - name: REDIS_LABEL
          value: "${name}"
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
        - name: HTTP_USER
          value: "${db.username}"
        - name: HTTP_PASSWORD
          valueFrom:
            secretKeyRef:
              name: ${secretName}
              key: password
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 250m
            memory: 256Mi`
    : '';

  const webGuiContainer = isMongo ? mongoExpressContainer : isRedis ? redisCommanderContainer : '';

  const webGuiServicePort = (isMongo || isRedis)
    ? `
  - name: web-gui
    port: 8081
    targetPort: 8081`
    : '';

  const webGuiHost = isMongo ? `${name}-mongo.db.masdika.id` : isRedis ? `${name}-redis.db.masdika.id` : '';
  const webGuiTlsSecret = isMongo ? `tls-${name}-mongo` : isRedis ? `tls-${name}-redis` : '';

  const webGuiIngress = (isMongo || isRedis) && webGuiHost
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
    - ${webGuiHost}
    secretName: ${webGuiTlsSecret}
  rules:
  - host: ${webGuiHost}
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
${mongoConfigMap}${pgInitConfigMap}${mysqlInitConfigMap}---
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
${envYaml}${redisCommand}
        volumeMounts:
        - name: db-storage
          mountPath: ${mountPath}${isPgVariant ? `
        - name: pg-init-sql
          mountPath: /docker-entrypoint-initdb.d/01-init-extensions.sql
          subPath: 01-init-extensions.sql` : ''}${mysqlInitVolumeMount}
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
          timeoutSeconds: 5${webGuiContainer}
      volumes:
      - name: db-storage
        persistentVolumeClaim:
          claimName: ${pvcName}${isMongo ? `
      - name: mongo-config
        configMap:
          name: cm-mongo-${name}` : ''}${isPgVariant ? `
      - name: pg-init-sql
        configMap:
          name: cm-pg-init-${name}` : ''}${mysqlInitVolume}
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
    nodePort: ${db.port}${webGuiServicePort}
${webGuiIngress}`;
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

      const safeId = parseInt(String(db.id), 10);
      const b64 = Buffer.from(JSON.stringify(serverConfig)).toString('base64');
      const loadCmd = `echo ${escapeShellArg(b64)} | base64 -d > /tmp/srv_${safeId}.json && /venv/bin/python3 /pgadmin4/setup.py load-servers --user ${escapeShellArg(userEmail)} /tmp/srv_${safeId}.json; rm -f /tmp/srv_${safeId}.json`;
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
 * Ensure MongoDB initial collection is registered so it immediately shows up in Mongo Express & disk
 */
export async function initMongoDatabase(db: DatabaseServiceRecord): Promise<void> {
  try {
    const kc = await getK8sKubeConfig();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const ns = db.k8sNamespace || 'managed-db';
    const podLabel = `app=db-${db.id}`;

    let podName = '';
    for (let i = 0; i < 15; i++) {
      const podList = await coreApi.listNamespacedPod({
        namespace: ns,
        labelSelector: podLabel,
      });
      const p = podList.items?.find((item) => item.status?.phase === 'Running');
      if (p?.metadata?.name) {
        podName = p.metadata.name;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!podName) return;

    const cmd = `mongosh -u ${escapeShellArg(db.username)} -p ${escapeShellArg(db.password)} --authenticationDatabase admin --eval "db.getSiblingDB('${escapeShellArg(db.dbName)}').createCollection('_init')"`;
    await execInPod(kc, ns, podName, 'database', ['sh', '-c', cmd]);
  } catch (err) {
    console.error('[initMongoDatabase Error]', err);
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
    } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
      initMongoDatabase(db).catch((e) => console.error('[Mongo Auto-Init Failed]', e));
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
 * Scale database compute resources (vCPU, RAM) and/or expand storage (PVC).
 * Zero data loss guaranteed:
 * 1. Persistent storage PVC is dynamically expanded if new storage is larger.
 * 2. Deployment container requests and limits are patched.
 * 3. Rolling rollout restart reattaches the same PVC to the upgraded pod.
 */
export async function scaleDatabase(
  db: { id: number; storageGb?: number; status?: string },
  newCpuShares: number,
  newMemoryMb: number,
  newStorageGb: number,
  ns = 'managed-db'
): Promise<{ success: boolean; error?: string }> {
  try {
    const kc = await getK8sKubeConfig();
    const objApi = k8s.KubernetesObjectApi.makeApiClient(kc);

    const name = `db-${db.id}`;
    const pvcName = `data-${name}`;

    const cpuMillicores = Math.max(250, Math.round(newCpuShares * 1000));
    const reqCpu = Math.max(100, Math.round(cpuMillicores * 0.4));
    const memMb = newMemoryMb;
    const reqMem = Math.max(256, Math.round(memMb * 0.5));

    // 1. Expand PVC storage if new storage is larger than current
    const currentStorage = db.storageGb || 1;
    if (newStorageGb > currentStorage) {
      try {
        await objApi.patch({
          apiVersion: 'v1',
          kind: 'PersistentVolumeClaim',
          metadata: {
            name: pvcName,
            namespace: ns,
          },
          spec: {
            resources: {
              requests: {
                storage: `${newStorageGb}Gi`,
              },
            },
          },
        });
      } catch (pvcErr: any) {
        console.warn(`[ManagedDB] PVC resize patch warning for ${pvcName}:`, pvcErr?.message);
      }
    }

    // 2. Patch Deployment container resources
    const isStopped = db.status === 'STOPPED';

    const patchSpec: any = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name,
        namespace: ns,
      },
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: 'database',
                resources: {
                  requests: {
                    cpu: `${reqCpu}m`,
                    memory: `${reqMem}Mi`,
                  },
                  limits: {
                    cpu: `${cpuMillicores}m`,
                    memory: `${memMb}Mi`,
                  },
                },
              },
            ],
          },
        },
      },
    };

    if (!isStopped) {
      patchSpec.spec.template.metadata = {
        annotations: {
          'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
        },
      };
    }

    await objApi.patch(patchSpec);

    return { success: true };
  } catch (err: any) {
    const msg = err?.response?.body?.message || err?.body?.message || err?.message || 'Scaling database failed';
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
        await syncPgAdminUser(dbRecord, 'delete').catch(() => { });
      }
    } catch { }

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
    const containerStatuses = pod.status?.containerStatuses || [];
    const ready = containerStatuses.length > 0 && containerStatuses.every((c) => Boolean(c.ready));
    const restarts = containerStatuses.reduce((acc, c) => acc + (c.restartCount || 0), 0);
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
): Promise<{ success: boolean; data?: Buffer; filename?: string; contentType?: string; error?: string }> {
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
    const safeDbName = (db.dbName || 'db').replace(/[^a-zA-Z0-9_-]/g, '');
    let filename = `${safeDbName}-${timestamp}.sql`;
    let contentType = 'application/sql';

    if (typeUpper === 'MYSQL' || typeUpper === 'MARIADB') {
      filename = `${safeDbName}-${timestamp}.sql`;
      command = ['mysqldump', `-u${db.username}`, `-p${db.password}`, db.dbName];
    } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
      filename = `${safeDbName}-${timestamp}.sql`;
      command = ['sh', '-c', `PGPASSWORD=${escapeShellArg(db.password)} pg_dump -h 127.0.0.1 -U ${escapeShellArg(db.username)} -d ${escapeShellArg(db.dbName)}`];
    } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
      // Binary BSON archive (restorable with `mongorestore --archive=<file>`)
      filename = `${safeDbName}-${timestamp}.archive`;
      contentType = 'application/octet-stream';
      command = [
        'mongodump',
        `--username=${db.username}`,
        `--password=${db.password}`,
        '--authenticationDatabase=admin',
        `--db=${db.dbName}`,
        '--archive',
        '--quiet',
      ];
    } else if (typeUpper === 'REDIS') {
      // Point-in-time RDB snapshot streamed from the live server (no downtime)
      filename = `redis-${db.id}-${timestamp}.rdb`;
      contentType = 'application/octet-stream';
      const tmp = `/tmp/export_${Date.now()}.rdb`;
      command = [
        'sh',
        '-c',
        `redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --rdb ${tmp} >/dev/null 2>&1 && cat ${tmp}; STATUS=$?; rm -f ${tmp}; exit $STATUS`,
      ];
    } else {
      return { success: false, error: `Unsupported database engine for dump: ${db.type}` };
    }

    const res = await execInPod(kc, ns, podName, 'database', command);
    const data = res.stdoutBuffer ?? Buffer.from(res.stdout || '', 'utf-8');
    if (!res.success && data.length === 0) {
      return { success: false, error: res.error || res.stderr || 'Database dump failed' };
    }
    if (typeUpper === 'REDIS' && data.subarray(0, 5).toString('ascii') !== 'REDIS') {
      return { success: false, error: res.stderr?.trim() || 'Failed to create Redis RDB snapshot' };
    }

    return {
      success: true,
      data,
      filename,
      contentType,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to export database' };
  }
}

/**
 * Restore a Redis RDB snapshot.
 *
 * Instances run with `appendonly yes` (Redis 7 multi-part AOF), so Redis ignores dump.rdb on boot.
 * The validated RDB is therefore installed as the AOF *base* file, then Redis is restarted
 * (SHUTDOWN NOSAVE -> kubelet restarts the container) and health-checked with PING.
 * The previous AOF directory is kept until the new data set is confirmed online, then removed.
 */
async function restoreRedisSnapshot(
  kc: k8s.KubeConfig,
  ns: string,
  podName: string,
  db: DatabaseServiceRecord,
  remoteFile: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const f = escapeShellArg(remoteFile);
  const cli = 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning';

  // 1. Validate snapshot compatibility with this Redis version (rejects corrupt / newer RDB formats)
  const check = await execInPod(kc, ns, podName, 'database', [
    'sh',
    '-c',
    `OUT=$(redis-check-rdb ${f} 2>&1); STATUS=$?; if [ $STATUS -ne 0 ]; then rm -f ${f}; echo "$OUT" | tail -5 >&2; fi; exit $STATUS`,
  ]);
  if (!check.success) {
    const detail = (check.stderr || check.error || '').trim();
    return {
      success: false,
      error: `The RDB snapshot is invalid or was created by a newer Redis version than this instance (${db.version || '7.x'}).${detail ? ' ' + detail.split('\n').pop() : ''}`,
    };
  }

  // 2. Install snapshot as the new AOF base (atomic directory swap) and restart Redis without saving
  const swap = await execInPod(kc, ns, podName, 'database', [
    'sh',
    '-c',
    [
      'set -e',
      'rm -rf /data/.restore /data/appendonlydir.prev',
      'mkdir -p /data/.restore',
      `cp ${f} /data/.restore/appendonly.aof.1.base.rdb`,
      ': > /data/.restore/appendonly.aof.1.incr.aof',
      `printf 'file appendonly.aof.1.base.rdb seq 1 type b\\nfile appendonly.aof.1.incr.aof seq 1 type i\\n' > /data/.restore/appendonly.aof.manifest`,
      `cp ${f} /data/dump.rdb`,
      `rm -f ${f}`,
      'if [ -d /data/appendonlydir ]; then mv /data/appendonlydir /data/appendonlydir.prev; fi',
      'mv /data/.restore /data/appendonlydir',
    ].join(' && '),
  ]);
  if (!swap.success) {
    return { success: false, error: swap.stderr?.trim() || swap.error || 'Failed to stage Redis snapshot (storage full?)' };
  }

  // Container exits on SHUTDOWN, so the exec stream is expected to drop here
  await execInPod(kc, ns, podName, 'database', ['sh', '-c', `${cli} SHUTDOWN NOSAVE || true`]).catch(() => null);

  // 3. Wait for Redis to come back with the restored data set
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const pods = await coreApi.listNamespacedPod({ namespace: ns, labelSelector: `app=db-${db.id}` });
      const p = pods.items?.find((it) => it.status?.phase === 'Running');
      const name = p?.metadata?.name;
      if (!name) continue;
      const ping = await execInPod(kc, ns, name, 'database', [
        'sh',
        '-c',
        `${cli} PING && ${cli} DBSIZE && rm -rf /data/appendonlydir.prev`,
      ]);
      const lines = ping.stdout.trim().split('\n');
      if (ping.success && lines[0]?.trim() === 'PONG') {
        const keys = parseInt(lines[1] || '0', 10);
        return {
          success: true,
          message: `Redis snapshot restored successfully (${isNaN(keys) ? 0 : keys} keys in db0). Instance restarted with the restored data.`,
        };
      }
    } catch {
      // container still restarting
    }
  }

  return {
    success: false,
    error: 'Snapshot was installed but Redis did not come back online within 90 seconds. Please check the instance status or contact support.',
  };
}

/**
 * Run database import (.sql or .json) inside the pod by staging file into container /tmp
 */
export async function importDatabaseDump(
  db: DatabaseServiceRecord,
  fileContent: Buffer | string,
  originalFileName?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const typeUpper = db.type.toUpperCase();
    const rawBuf = Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent, 'utf-8');

    // Detect uploaded format from magic bytes (never trust the extension alone)
    const isGzip = rawBuf.length > 2 && rawBuf[0] === 0x1f && rawBuf[1] === 0x8b;
    const isMongoArchive = rawBuf.length > 4 && rawBuf.readUInt32LE(0) === 0x8199e26d;
    const isRedisRdb = rawBuf.subarray(0, 5).toString('ascii') === 'REDIS';
    const firstChar = rawBuf.subarray(0, 512).toString('utf-8').trimStart().charAt(0);
    const isJson = firstChar === '[' || firstChar === '{';

    if (typeUpper === 'REDIS' && !isRedisRdb) {
      return { success: false, error: 'Invalid Redis snapshot. Please upload a valid .rdb file (e.g. created with BGSAVE or redis-cli --rdb).' };
    }
    if ((typeUpper === 'MONGODB' || typeUpper === 'MONGO') && !isMongoArchive && !isGzip && !isJson) {
      return { success: false, error: 'Unsupported MongoDB file. Upload a mongodump archive (.archive / .archive.gz) or a JSON export (.json).' };
    }

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

    // Stage dump file into container /tmp via in-memory tar stream to avoid host disk race condition & stdin pipe termination
    const dumpFileName = `import_${Date.now()}_dump`;
    const pack = tarStream.pack();
    const chunks: Buffer[] = [];
    pack.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    const tarPromise = new Promise<Buffer>((resolve, reject) => {
      pack.on('end', () => resolve(Buffer.concat(chunks)));
      pack.on('error', reject);
    });

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
      // Sanitize dump: strip DEFINER clauses and comment out SET @@SESSION.SQL_LOG_BIN / SET @@GLOBAL.GTID_PURGED
      // that require SUPER / SET_USER_ID privileges the tenant user does not have.
      // Then import as root (available inside the isolated single-tenant pod) for maximum compatibility.
      const f = escapeShellArg(remoteFile);
      const rootPwEnv = typeUpper === 'MARIADB' ? 'MARIADB_ROOT_PASSWORD' : 'MYSQL_ROOT_PASSWORD';
      execCmd = [
        `sed -i -E`,
        `  -e 's|/\\*!50013 DEFINER=[^\\"]*\\*/||g'`,
        `  -e 's|/\\*!50017 DEFINER=[^\\"]*\\*/||g'`,
        `  -e 's|DEFINER[ ]*=[ ]*\`[^\`]*\`@\`[^\`]*\`||g'`,
        `  -e 's|^SET @@SESSION\\.SQL_LOG_BIN.*|-- &|'`,
        `  -e 's|^SET @@GLOBAL\\.GTID_PURGED.*|-- &|'`,
        `  ${f}`,
        `&& mysql --max_allowed_packet=512M --default-character-set=utf8mb4 --force -uroot -p"$${rootPwEnv}" ${escapeShellArg(db.dbName)} < ${f}`,
        `; STATUS=$?; rm -f ${f}; exit $STATUS`,
      ].join(' ');
    } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
      execCmd = `PGPASSWORD=${escapeShellArg(db.password)} psql -h 127.0.0.1 -U ${escapeShellArg(db.username)} -d ${escapeShellArg(db.dbName)} -f ${escapeShellArg(remoteFile)}; STATUS=$?; rm -f ${escapeShellArg(remoteFile)}; exit $STATUS`;
    } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
      const auth = `--username=${escapeShellArg(db.username)} --password=${escapeShellArg(db.password)} --authenticationDatabase=admin`;
      const f = escapeShellArg(remoteFile);
      if (isMongoArchive || isGzip) {
        // mongodump archive (optionally gzipped). Remap any source DB name into this instance's database.
        execCmd = `mongorestore ${auth} ${isGzip ? '--gzip ' : ''}--archive=${f} --drop --nsExclude='admin.*' --nsExclude='config.*' --nsExclude='local.*' --nsFrom='$db$.$coll$' --nsTo=${escapeShellArg(`${db.dbName}.$coll$`)} 2>&1; STATUS=$?; rm -f ${f}; exit $STATUS`;
      } else {
        // JSON export -> one collection named after the uploaded file
        const baseName = (originalFileName || 'imported').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'imported';
        execCmd = `mongoimport ${auth} --db=${escapeShellArg(db.dbName)} --collection=${escapeShellArg(baseName)} ${firstChar === '[' ? '--jsonArray ' : ''}--file=${f} 2>&1; STATUS=$?; rm -f ${f}; exit $STATUS`;
      }
    } else if (typeUpper === 'REDIS') {
      return await restoreRedisSnapshot(kc, ns, podName, db, remoteFile);
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
  let redisUrl: string | null = null;
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
  } else if (typeUpper === 'REDIS') {
    redisUrl = `https://db-${db.id}-redis.db.masdika.id`;
    connectionUri = `redis://default:${encodeURIComponent(db.password ?? '')}@${host}:${port}`;
    laravelEnv = `REDIS_CLIENT=phpredis\nREDIS_HOST=${host}\nREDIS_PORT=${port}\nREDIS_PASSWORD=${db.password ?? ''}`;
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
    redisUrl,
    redisCommanderUrl: redisUrl,
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

/**
 * Parsers for Kubernetes resource units (Ki, Mi, Gi, Ti, m, vCPU)
 */
export function parseK8sMemoryToMb(memStr?: string | null): number {
  if (!memStr) return 0;
  const s = String(memStr).trim();
  if (s.endsWith('Ki')) {
    return Math.round(parseFloat(s.slice(0, -2)) / 1024);
  }
  if (s.endsWith('Mi')) {
    return Math.round(parseFloat(s.slice(0, -2)));
  }
  if (s.endsWith('Gi')) {
    return Math.round(parseFloat(s.slice(0, -2)) * 1024);
  }
  if (s.endsWith('Ti')) {
    return Math.round(parseFloat(s.slice(0, -2)) * 1024 * 1024);
  }
  const bytes = parseFloat(s);
  return !isNaN(bytes) ? Math.round(bytes / (1024 * 1024)) : 0;
}

export function parseK8sCpuToCores(cpuStr?: string | null): number {
  if (!cpuStr) return 0;
  const s = String(cpuStr).trim();
  if (s.endsWith('m')) {
    return parseFloat(s.slice(0, -1)) / 1000;
  }
  const cores = parseFloat(s);
  return !isNaN(cores) ? cores : 0;
}

export interface DatabaseClusterCapacity {
  available: boolean;
  status: 'HEALTHY' | 'NEAR_CAPACITY' | 'FULL' | 'OFFLINE';
  capacityPercent: number;
  activeInstances: number;
  maxInstances: number;
  allocatedCpu: number;
  totalCpu: number;
  cpuPercent: number;
  allocatedMemoryMb: number;
  totalMemoryMb: number;
  memoryPercent: number;
  availablePorts: number;
  totalPorts: number;
  reason?: string;
  userMessage?: string;
}

interface CachedNodeCapacity {
  timestamp: number;
  totalCpu: number;
  totalMemoryMb: number;
  maxPods: number;
  nodeCount: number;
  allNodesReady: boolean;
}

let cachedNodeCapacity: CachedNodeCapacity | null = null;

async function getNodeClusterCapacity(): Promise<{
  totalCpu: number;
  totalMemoryMb: number;
  maxPods: number;
  nodeCount: number;
  allNodesReady: boolean;
}> {
  const now = Date.now();
  if (cachedNodeCapacity && now - cachedNodeCapacity.timestamp < 60000) {
    return cachedNodeCapacity;
  }

  try {
    const kc = await getK8sKubeConfig();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);
    const nodesRes = await coreApi.listNode();
    const items = nodesRes.items || [];

    if (items.length === 0) {
      return { totalCpu: 4, totalMemoryMb: 8192, maxPods: 100, nodeCount: 0, allNodesReady: false };
    }

    let sumCpu = 0;
    let sumMemoryMb = 0;
    let sumPods = 0;
    let allReady = true;

    for (const node of items) {
      const isReady = node.status?.conditions?.some((c) => c.type === 'Ready' && c.status === 'True') ?? false;
      if (!isReady) allReady = false;

      const alloc = node.status?.allocatable || {};
      sumCpu += parseK8sCpuToCores(alloc.cpu);
      sumMemoryMb += parseK8sMemoryToMb(alloc.memory);
      sumPods += parseInt(alloc.pods || '110', 10) || 110;
    }

    cachedNodeCapacity = {
      timestamp: now,
      totalCpu: sumCpu > 0 ? parseFloat(sumCpu.toFixed(1)) : 4,
      totalMemoryMb: sumMemoryMb > 0 ? sumMemoryMb : 8192,
      maxPods: sumPods > 0 ? sumPods : 100,
      nodeCount: items.length,
      allNodesReady: allReady,
    };

    return cachedNodeCapacity;
  } catch (err) {
    console.warn('[ManagedDB] Failed to query K8s node capacity, using cached/default:', err);
    if (cachedNodeCapacity) return cachedNodeCapacity;
    return { totalCpu: 4, totalMemoryMb: 8192, maxPods: 100, nodeCount: 1, allNodesReady: true };
  }
}

/**
 * Pre-flight cluster resource and capacity validator.
 * Checks hardware allocatable CPU/RAM, active database instance counts, and NodePort availability.
 */
export async function checkDatabaseClusterCapacity(
  requestedCpu = 0,
  requestedRamMb = 0,
  _requestedDiskGb = 0
): Promise<DatabaseClusterCapacity> {
  // 1. Check Admin Settings overrides
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          'managed_db_capacity_full',
          'managed_db_maintenance_mode',
          'managed_db_max_instances',
          'managed_db_max_cpu',
          'managed_db_max_ram_gb',
        ],
      },
    },
  });

  const settingMap = new Map<string, string>();
  for (const s of settings) {
    settingMap.set(s.key, s.value);
  }

  const isManuallyFull = settingMap.get('managed_db_capacity_full') === 'true' || settingMap.get('managed_db_maintenance_mode') === 'true';

  // 2. Query Node hardware limits
  const nodeInfo = await getNodeClusterCapacity();

  // Admin overrides if specified
  const customMaxInstances = parseInt(settingMap.get('managed_db_max_instances') || '', 10);
  const customMaxCpu = parseFloat(settingMap.get('managed_db_max_cpu') || '');
  const customMaxRamGb = parseFloat(settingMap.get('managed_db_max_ram_gb') || '');

  const totalCpu = !isNaN(customMaxCpu) && customMaxCpu > 0 ? customMaxCpu : nodeInfo.totalCpu;
  const totalMemoryMb = !isNaN(customMaxRamGb) && customMaxRamGb > 0 ? customMaxRamGb * 1024 : nodeInfo.totalMemoryMb;
  const maxInstances = !isNaN(customMaxInstances) && customMaxInstances > 0 ? customMaxInstances : Math.max(10, nodeInfo.maxPods - 15);

  // 3. Query active databases from database
  const activeDatabases = await prisma.databaseService.findMany({
    where: { status: { not: 'TERMINATED' } },
    select: { id: true, port: true, cpuShares: true, memoryMb: true, storageGb: true },
  });

  const activeInstances = activeDatabases.length;
  const allocatedCpu = parseFloat(activeDatabases.reduce((sum, d) => sum + (d.cpuShares || 0), 0).toFixed(1));
  const allocatedMemoryMb = activeDatabases.reduce((sum, d) => sum + (d.memoryMb || 0), 0);
  const usedPorts = new Set(activeDatabases.map((d) => d.port));
  const totalPorts = 1501; // range 30500 - 32000
  const availablePorts = Math.max(0, totalPorts - usedPorts.size);

  const cpuPercent = totalCpu > 0 ? Math.min(100, Math.round((allocatedCpu / totalCpu) * 100)) : 100;
  const memoryPercent = totalMemoryMb > 0 ? Math.min(100, Math.round((allocatedMemoryMb / totalMemoryMb) * 100)) : 100;
  const instancePercent = maxInstances > 0 ? Math.min(100, Math.round((activeInstances / maxInstances) * 100)) : 100;

  const capacityPercent = Math.max(cpuPercent, memoryPercent, instancePercent);

  // 4. Evaluate status & conditions
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
      availablePorts,
      totalPorts,
      reason: 'Database provisioning paused by administrator',
      userMessage: 'The Managed Database cluster is temporarily undergoing maintenance or capacity expansion. New database deployments are temporarily paused.',
    };
  }

  if (nodeInfo.nodeCount > 0 && !nodeInfo.allNodesReady) {
    return {
      available: false,
      status: 'OFFLINE',
      capacityPercent: 100,
      activeInstances,
      maxInstances,
      allocatedCpu,
      totalCpu,
      cpuPercent,
      allocatedMemoryMb,
      totalMemoryMb,
      memoryPercent,
      availablePorts,
      totalPorts,
      reason: 'Kubernetes cluster nodes are not ready',
      userMessage: 'The database cluster nodes are currently undergoing maintenance. Please try again in a few moments.',
    };
  }

  if (availablePorts <= 0) {
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
      availablePorts: 0,
      totalPorts,
      reason: 'No available NodePorts in cluster port pool',
      userMessage: 'The database cluster has exhausted all available public network ports (30500-32000). Please contact support.',
    };
  }

  // Check requested specs
  if (requestedCpu > 0 && (allocatedCpu + requestedCpu) > totalCpu * 0.95) {
    return {
      available: false,
      status: 'FULL',
      capacityPercent,
      activeInstances,
      maxInstances,
      allocatedCpu,
      totalCpu,
      cpuPercent,
      allocatedMemoryMb,
      totalMemoryMb,
      memoryPercent,
      availablePorts,
      totalPorts,
      reason: `Requested ${requestedCpu} vCPU exceeds available cluster CPU capacity (${(totalCpu - allocatedCpu).toFixed(1)} vCPU free)`,
      userMessage: 'The Managed Database cluster cannot accommodate the requested compute resources. Please select a smaller flavor or try again later.',
    };
  }

  if (requestedRamMb > 0 && (allocatedMemoryMb + requestedRamMb) > totalMemoryMb * 0.92) {
    return {
      available: false,
      status: 'FULL',
      capacityPercent,
      activeInstances,
      maxInstances,
      allocatedCpu,
      totalCpu,
      cpuPercent,
      allocatedMemoryMb,
      totalMemoryMb,
      memoryPercent,
      availablePorts,
      totalPorts,
      reason: `Requested ${requestedRamMb} MB RAM exceeds available cluster memory capacity (${Math.max(0, totalMemoryMb - allocatedMemoryMb)} MB free)`,
      userMessage: 'The Managed Database cluster cannot accommodate the requested RAM memory. Please select a smaller tier or try again later.',
    };
  }

  if (activeInstances >= maxInstances) {
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
      availablePorts,
      totalPorts,
      reason: 'Maximum concurrent database instances limit reached',
      userMessage: 'The database cluster has reached its maximum concurrent instance capacity. New deployments are temporarily paused.',
    };
  }

  if (capacityPercent >= 92) {
    return {
      available: false,
      status: 'FULL',
      capacityPercent,
      activeInstances,
      maxInstances,
      allocatedCpu,
      totalCpu,
      cpuPercent,
      allocatedMemoryMb,
      totalMemoryMb,
      memoryPercent,
      availablePorts,
      totalPorts,
      reason: 'Cluster is at 92%+ capacity',
      userMessage: 'The Managed Database cluster is currently at maximum capacity. New deployments are temporarily paused while additional cluster nodes are provisioned.',
    };
  }

  if (capacityPercent >= 80) {
    return {
      available: true,
      status: 'NEAR_CAPACITY',
      capacityPercent,
      activeInstances,
      maxInstances,
      allocatedCpu,
      totalCpu,
      cpuPercent,
      allocatedMemoryMb,
      totalMemoryMb,
      memoryPercent,
      availablePorts,
      totalPorts,
      userMessage: `Cluster resource utilization is currently high (${capacityPercent}% allocated). Limited deployment slots remaining.`,
    };
  }

  return {
    available: true,
    status: 'HEALTHY',
    capacityPercent,
    activeInstances,
    maxInstances,
    allocatedCpu,
    totalCpu,
    cpuPercent,
    allocatedMemoryMb,
    totalMemoryMb,
    memoryPercent,
    availablePorts,
    totalPorts,
    userMessage: 'Cluster healthy and ready for deployment.',
  };
}
