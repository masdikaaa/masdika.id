import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { decryptDeterministic } from '@/lib/encryption';
import { getK8sKubeConfig, getK8sClusterConfig } from '@/lib/k8s-database';
import { getAppKubeConfig, getAppClusterConfig } from '@/lib/k8s-app';
import { getAppDefinition } from '@/lib/app-catalog';
import {
  collectK8sClusterMetrics,
  classifyK8sSeverity,
  K8sNamespaceSnapshot,
  K8sNodeLiveMetric,
  K8sPodLiveMetric,
} from '@/lib/k8s-metrics';

export const dynamic = 'force-dynamic';

export interface K8sResourceItem {
  id: number;
  kind: 'database' | 'app';
  name: string;
  subtitle: string;
  engineOrAppType: string;
  planName: string;
  namespace: string;
  podName: string;
  podIp: string;
  nodeName: string;
  endpoint: string;
  dbStatus: string;
  podPhase: string;
  isOnline: boolean;
  hasLiveMetrics: boolean;
  cpuMillicores: number;
  cpuLimitMillicores: number;
  cpuShares: number;
  cpuPercent: number;
  memBytes: number;
  maxMemBytes: number;
  memoryMb: number;
  memPercent: number;
  storageGb: number;
  restarts: number;
  oomKilled: boolean;
  terminationReason: string | null;
  waitingReason: string | null;
  uptime: number;
  severity: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'OFFLINE';
  suspendReason: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface K8sResourceSummary {
  totalCount: number;
  runningCount: number;
  criticalCount: number;
  warningCount: number;
  highCpuCount: number;
  highRamCount: number;
  restartAlertCount: number;
  totalRestarts: number;
  oomCount: number;
  allocatedCpu: number;
  allocatedMemBytes: number;
  allocatedStorageGb: number;
  usedCpuMillicores: number;
  usedMemBytes: number;
}

function decryptUserIdentity(user?: { id: number; name: string | null; email: string | null; image: string | null } | null) {
  let name = 'Customer';
  let email = 'customer@domain.com';

  if (user?.name) {
    try {
      name = decryptDeterministic(user.name) || user.name;
    } catch {
      name = user.name;
    }
  }
  if (user?.email) {
    try {
      email = decryptDeterministic(user.email) || user.email;
    } catch {
      email = user.email;
    }
  }

  return {
    id: user?.id || 0,
    name,
    email,
    image: user?.image || null,
  };
}

function buildResourceSummary(items: K8sResourceItem[]): K8sResourceSummary {
  return {
    totalCount: items.length,
    runningCount: items.filter((i) => i.isOnline).length,
    criticalCount: items.filter((i) => i.severity === 'CRITICAL').length,
    warningCount: items.filter((i) => i.severity === 'WARNING').length,
    highCpuCount: items.filter((i) => i.cpuPercent >= 60).length,
    highRamCount: items.filter((i) => i.memPercent >= 75).length,
    restartAlertCount: items.filter((i) => i.restarts > 0 || i.oomKilled).length,
    totalRestarts: items.reduce((sum, i) => sum + i.restarts, 0),
    oomCount: items.filter((i) => i.oomKilled).length,
    allocatedCpu: Number(items.reduce((sum, i) => sum + (i.cpuShares || 0), 0).toFixed(1)),
    allocatedMemBytes: items.reduce((sum, i) => sum + i.maxMemBytes, 0),
    allocatedStorageGb: items.reduce((sum, i) => sum + (i.storageGb || 0), 0),
    usedCpuMillicores: items.reduce((sum, i) => sum + i.cpuMillicores, 0),
    usedMemBytes: items.reduce((sum, i) => sum + i.memBytes, 0),
  };
}

function mapWorkloadToResourceItem(params: {
  id: number;
  kind: 'database' | 'app';
  name: string;
  subtitle: string;
  engineOrAppType: string;
  planName: string;
  namespace: string;
  nodeFallback: string;
  endpoint: string;
  dbStatus: string;
  cpuShares: number;
  cpuLimitMillicores: number;
  memoryMb: number;
  storageGb: number;
  suspendReason: string | null;
  createdAt: Date;
  user: ReturnType<typeof decryptUserIdentity>;
  pod?: K8sPodLiveMetric;
}): K8sResourceItem {
  const maxMemBytes = Math.max(128, params.memoryMb || 512) * 1024 * 1024;
  const cpuMillicores = params.pod?.cpuMillicores ?? 0;
  const memBytes = params.pod?.memBytes ?? 0;
  const cpuPercent =
    params.cpuLimitMillicores > 0
      ? Number(Math.min((cpuMillicores / params.cpuLimitMillicores) * 100, 999).toFixed(1))
      : 0;
  const memPercent =
    maxMemBytes > 0 ? Number(Math.min((memBytes / maxMemBytes) * 100, 999).toFixed(1)) : 0;

  const isOnline = params.pod ? params.pod.isRunning : params.dbStatus === 'RUNNING';
  const podPhase = params.pod
    ? params.pod.podPhase
    : params.dbStatus === 'SUSPENDED'
      ? 'Suspended'
      : params.dbStatus === 'STOPPED'
        ? 'Stopped'
        : params.dbStatus;
  const restarts = params.pod?.restarts ?? 0;
  const oomKilled = params.pod?.oomKilled ?? false;

  const severity = classifyK8sSeverity({
    dbStatus: params.dbStatus,
    isRunning: isOnline,
    podPhase,
    cpuPercent,
    memPercent,
    restarts,
    oomKilled,
  });

  return {
    id: params.id,
    kind: params.kind,
    name: params.name,
    subtitle: params.subtitle,
    engineOrAppType: params.engineOrAppType,
    planName: params.planName,
    namespace: params.namespace,
    podName: params.pod?.podName || '-',
    podIp: params.pod?.podIp || '-',
    nodeName: params.pod?.nodeName || params.nodeFallback || '-',
    endpoint: params.endpoint,
    dbStatus: params.dbStatus,
    podPhase,
    isOnline,
    hasLiveMetrics: Boolean(params.pod?.hasLiveMetrics),
    cpuMillicores,
    cpuLimitMillicores: params.cpuLimitMillicores,
    cpuShares: params.cpuShares,
    cpuPercent,
    memBytes,
    maxMemBytes,
    memoryMb: params.memoryMb,
    memPercent,
    storageGb: params.storageGb,
    restarts,
    oomKilled,
    terminationReason: params.pod?.terminationReason ?? null,
    waitingReason: params.pod?.waitingReason ?? null,
    uptime: params.pod?.uptimeSeconds ?? 0,
    severity,
    suspendReason: params.suspendReason,
    createdAt: params.createdAt.toISOString(),
    user: params.user,
  };
}

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [databases, apps, dbClusterConfig, appClusterConfig] = await Promise.all([
      prisma.databaseService.findMany({
        where: { status: { not: 'TERMINATED' } },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.appService.findMany({
        where: { status: { not: 'TERMINATED' } },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getK8sClusterConfig().catch(() => null),
      getAppClusterConfig().catch(() => null),
    ]);

    const [dbSnapResult, appSnapResult] = await Promise.allSettled([
      (async () => {
        const kc = await getK8sKubeConfig();
        return collectK8sClusterMetrics(kc, 'managed-db');
      })(),
      (async () => {
        const kc = await getAppKubeConfig();
        return collectK8sClusterMetrics(kc, 'managed-apps');
      })(),
    ]);

    const dbSnapshot: K8sNamespaceSnapshot | null =
      dbSnapResult.status === 'fulfilled' ? dbSnapResult.value : null;
    const appSnapshot: K8sNamespaceSnapshot | null =
      appSnapResult.status === 'fulfilled' ? appSnapResult.value : null;

    const dbClusterError =
      dbSnapResult.status === 'rejected'
        ? dbSnapResult.reason?.message || 'Managed Database Kubernetes cluster unavailable'
        : null;
    const appClusterError =
      appSnapResult.status === 'rejected'
        ? appSnapResult.reason?.message || 'Managed Apps Kubernetes cluster unavailable'
        : null;

    const dbDomain = dbClusterConfig?.publicDomain || 'db.masdika.id';
    const appDomain = appClusterConfig?.publicDomain || 'app.masdika.id';

    const dbItems: K8sResourceItem[] = databases.map((db) => {
      const appLabel = `db-${db.id}`;
      const pod = dbSnapshot?.podsByAppLabel.get(appLabel);
      const cpuLimitMillicores = Math.max(250, Math.round((db.cpuShares || 0.5) * 1000));
      return mapWorkloadToResourceItem({
        id: db.id,
        kind: 'database',
        name: db.name,
        subtitle: `${db.type.toUpperCase()} ${db.version}`,
        engineOrAppType: db.type.toUpperCase(),
        planName: db.planName || `${db.cpuShares}C / ${db.memoryMb}MB`,
        namespace: db.k8sNamespace || 'managed-db',
        nodeFallback: db.node || 'k3s-db',
        endpoint: `${db.host || dbDomain}:${db.port}`,
        dbStatus: db.status,
        cpuShares: db.cpuShares,
        cpuLimitMillicores,
        memoryMb: db.memoryMb,
        storageGb: db.storageGb,
        suspendReason: db.suspendReason,
        createdAt: db.createdAt,
        user: decryptUserIdentity(db.user),
        pod,
      });
    });

    const appItems: K8sResourceItem[] = apps.map((app) => {
      const expectedName = `app-${app.id}-${app.subdomain}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .slice(0, 50);
      const deployLabel = app.k8sDeployment?.startsWith('deploy-')
        ? app.k8sDeployment.slice('deploy-'.length)
        : expectedName;
      const pod =
        appSnapshot?.podsByAppLabel.get(deployLabel) ||
        appSnapshot?.podsByAppLabel.get(expectedName);
      const catalog = getAppDefinition(app.appType);
      const cpuLimitMillicores = Math.max(100, Math.round((app.cpuShares || 1) * 1000));

      return mapWorkloadToResourceItem({
        id: app.id,
        kind: 'app',
        name: app.name,
        subtitle: catalog?.name || app.appType,
        engineOrAppType: app.appType.toUpperCase(),
        planName: app.planName || `${app.cpuShares}C / ${app.memoryMb}MB`,
        namespace: app.k8sNamespace || 'managed-apps',
        nodeFallback: app.node || 'k3s-apps',
        endpoint: `${app.subdomain}.${appDomain}`,
        dbStatus: app.status,
        cpuShares: app.cpuShares,
        cpuLimitMillicores,
        memoryMb: app.memoryMb,
        storageGb: app.storageGb,
        suspendReason: app.suspendReason,
        createdAt: app.createdAt,
        user: decryptUserIdentity(app.user),
        pod,
      });
    });

    return NextResponse.json({
      success: true,
      databases: {
        summary: buildResourceSummary(dbItems),
        items: dbItems,
        clusterNodes: (dbSnapshot?.clusterNodes || []) as K8sNodeLiveMetric[],
        metricsAvailable: Boolean(dbSnapshot?.metricsAvailable),
        clusterError: dbClusterError,
      },
      apps: {
        summary: buildResourceSummary(appItems),
        items: appItems,
        clusterNodes: (appSnapshot?.clusterNodes || []) as K8sNodeLiveMetric[],
        metricsAvailable: Boolean(appSnapshot?.metricsAvailable),
        clusterError: appClusterError,
      },
    });
  } catch (error: any) {
    console.error('GET /api/admin/resource-finding/k8s error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to collect Kubernetes resource metrics' },
      { status: 500 }
    );
  }
}
