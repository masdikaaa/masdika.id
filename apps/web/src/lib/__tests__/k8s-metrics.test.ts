import { describe, it, expect } from 'vitest';
import {
  parseK8sCpuMillicores,
  parseK8sMemoryBytes,
  classifyK8sSeverity,
} from '../k8s-metrics';

describe('Kubernetes Metrics Parsing & Severity Helpers', () => {
  it('parses CPU quantities across nanocores, microcores, millicores, and cores', () => {
    expect(parseK8sCpuMillicores('50000000n')).toBe(50);
    expect(parseK8sCpuMillicores('250000u')).toBe(250);
    expect(parseK8sCpuMillicores('125m')).toBe(125);
    expect(parseK8sCpuMillicores('1.5')).toBe(1500);
    expect(parseK8sCpuMillicores('2')).toBe(2000);
    expect(parseK8sCpuMillicores('')).toBe(0);
    expect(parseK8sCpuMillicores(null)).toBe(0);
  });

  it('parses Memory quantities across binary and decimal Kubernetes suffixes', () => {
    expect(parseK8sMemoryBytes('1024Ki')).toBe(1024 * 1024);
    expect(parseK8sMemoryBytes('512Mi')).toBe(512 * 1024 * 1024);
    expect(parseK8sMemoryBytes('2Gi')).toBe(2 * 1024 * 1024 * 1024);
    expect(parseK8sMemoryBytes('100M')).toBe(100_000_000);
    expect(parseK8sMemoryBytes('65536')).toBe(65536);
    expect(parseK8sMemoryBytes(undefined)).toBe(0);
  });

  it('classifies Kubernetes workload severity accurately for OOM, high load, restarts, offline, and normal states', () => {
    expect(
      classifyK8sSeverity({
        dbStatus: 'RUNNING',
        isRunning: false,
        podPhase: 'CrashLoopBackOff',
        cpuPercent: 10,
        memPercent: 95,
        restarts: 4,
        oomKilled: true,
      })
    ).toBe('CRITICAL');

    expect(
      classifyK8sSeverity({
        dbStatus: 'RUNNING',
        isRunning: true,
        podPhase: 'Running',
        cpuPercent: 84,
        memPercent: 40,
        restarts: 0,
        oomKilled: false,
      })
    ).toBe('CRITICAL');

    expect(
      classifyK8sSeverity({
        dbStatus: 'RUNNING',
        isRunning: true,
        podPhase: 'Running',
        cpuPercent: 62,
        memPercent: 50,
        restarts: 0,
        oomKilled: false,
      })
    ).toBe('WARNING');

    expect(
      classifyK8sSeverity({
        dbStatus: 'RUNNING',
        isRunning: true,
        podPhase: 'Running',
        cpuPercent: 12,
        memPercent: 50,
        restarts: 3,
        oomKilled: false,
      })
    ).toBe('WARNING');

    expect(
      classifyK8sSeverity({
        dbStatus: 'STOPPED',
        isRunning: false,
        podPhase: 'Stopped',
        cpuPercent: 0,
        memPercent: 0,
        restarts: 0,
        oomKilled: false,
      })
    ).toBe('OFFLINE');

    expect(
      classifyK8sSeverity({
        dbStatus: 'RUNNING',
        isRunning: true,
        podPhase: 'Running',
        cpuPercent: 18,
        memPercent: 54,
        restarts: 0,
        oomKilled: false,
      })
    ).toBe('NORMAL');
  });
});
