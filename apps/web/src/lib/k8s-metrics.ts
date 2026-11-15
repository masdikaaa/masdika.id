import * as k8s from '@kubernetes/client-node';

export interface K8sPodLiveMetric {
  podName: string;
  appLabel: string;
  namespace: string;
  nodeName: string;
  podIp: string;
  podPhase: string;
  ready: boolean;
  isRunning: boolean;
  restarts: number;
  oomKilled: boolean;
  terminationReason: string | null;
  waitingReason: string | null;
  cpuMillicores: number;
  memBytes: number;
  uptimeSeconds: number;
  startedAt: string | null;
  hasLiveMetrics: boolean;
}

export interface K8sNodeLiveMetric {
  name: string;
  ready: boolean;
  kubeletVersion: string;
  cpuCapacityMillicores: number;
  cpuUsageMillicores: number;
  cpuPercent: number;
  memCapacityBytes: number;
  memUsageBytes: number;
  memPercent: number;
  podCount: number;
}

export interface K8sNamespaceSnapshot {
  metricsAvailable: boolean;
  clusterNodes: K8sNodeLiveMetric[];
  podsByAppLabel: Map<string, K8sPodLiveMetric>;
  podsByName: Map<string, K8sPodLiveMetric>;
}

/**
 * Parse Kubernetes CPU quantity strings (e.g. "250m", "12500000n", "500u", "1.5") into millicores.
 */
export function parseK8sCpuMillicores(raw?: string | null): number {
  if (!raw) return 0;
  const val = String(raw).trim();
  if (!val) return 0;

  if (val.endsWith('n')) {
    const n = parseFloat(val.slice(0, -1));
    return Number.isFinite(n) ? Math.max(0, Math.round(n / 1_000_000)) : 0;
  }
  if (val.endsWith('u')) {
    const u = parseFloat(val.slice(0, -1));
    return Number.isFinite(u) ? Math.max(0, Math.round(u / 1_000)) : 0;
  }
  if (val.endsWith('m')) {
    const m = parseFloat(val.slice(0, -1));
    return Number.isFinite(m) ? Math.max(0, Math.round(m)) : 0;
  }

  const cores = parseFloat(val);
  return Number.isFinite(cores) ? Math.max(0, Math.round(cores * 1000)) : 0;
}

/**
 * Parse Kubernetes memory/storage quantity strings (e.g. "512Mi", "2Gi", "1024Ki", "100M") into bytes.
 */
export function parseK8sMemoryBytes(raw?: string | null): number {
  if (!raw) return 0;
  const val = String(raw).trim();
  if (!val) return 0;

  const match = val.match(/^([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]*)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  if (!Number.isFinite(num) || num < 0) return 0;

  const unit = match[2];
  const binaryUnits: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Pi: 1024 ** 5,
  };
  if (unit in binaryUnits) {
    return Math.round(num * binaryUnits[unit]);
  }

  const decimalUnits: Record<string, number> = {
    k: 1e3,
    K: 1e3,
    M: 1e6,
    G: 1e9,
    T: 1e12,
    P: 1e15,
  };
  if (unit in decimalUnits) {
    return Math.round(num * decimalUnits[unit]);
  }

  return Math.round(num);
}

/**
 * Classify Kubernetes workload severity consistently with Proxmox VPS Resource Finding thresholds.
 */
export function classifyK8sSeverity(params: {
  dbStatus: string;
  isRunning: boolean;
  podPhase: string;
  cpuPercent: number;
  memPercent: number;
  restarts: number;
  oomKilled: boolean;
}): 'CRITICAL' | 'WARNING' | 'NORMAL' | 'OFFLINE' {
  if (
    params.oomKilled ||
    params.podPhase === 'CrashLoopBackOff' ||
    params.podPhase === 'OOMKilled' ||
    params.podPhase === 'Error' ||
    params.cpuPercent >= 80 ||
    params.memPercent >= 90
  ) {
    return 'CRITICAL';
  }

  if (!params.isRunning && params.dbStatus !== 'PROVISIONING') {
    return 'OFFLINE';
  }

  if (
    params.restarts >= 3 ||
    params.cpuPercent >= 60 ||
    params.memPercent >= 75 ||
    params.podPhase === 'Pending' ||
    params.podPhase === 'ContainerCreating'
  ) {
    return 'WARNING';
  }

  return 'NORMAL';
}

/**
 * Collect live Pod status, restarts, OOM events, CPU/RAM metrics, and cluster Node health from Kubernetes.
 */
export async function collectK8sClusterMetrics(
  kc: k8s.KubeConfig,
  namespace: string
): Promise<K8sNamespaceSnapshot> {
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const metricsClient = new k8s.Metrics(kc);

  const [podsResult, podMetricsResult, nodesResult, nodeMetricsResult] = await Promise.allSettled([
    coreApi.listNamespacedPod({ namespace }),
    metricsClient.getPodMetrics(namespace),
    coreApi.listNode(),
    metricsClient.getNodeMetrics(),
  ]);

  const metricsAvailable = podMetricsResult.status === 'fulfilled' || nodeMetricsResult.status === 'fulfilled';

  const podUsageByName = new Map<string, { cpuMillicores: number; memBytes: number }>();
  if (podMetricsResult.status === 'fulfilled') {
    for (const item of podMetricsResult.value.items || []) {
      const podName = item.metadata?.name;
      if (!podName) continue;
      let cpu = 0;
      let mem = 0;
      for (const c of item.containers || []) {
        cpu += parseK8sCpuMillicores(c.usage?.cpu);
        mem += parseK8sMemoryBytes(c.usage?.memory);
      }
      podUsageByName.set(podName, { cpuMillicores: cpu, memBytes: mem });
    }
  }

  const podsByAppLabel = new Map<string, K8sPodLiveMetric>();
  const podsByName = new Map<string, K8sPodLiveMetric>();
  const podCountByNode = new Map<string, number>();

  if (podsResult.status === 'fulfilled') {
    const now = Date.now();
    for (const pod of podsResult.value.items || []) {
      const podName = pod.metadata?.name || '';
      const appLabel = pod.metadata?.labels?.app || '';
      const nodeName = pod.spec?.nodeName || '';
      if (nodeName) {
        podCountByNode.set(nodeName, (podCountByNode.get(nodeName) || 0) + 1);
      }

      const containerStatuses = pod.status?.containerStatuses || [];
      const firstStatus = containerStatuses[0];
      const restarts = containerStatuses.reduce((sum, cs) => sum + (cs.restartCount || 0), 0);
      const ready = containerStatuses.length > 0 && containerStatuses.every((cs) => Boolean(cs.ready));

      const waitingReason = firstStatus?.state?.waiting?.reason || null;
      const termReason =
        firstStatus?.lastState?.terminated?.reason || firstStatus?.state?.terminated?.reason || null;
      const oomKilled =
        termReason === 'OOMKilled' ||
        containerStatuses.some(
          (cs) =>
            cs.lastState?.terminated?.reason === 'OOMKilled' ||
            cs.state?.terminated?.reason === 'OOMKilled'
        );

      const rawPhase = pod.status?.phase || 'Unknown';
      const effectivePhase = waitingReason || (oomKilled && !ready ? 'OOMKilled' : rawPhase);
      const isRunning = rawPhase === 'Running' && ready && !waitingReason;

      const startedAtDate = pod.status?.startTime ? new Date(pod.status.startTime) : null;
      const uptimeSeconds =
        startedAtDate && !Number.isNaN(startedAtDate.getTime()) && rawPhase === 'Running'
          ? Math.max(0, Math.floor((now - startedAtDate.getTime()) / 1000))
          : 0;

      const usage = podUsageByName.get(podName);
      const metric: K8sPodLiveMetric = {
        podName,
        appLabel,
        namespace,
        nodeName,
        podIp: pod.status?.podIP || '-',
        podPhase: effectivePhase,
        ready,
        isRunning,
        restarts,
        oomKilled,
        terminationReason: termReason,
        waitingReason,
        cpuMillicores: usage?.cpuMillicores ?? 0,
        memBytes: usage?.memBytes ?? 0,
        uptimeSeconds,
        startedAt: startedAtDate ? startedAtDate.toISOString() : null,
        hasLiveMetrics: Boolean(usage),
      };

      if (podName) podsByName.set(podName, metric);
      if (appLabel) {
        const existing = podsByAppLabel.get(appLabel);
        // Prefer active/running pod if old terminating pod is still lingering during rollout
        if (!existing || (metric.isRunning && !existing.isRunning)) {
          podsByAppLabel.set(appLabel, metric);
        }
      }
    }
  }

  const nodeUsageByName = new Map<string, { cpuMillicores: number; memBytes: number }>();
  if (nodeMetricsResult.status === 'fulfilled') {
    for (const item of nodeMetricsResult.value.items || []) {
      const nodeName = item.metadata?.name;
      if (!nodeName) continue;
      nodeUsageByName.set(nodeName, {
        cpuMillicores: parseK8sCpuMillicores(item.usage?.cpu),
        memBytes: parseK8sMemoryBytes(item.usage?.memory),
      });
    }
  }

  const clusterNodes: K8sNodeLiveMetric[] = [];
  if (nodesResult.status === 'fulfilled') {
    for (const node of nodesResult.value.items || []) {
      const name = node.metadata?.name || 'k8s-node';
      const capacity = node.status?.allocatable || node.status?.capacity || {};
      const cpuCap = parseK8sCpuMillicores(capacity.cpu);
      const memCap = parseK8sMemoryBytes(capacity.memory);
      const usage = nodeUsageByName.get(name);
      const cpuUsage = usage?.cpuMillicores ?? 0;
      const memUsage = usage?.memBytes ?? 0;
      const readyCond = (node.status?.conditions || []).find((c) => c.type === 'Ready');

      clusterNodes.push({
        name,
        ready: readyCond?.status === 'True',
        kubeletVersion: node.status?.nodeInfo?.kubeletVersion || '-',
        cpuCapacityMillicores: cpuCap,
        cpuUsageMillicores: cpuUsage,
        cpuPercent: cpuCap > 0 ? Math.round((cpuUsage / cpuCap) * 1000) / 10 : 0,
        memCapacityBytes: memCap,
        memUsageBytes: memUsage,
        memPercent: memCap > 0 ? Math.round((memUsage / memCap) * 1000) / 10 : 0,
        podCount: podCountByNode.get(name) || 0,
      });
    }
  }

  return {
    metricsAvailable,
    clusterNodes,
    podsByAppLabel,
    podsByName,
  };
}
