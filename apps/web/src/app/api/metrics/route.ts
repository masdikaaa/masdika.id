import { NextResponse } from 'next/server';
import { circuitBreakerRegistry } from '@/lib/circuit-breaker';
import { verifyCronSecret } from '@/lib/cron-auth';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Allow internal K3s cluster Prometheus scrapes (no Cloudflare edge headers),
  // while requiring CRON_SECRET or ADMIN authentication for external requests.
  const isExternalEdgeRequest = Boolean(
    req.headers.get('cf-connecting-ip') || req.headers.get('cf-ray')
  );
  if (isExternalEdgeRequest && !verifyCronSecret(req)) {
    const authResult = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (authResult.error) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  const mem = process.memoryUsage();
  const uptime = Math.floor(process.uptime());
  const cpu = process.cpuUsage();

  const metrics = [
    '# HELP process_uptime_seconds The uptime of the process in seconds.',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${uptime}`,
    '',
    '# HELP nodejs_heap_size_total_bytes Process heap size total in bytes.',
    '# TYPE nodejs_heap_size_total_bytes gauge',
    `nodejs_heap_size_total_bytes ${mem.heapTotal}`,
    '',
    '# HELP nodejs_heap_size_used_bytes Process heap size used in bytes.',
    '# TYPE nodejs_heap_size_used_bytes gauge',
    `nodejs_heap_size_used_bytes ${mem.heapUsed}`,
    '',
    '# HELP nodejs_external_memory_bytes Process external memory in bytes.',
    '# TYPE nodejs_external_memory_bytes gauge',
    `nodejs_external_memory_bytes ${mem.external}`,
    '',
    '# HELP nodejs_resident_memory_bytes Resident memory size in bytes.',
    '# TYPE nodejs_resident_memory_bytes gauge',
    `nodejs_resident_memory_bytes ${mem.rss}`,
    '',
    '# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.',
    '# TYPE process_cpu_user_seconds_total counter',
    `process_cpu_user_seconds_total ${(cpu.user / 1e6).toFixed(4)}`,
    '',
    '# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.',
    '# TYPE process_cpu_system_seconds_total counter',
    `process_cpu_system_seconds_total ${(cpu.system / 1e6).toFixed(4)}`,
    '',
    '# HELP masdika_app_status Health status of the application (1 = healthy).',
    '# TYPE masdika_app_status gauge',
    'masdika_app_status 1',
    '',
    '# HELP masdika_app_info Application metadata info.',
    '# TYPE masdika_app_info gauge',
    'masdika_app_info{version="1.0.1",app="masdika-web"} 1',
    '',
    ...circuitBreakerRegistry.toPrometheusMetrics(),
    ''
  ].join('\n');

  return new NextResponse(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

