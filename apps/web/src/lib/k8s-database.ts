import { Client } from 'ssh2';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';

export interface DatabaseServiceRecord {
  id: number;
  userId: number;
  name: string;
  type: string;
  version: string;
  planName: string;
  region: string;
  node: string;
  host: string;
  port: number;
  dbName: string;
  username: string;
  password: string;
  rootPassword?: string | null;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  status: string;
  k8sNamespace?: string | null;
}

export interface K8sClusterConfig {
  host: string;
  port: number;
  username: string;
  password: string;
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
 * Dynamically retrieve K3s cluster credentials from Database Settings (`Setting` table).
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
          'managed_db_k3s_host',
          'managed_db_k3s_port',
          'managed_db_k3s_user',
          'managed_db_k3s_password',
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

  const host = settingMap.get('managed_db_k3s_host') || process.env.MANAGED_DB_HOST || '';
  const port = parseInt(settingMap.get('managed_db_k3s_port') || process.env.MANAGED_DB_SSH_PORT || '22', 10);
  const username = settingMap.get('managed_db_k3s_user') || process.env.MANAGED_DB_SSH_USER || '';

  const rawPw = settingMap.get('managed_db_k3s_password') || process.env.MANAGED_DB_SSH_PASSWORD || '';
  const password = rawPw.startsWith('enc:') ? (decryptDeterministic(rawPw) || rawPw) : rawPw;

  const publicDomain = settingMap.get('managed_db_public_domain') || process.env.MANAGED_DB_PUBLIC_DOMAIN || '';
  const publicIp = settingMap.get('managed_db_public_ip') || process.env.MANAGED_DB_PUBLIC_IP || '';
  const pmaUrl = settingMap.get('managed_db_pma_url') || process.env.MANAGED_DB_PMA_URL || '';
  const pgadminUrl = settingMap.get('managed_db_pgadmin_url') || process.env.MANAGED_DB_PGADMIN_URL || '';
  const mongoUrl = settingMap.get('managed_db_mongo_url') || process.env.MANAGED_DB_MONGO_URL || '';

  if (!host || !username) {
    throw new Error('K3s cluster SSH credentials not configured in DB settings or environment variables.');
  }

  cachedClusterConfig = {
    host,
    port,
    username,
    password,
    publicDomain,
    publicIp,
    pmaUrl,
    pgadminUrl,
    mongoUrl,
  };
  clusterConfigExpiry = now + 60000;

  return cachedClusterConfig;
}

export const MANAGED_DB_PUBLIC_DOMAIN = process.env.MANAGED_DB_PUBLIC_DOMAIN || '';
export const MANAGED_DB_PUBLIC_IP = process.env.MANAGED_DB_PUBLIC_IP || '';
export const MANAGED_DB_PMA_URL = process.env.MANAGED_DB_PMA_URL || '';
export const MANAGED_DB_PGADMIN_URL = process.env.MANAGED_DB_PGADMIN_URL || '';
export const MANAGED_DB_MONGO_URL = process.env.MANAGED_DB_MONGO_URL || '';

/**
 * Execute command on K3s node via SSH with promise
 */
export async function execSsh(cmd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const config = await getK8sClusterConfig();

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err: any, stream: any) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let stdout = '';
        let stderr = '';
        stream.on('data', (d: Buffer) => (stdout += d.toString()));
        stream.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
        stream.on('close', (code: number) => {
          conn.end();
          resolve({ stdout, stderr, code: code ?? 0 });
        });
      });
    });
    conn.on('error', (err: any) => {
      reject(err);
    });
    conn.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 15000,
    });
  });
}

/**
 * Execute command on K3s node via SSH with stdin stream (for SQL import / restore)
 */
export async function execSshWithStdin(
  cmd: string,
  stdinData: Buffer | string
): Promise<{ stdout: string; stderr: string; code: number }> {
  const config = await getK8sClusterConfig();

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err: any, stream: any) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        let stdout = '';
        let stderr = '';
        stream.on('data', (d: Buffer) => (stdout += d.toString()));
        stream.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
        stream.on('close', (code: number) => {
          conn.end();
          resolve({ stdout, stderr, code: code ?? 0 });
        });
        stream.write(stdinData);
        stream.end();
      });
    });
    conn.on('error', (err: any) => {
      reject(err);
    });
    conn.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 30000,
    });
  });
}

/**
 * Allocate next available NodePort between 30001 and 32767
 */
export async function allocateAvailablePort(): Promise<number> {
  const START_PORT = 30001;
  const END_PORT = 32767;

  // Reserved ports used by system or tools
  const reservedPorts = new Set([30005]);

  const existingDbs = await prisma.databaseService.findMany({
    select: { port: true },
    where: { status: { not: 'TERMINATED' } },
  });

  for (const db of existingDbs) {
    reservedPorts.add(db.port);
  }

  for (let port = START_PORT; port <= END_PORT; port++) {
    if (!reservedPorts.has(port)) {
      return port;
    }
  }

  throw new Error('All database ports in range 30001-32767 are occupied');
}

/**
 * Parse CPU, RAM, Storage, and Tier from plan limits (JSON or string).
 * Allows admin to create ANY custom plan, and K8s will automatically adapt.
 */
export function parseDatabasePlanLimits(limitsRaw: string | object | null | undefined): {
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  shared: boolean;
  region: string;
} {
  let limits: any = {};
  if (typeof limitsRaw === 'string') {
    try {
      limits = JSON.parse(limitsRaw);
    } catch {
      limits = {};
    }
  } else if (limitsRaw && typeof limitsRaw === 'object') {
    limits = limitsRaw;
  }

  const isShared = limits.shared !== false && !limits.tier?.toUpperCase?.().includes('DEDICATED');

  // Parse CPU (e.g. "500m", "500m CPU", "0.5 vCPU", "1 vCPU", "2", 4)
  let cpuShares = isShared ? 0.5 : 1.0;
  if (typeof limits.cpuShares === 'number') {
    cpuShares = limits.cpuShares >= 50 ? limits.cpuShares / 1000 : limits.cpuShares;
  } else if (typeof limits.cpu === 'string') {
    const str = limits.cpu.trim();
    const milliMatch = str.match(/^([\d.]+)\s*m/i);
    if (milliMatch) {
      cpuShares = parseFloat(milliMatch[1]) / 1000;
    } else {
      const match = str.match(/([\d.]+)/);
      if (match) {
        const val = parseFloat(match[1]);
        cpuShares = val >= 50 ? val / 1000 : val;
      }
    }
  } else if (typeof limits.cpu === 'number') {
    cpuShares = limits.cpu >= 50 ? limits.cpu / 1000 : limits.cpu;
  }

  // Parse RAM (e.g. "512 MB", "1 GB", "2 GB", "500 MB", 1024)
  let memoryMb = 1024;
  if (typeof limits.memoryMb === 'number') {
    memoryMb = limits.memoryMb;
  } else if (typeof limits.ram === 'string') {
    const match = limits.ram.match(/([\d.]+)\s*(GB|MB)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || (val <= 16 ? 'GB' : 'MB')).toUpperCase();
      memoryMb = unit === 'MB' ? Math.round(val) : Math.round(val * 1024);
    }
  } else if (typeof limits.ram === 'number') {
    memoryMb = limits.ram <= 16 ? limits.ram * 1024 : limits.ram;
  }

  // Parse Storage (e.g. "10 GB", "60", 60)
  let storageGb = 10;
  if (typeof limits.storageGb === 'number') {
    storageGb = limits.storageGb;
  } else if (typeof limits.storage === 'string') {
    const match = limits.storage.match(/([\d.]+)/);
    if (match) storageGb = Math.round(parseFloat(match[1]));
  } else if (typeof limits.storage === 'number') {
    storageGb = limits.storage;
  }

  const shared = limits.shared !== false && !limits.tier?.toUpperCase().includes('DEDICATED');
  const region = limits.region || 'Sidoarjo';

  return {
    cpuShares: Math.max(0.25, cpuShares),
    memoryMb: Math.max(256, memoryMb),
    storageGb: Math.max(5, storageGb),
    shared,
    region,
  };
}

/**
 * Generate Kubernetes YAML for a database instance
 */
export function generateDatabaseManifest(db: DatabaseServiceRecord): string {
  const ns = db.k8sNamespace || 'managed-db';
  const name = `db-${db.id}`;
  const svcName = `svc-db-${db.id}`;
  const pvcName = `data-db-${db.id}`;

  const isDedicated = db.cpuShares >= 1.0 || (db.planName && db.planName.toLowerCase().includes('dedi'));
  const cpuMillicores = Math.round(db.cpuShares * 1000);
  const memMb = db.memoryMb;
  const reqCpu = isDedicated ? Math.max(250, Math.round(cpuMillicores * 0.75)) : Math.max(50, Math.round(cpuMillicores * 0.2));
  const reqMem = isDedicated ? Math.max(256, Math.round(memMb * 0.75)) : Math.max(128, Math.round(memMb * 0.25));

  let containerPort = 3306;
  let image = 'mysql:8.0';
  let envList: { name: string; value: string }[] = [];
  let mountPath = '/var/lib/mysql';

  const typeUpper = db.type.toUpperCase();

  if (typeUpper === 'MYSQL') {
    containerPort = 3306;
    image = db.version ? `mysql:${db.version}` : 'mysql:8.0';
    mountPath = '/var/lib/mysql';
    envList = [
      { name: 'MYSQL_ROOT_PASSWORD', value: db.rootPassword || db.password },
      { name: 'MYSQL_DATABASE', value: db.dbName },
      { name: 'MYSQL_USER', value: db.username },
      { name: 'MYSQL_PASSWORD', value: db.password },
    ];
  } else if (typeUpper === 'MARIADB') {
    containerPort = 3306;
    image = db.version ? `mariadb:${db.version}` : 'mariadb:10.11';
    mountPath = '/var/lib/mysql';
    envList = [
      { name: 'MARIADB_ROOT_PASSWORD', value: db.rootPassword || db.password },
      { name: 'MARIADB_DATABASE', value: db.dbName },
      { name: 'MARIADB_USER', value: db.username },
      { name: 'MARIADB_PASSWORD', value: db.password },
    ];
  } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
    containerPort = 5432;
    image = db.version ? `postgres:${db.version}-alpine` : 'postgres:16-alpine';
    mountPath = '/var/lib/postgresql/data';
    envList = [
      { name: 'POSTGRES_DB', value: db.dbName },
      { name: 'POSTGRES_USER', value: db.username },
      { name: 'POSTGRES_PASSWORD', value: db.password },
      { name: 'PGDATA', value: '/var/lib/postgresql/data/pgdata' },
    ];
  } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
    containerPort = 27017;
    image = db.version ? `mongo:${db.version}` : 'mongo:7.0';
    mountPath = '/data/db';
    envList = [
      { name: 'MONGO_INITDB_ROOT_USERNAME', value: db.username },
      { name: 'MONGO_INITDB_ROOT_PASSWORD', value: db.password },
      { name: 'MONGO_INITDB_DATABASE', value: db.dbName },
    ];
  }

  const envYaml = envList
    .map((e) => `        - name: ${e.name}\n          value: "${e.value.replace(/"/g, '\\"')}"`)
    .join('\n');

  return `
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
    spec:
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
        readinessProbe:
          tcpSocket:
            port: ${containerPort}
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
        livenessProbe:
          tcpSocket:
            port: ${containerPort}
          initialDelaySeconds: 30
          periodSeconds: 20
          timeoutSeconds: 5
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
    nodePort: ${db.port}
`;
}

/**
 * Deploy a database instance onto K3s
 */
export async function deployDatabase(db: DatabaseServiceRecord): Promise<{ success: boolean; error?: string }> {
  try {
    const yaml = generateDatabaseManifest(db);
    const remotePath = `/tmp/db-${db.id}.yaml`;

    const applyCmd = `
      cat << 'EOF' > ${remotePath}
${yaml}
EOF
      kubectl apply -f ${remotePath}
      rm -f ${remotePath}
    `;

    const res = await execSsh(applyCmd);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || res.stdout || 'Failed to apply K8s manifest' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'SSH communication error' };
  }
}

/**
 * Stop database by scaling deployment to 0 replicas
 */
export async function stopDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await execSsh(`kubectl scale deployment db-${id} -n ${ns} --replicas=0`);
    if (res.code !== 0) return { success: false, error: res.stderr || 'Scale down failed' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Start database by scaling deployment to 1 replica
 */
export async function startDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await execSsh(`kubectl scale deployment db-${id} -n ${ns} --replicas=1`);
    if (res.code !== 0) return { success: false, error: res.stderr || 'Scale up failed' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Restart database by rollout restart
 */
export async function restartDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await execSsh(`kubectl rollout restart deployment db-${id} -n ${ns}`);
    if (res.code !== 0) return { success: false, error: res.stderr || 'Restart failed' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Permanently delete database deployment, service, and PVC
 */
export async function deleteDatabase(id: number, ns = 'managed-db'): Promise<{ success: boolean; error?: string }> {
  try {
    const cmd = `kubectl delete deployment db-${id} service svc-db-${id} pvc data-db-${id} -n ${ns} --ignore-not-found=true`;
    const res = await execSsh(cmd);
    return { success: res.code === 0, error: res.code !== 0 ? res.stderr : undefined };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Get live status and metrics of a database instance
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
    const podRes = await execSsh(
      `kubectl get pods -l app=db-${id} -n ${ns} -o jsonpath='{range .items[*]}{.metadata.name}{"|"}{.status.phase}{"|"}{.status.containerStatuses[0].ready}{"|"}{.status.containerStatuses[0].restartCount}{"|"}{.metadata.creationTimestamp}{"\\n"}{end}'`
    );

    const line = podRes.stdout.trim().split('\n')[0];
    if (!line) {
      return { status: 'STOPPED', ready: false, cpu: '0m', memory: '0Mi', restarts: 0 };
    }

    const [podName, phase, readyStr, restartsStr, creationTimestamp] = line.split('|');
    const ready = readyStr === 'true';

    // Get live metrics from metrics-server
    let cpu = '0m';
    let memory = '0Mi';
    try {
      const topRes = await execSsh(`kubectl top pod ${podName} -n ${ns} --no-headers 2>/dev/null`);
      if (topRes.code === 0 && topRes.stdout.trim()) {
        const parts = topRes.stdout.trim().split(/\s+/);
        if (parts.length >= 3) {
          cpu = parts[1];
          memory = parts[2];
        }
      }
    } catch {
      // Ignore metrics error
    }

    let status: 'RUNNING' | 'STOPPED' | 'PENDING' | 'ERROR' = 'PENDING';
    if (phase === 'Running' && ready) status = 'RUNNING';
    else if (phase === 'Running' && !ready) status = 'PENDING';
    else if (phase === 'Failed') status = 'ERROR';
    else if (!podName) status = 'STOPPED';

    return {
      status,
      podName,
      ready,
      cpu,
      memory,
      restarts: parseInt(restartsStr || '0', 10),
      uptime: creationTimestamp,
    };
  } catch (err) {
    return { status: 'ERROR', ready: false, cpu: '0m', memory: '0Mi', restarts: 0 };
  }
}

/**
 * Run database dump (mysqldump / pg_dump / mongodump) inside the pod
 */
export async function exportDatabaseDump(
  db: DatabaseServiceRecord
): Promise<{ success: boolean; data?: string; filename?: string; error?: string }> {
  try {
    const ns = db.k8sNamespace || 'managed-db';
    const typeUpper = db.type.toUpperCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    let cmd = '';
    let filename = `${db.name}-${timestamp}.sql`;

    if (typeUpper === 'MYSQL' || typeUpper === 'MARIADB') {
      filename = `${db.dbName}-${timestamp}.sql`;
      const passEscaped = (db.password || '').replace(/"/g, '\\"');
      cmd = `kubectl exec -n ${ns} deployment/db-${db.id} -- mysqldump -u"${db.username}" -p"${passEscaped}" "${db.dbName}"`;
    } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
      filename = `${db.dbName}-${timestamp}.sql`;
      cmd = `kubectl exec -n ${ns} deployment/db-${db.id} -- pg_dump -U "${db.username}" -d "${db.dbName}"`;
    } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
      filename = `${db.dbName}-${timestamp}.json`;
      cmd = `kubectl exec -n ${ns} deployment/db-${db.id} -- mongoexport --username "${db.username}" --password "${db.password}" --authenticationDatabase admin --db "${db.dbName}"`;
    } else {
      return { success: false, error: `Unsupported database engine for dump: ${db.type}` };
    }

    const res = await execSsh(cmd);
    if (res.code !== 0 && !res.stdout) {
      return { success: false, error: res.stderr || 'Database dump failed' };
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
 * Run database import (.sql or .json) inside the pod via SSH stdin
 */
export async function importDatabaseDump(
  db: DatabaseServiceRecord,
  fileContent: Buffer | string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const ns = db.k8sNamespace || 'managed-db';
    const typeUpper = db.type.toUpperCase();

    let cmd = '';

    if (typeUpper === 'MYSQL' || typeUpper === 'MARIADB') {
      const passEscaped = (db.password || '').replace(/"/g, '\\"');
      cmd = `kubectl exec -i -n ${ns} deployment/db-${db.id} -- mysql -u"${db.username}" -p"${passEscaped}" "${db.dbName}"`;
    } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
      cmd = `kubectl exec -i -n ${ns} deployment/db-${db.id} -- psql -U "${db.username}" -d "${db.dbName}"`;
    } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
      cmd = `kubectl exec -i -n ${ns} deployment/db-${db.id} -- mongoimport --username "${db.username}" --password "${db.password}" --authenticationDatabase admin --db "${db.dbName}"`;
    } else {
      return { success: false, error: `Unsupported database engine for import: ${db.type}` };
    }

    const res = await execSshWithStdin(cmd, fileContent);
    if (res.code !== 0) {
      return { success: false, error: res.stderr || 'Database import execution failed' };
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
  const clusterHost = clusterConfig?.host || cachedClusterConfig?.host || '127.0.0.1';

  const port = db.port;
  const typeUpper = db.type.toUpperCase();

  let pmaUrl: string | null = null;
  let pgAdminUrl: string | null = null;
  let mongoUrl: string | null = null;
  let connectionUri = '';
  let laravelEnv = '';

  if (typeUpper === 'MYSQL' || typeUpper === 'MARIADB') {
    pmaUrl = `${pmaBase}/?pma_servername=${encodeURIComponent(clusterHost)}&pma_port=${port}&pma_username=${encodeURIComponent(db.username)}`;
    connectionUri = `mysql://${db.username}:${db.password}@${host}:${port}/${db.dbName}`;
    laravelEnv = `DB_CONNECTION=mysql\nDB_HOST=${host}\nDB_PORT=${port}\nDB_DATABASE=${db.dbName}\nDB_USERNAME=${db.username}\nDB_PASSWORD=${db.password}`;
  } else if (typeUpper === 'POSTGRES' || typeUpper === 'POSTGRESQL') {
    pgAdminUrl = pgadminBase;
    connectionUri = `postgresql://${db.username}:${db.password}@${host}:${port}/${db.dbName}?sslmode=prefer`;
    laravelEnv = `DB_CONNECTION=pgsql\nDB_HOST=${host}\nDB_PORT=${port}\nDB_DATABASE=${db.dbName}\nDB_USERNAME=${db.username}\nDB_PASSWORD=${db.password}`;
  } else if (typeUpper === 'MONGODB' || typeUpper === 'MONGO') {
    mongoUrl = mongoBase;
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
 * Test SSH & Kubernetes connectivity to the K3s host
 */
export async function testK8sClusterConnection(customConfig?: {
  host?: string;
  port?: number | string;
  username?: string;
  password?: string;
}): Promise<{
  success: boolean;
  message: string;
  nodes?: string[];
  latencyMs?: number;
}> {
  const startTime = Date.now();
  try {
    let host = customConfig?.host;
    let port = typeof customConfig?.port === 'string' ? parseInt(customConfig.port, 10) : customConfig?.port;
    let username = customConfig?.username;
    let password = customConfig?.password;

    // If any config is missing or masked, resolve from DB settings
    if (!host || !username || !password || password === '••••••••') {
      const activeConfig = await getK8sClusterConfig();
      if (!host) host = activeConfig.host;
      if (!port) port = activeConfig.port;
      if (!username) username = activeConfig.username;
      if (!password || password === '••••••••') password = activeConfig.password;
    }

    if (!host || !username) {
      return { success: false, message: 'Host and SSH username are required.' };
    }

    const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
      const conn = new Client();
      const timeout = setTimeout(() => {
        conn.end();
        reject(new Error('Connection timed out after 10 seconds'));
      }, 10000);

      conn.on('ready', () => {
        conn.exec('k3s kubectl get nodes -o wide --no-headers', (err: any, stream: any) => {
          if (err) {
            clearTimeout(timeout);
            conn.end();
            return reject(err);
          }
          let out = '';
          let errStr = '';
          stream.on('data', (d: Buffer) => (out += d.toString()));
          stream.stderr.on('data', (d: Buffer) => (errStr += d.toString()));
          stream.on('close', (exitCode: number) => {
            clearTimeout(timeout);
            conn.end();
            resolve({ stdout: out, stderr: errStr, code: exitCode ?? 0 });
          });
        });
      });

      conn.on('error', (err: any) => {
        clearTimeout(timeout);
        reject(err);
      });

      conn.connect({
        host,
        port: port || 22,
        username,
        password: password || undefined,
        readyTimeout: 8000,
      });
    });

    const latencyMs = Date.now() - startTime;
    if (code !== 0) {
      return {
        success: false,
        message: `K3s kubectl command returned error code ${code}: ${stderr || stdout}`,
        latencyMs,
      };
    }

    const rawLines = stdout.trim().split('\n').filter(Boolean);
    return {
      success: true,
      message: `Successfully connected to K3s cluster! Found ${rawLines.length} node(s).`,
      nodes: rawLines,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to K3s cluster',
      latencyMs: Date.now() - startTime,
    };
  }
}

