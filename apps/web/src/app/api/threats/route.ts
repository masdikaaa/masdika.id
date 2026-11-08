import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface AttackEvent {
  id: string;
  timestamp: string;
  attackName: string;
  sourceCity: string;
  sourceCountry: string;
  sourceCode: string;
  sourceIp: string;
  sourceCoords: [number, number]; // [lat, lng]
  targetCity: string;
  targetCountry: string;
  targetCode: string;
  targetCoords: [number, number];
  severity: 'Critical' | 'High' | 'Medium';
  protocol: 'TCP' | 'UDP' | 'HTTPS' | 'SSH';
  port: number;
  mitigation: string;
  isReal: boolean;
}

// In-memory cache for resolved IP geolocation to prevent external API spam
const geoCache = new Map<string, { city: string; country: string; code: string; coords: [number, number] }>();

// Check if IP is private, loopback, or local test
function isPrivateIp(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === 'localhost' || ip === '::1') return true;
  if (
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fe80:')
  ) {
    return true;
  }
  return false;
}

// Privacy Sanitizer: Heavily mask target emails/usernames to prevent exposing full names
function maskTarget(raw: string): string {
  if (!raw || raw.trim() === '') return 'usr_***';
  const clean = raw.trim().toLowerCase();
  const username = clean.includes('@') ? clean.split('@')[0] : clean;
  if (username.length <= 2) return `${username[0]}***`;
  if (username.length <= 4) return `${username.slice(0, 1)}***${username.slice(-1)}`;
  return `${username.slice(0, 2)}***${username.slice(-2)}`;
}

// IP Masking: Mask the last octet / host portion for visitor privacy & compliance
function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return '***.***.***.***';
  if (isPrivateIp(ip)) return '127.0.0.***';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 2).join(':')}:****:****`;
  }
  return '***.***.***.***';
}

// Fast Geolocation Lookup with timeout & fallback
async function resolveIpGeo(ip: string): Promise<{ city: string; country: string; code: string; coords: [number, number] }> {
  if (geoCache.has(ip)) {
    return geoCache.get(ip)!;
  }

  // Handle local / private test IPs gracefully
  if (isPrivateIp(ip)) {
    const localData = {
      city: 'Local Security Probe',
      country: 'Indonesia (Local Edge)',
      code: 'ID',
      coords: [-7.2575, 112.7521] as [number, number], // Surabaya/Sidoarjo test node
    };
    geoCache.set(ip, localData);
    return localData;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const geo = {
          city: data.city || 'Regional Gateway',
          country: data.country || 'International',
          code: (data.countryCode || 'GL').toUpperCase(),
          coords: [data.lat || 0, data.lon || 0] as [number, number],
        };
        geoCache.set(ip, geo);
        return geo;
      }
    }
  } catch {
    // ignore fetch errors and use fallback
  }

  // Fallback if IP cannot be resolved
  const fallback = {
    city: 'External Gateway',
    country: 'International',
    code: 'GL',
    coords: [35.6762, 139.6503] as [number, number],
  };
  geoCache.set(ip, fallback);
  return fallback;
}

// Global cyber threat intelligence vectors (similar to FortiGuard global sensor network)
const GLOBAL_VECTORS = [
  { name: 'Apache.Log4j.RCE.Payload.Exploit', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'Realtek.SDK.UDPServer.Command.Execution', severity: 'High', port: 5358, proto: 'UDP' },
  { name: 'SSH.BruteForce.CredentialStuffing', severity: 'High', port: 22, proto: 'SSH' },
  { name: 'React.Server.Components.RCE.Probe', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'SLP.Register.Service.Reflection.DoS', severity: 'High', port: 427, proto: 'UDP' },
  { name: 'Traefik.DDoS.Layer7.RateLimit.429', severity: 'Medium', port: 443, proto: 'HTTPS' },
  { name: 'GeoServer.OGC.Eval.Remote.Code.Exec', severity: 'Critical', port: 8080, proto: 'TCP' },
  { name: 'Hikvision.Products.SDK.WebLanguage.Tag.Command', severity: 'High', port: 80, proto: 'HTTPS' },
  { name: 'Nginx.Traversal.SensitivePath.404.Probe', severity: 'Medium', port: 443, proto: 'HTTPS' },
  { name: 'Spring4Shell.CloudCore.Invocation.Exec', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'PostgreSQL.ClientAuth.DictionaryAttack', severity: 'High', port: 5432, proto: 'TCP' },
  { name: 'K8s.API.UnauthorizedBearerProbe', severity: 'High', port: 6443, proto: 'HTTPS' },
  { name: 'OpenSSH.RegreSSHion.RaceCondition.CVE-2024-6387', severity: 'Critical', port: 22, proto: 'SSH' },
  { name: 'HTTP2.RapidReset.DDoS.Flood', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'Citrix.Bleed.SessionHijacking.Probe', severity: 'High', port: 443, proto: 'HTTPS' },
];

const GLOBAL_SOURCES = [
  // Sources from FortiGuard threat map
  { city: 'Mexico City', country: 'Mexico', code: 'MX', coords: [19.4326, -99.1332] as [number, number] },
  { city: 'Garretson', country: 'United States', code: 'US', coords: [43.7141, -96.5020] as [number, number] },
  { city: 'Oklahoma City', country: 'United States', code: 'US', coords: [35.4676, -97.5164] as [number, number] },
  { city: 'Washington', country: 'United States', code: 'US', coords: [38.9072, -77.0369] as [number, number] },
  { city: 'Lahore', country: 'Pakistan', code: 'PK', coords: [31.5204, 74.3587] as [number, number] },
  { city: 'North Bergen', country: 'United States', code: 'US', coords: [40.8043, -74.0121] as [number, number] },
  { city: 'Henderson', country: 'United States', code: 'US', coords: [36.0395, -114.9817] as [number, number] },
  { city: 'Haarlem', country: 'Netherlands', code: 'NL', coords: [52.3874, 4.6462] as [number, number] },
  { city: 'Amol', country: 'Iran', code: 'IR', coords: [36.4696, 52.3507] as [number, number] },
  { city: 'Seoul', country: 'South Korea', code: 'KR', coords: [37.5665, 126.9780] as [number, number] },
  { city: 'Tokyo', country: 'Japan', code: 'JP', coords: [35.6762, 139.6503] as [number, number] },
  { city: 'Frankfurt', country: 'Germany', code: 'DE', coords: [50.1109, 8.6821] as [number, number] },
  { city: 'Milan', country: 'Italy', code: 'IT', coords: [45.4642, 9.1900] as [number, number] },
  { city: 'Dallas', country: 'United States', code: 'US', coords: [32.7767, -96.7970] as [number, number] },
  { city: 'Silicon Valley', country: 'United States', code: 'US', coords: [37.3875, -122.0575] as [number, number] },
  { city: 'Shenzhen', country: 'China', code: 'CN', coords: [22.5431, 114.0579] as [number, number] },
  { city: 'Moscow', country: 'Russia', code: 'RU', coords: [55.7558, 37.6173] as [number, number] },
  { city: 'Singapore', country: 'Singapore', code: 'SG', coords: [1.3521, 103.8198] as [number, number] },
  { city: 'London', country: 'United Kingdom', code: 'GB', coords: [51.5074, -0.1278] as [number, number] },
  { city: 'Amsterdam', country: 'Netherlands', code: 'NL', coords: [52.3676, 4.9041] as [number, number] },
  { city: 'Sydney', country: 'Australia', code: 'AU', coords: [-33.8688, 151.2093] as [number, number] },
  { city: 'Taipei', country: 'Taiwan', code: 'TW', coords: [25.0330, 121.5654] as [number, number] },
  { city: 'Paris', country: 'France', code: 'FR', coords: [48.8566, 2.3522] as [number, number] },
  { city: 'Copenhagen', country: 'Denmark', code: 'DK', coords: [55.6761, 12.5683] as [number, number] },
  { city: 'Johannesburg', country: 'South Africa', code: 'ZA', coords: [-26.2041, 28.0473] as [number, number] },
  // Indonesian Cities
  { city: 'Surabaya', country: 'Indonesia', code: 'ID', coords: [-7.2575, 112.7521] as [number, number] },
  { city: 'Jakarta', country: 'Indonesia', code: 'ID', coords: [-6.2088, 106.8456] as [number, number] },
  { city: 'Bandung', country: 'Indonesia', code: 'ID', coords: [-6.9175, 107.6191] as [number, number] },
  { city: 'Bengkulu', country: 'Indonesia', code: 'ID', coords: [-3.7928, 102.2608] as [number, number] },
  { city: 'Pekanbaru', country: 'Indonesia', code: 'ID', coords: [0.5071, 101.4478] as [number, number] },
  { city: 'Medan', country: 'Indonesia', code: 'ID', coords: [3.5952, 98.6722] as [number, number] },
  { city: 'Yogyakarta', country: 'Indonesia', code: 'ID', coords: [-7.7956, 110.3695] as [number, number] },
];

const TARGET_NODES = [
  // Global Targets (Authentic cross-country destinations like in FortiGuard)
  { city: 'Warsaw', country: 'Poland', code: 'PL', coords: [52.2297, 21.0122] as [number, number] },
  { city: 'Bursa', country: 'Turkey', code: 'TR', coords: [40.1885, 29.0610] as [number, number] },
  { city: 'Bassano del Grappa', country: 'Italy', code: 'IT', coords: [45.7667, 11.7333] as [number, number] },
  { city: 'Reston', country: 'United States', code: 'US', coords: [38.9586, -77.3570] as [number, number] },
  { city: 'Frankfurt', country: 'Germany', code: 'DE', coords: [50.1109, 8.6821] as [number, number] },
  { city: 'Tokyo', country: 'Japan', code: 'JP', coords: [35.6762, 139.6503] as [number, number] },
  { city: 'Seoul', country: 'South Korea', code: 'KR', coords: [37.5665, 126.9780] as [number, number] },
  { city: 'London', country: 'United Kingdom', code: 'GB', coords: [51.5074, -0.1278] as [number, number] },
  { city: 'Amsterdam', country: 'Netherlands', code: 'NL', coords: [52.3676, 4.9041] as [number, number] },
  { city: 'Sydney', country: 'Australia', code: 'AU', coords: [-33.8688, 151.2093] as [number, number] },
  { city: 'Mumbai', country: 'India', code: 'IN', coords: [19.0760, 72.8777] as [number, number] },
  { city: 'São Paulo', country: 'Brazil', code: 'BR', coords: [-23.5505, -46.6333] as [number, number] },
  { city: 'Singapore', country: 'Singapore', code: 'SG', coords: [1.3521, 103.8198] as [number, number] },
  { city: 'Toronto', country: 'Canada', code: 'CA', coords: [43.6532, -79.3832] as [number, number] },
  { city: 'Vienna', country: 'Austria', code: 'AT', coords: [48.2082, 16.3738] as [number, number] },
  { city: 'Helsinki', country: 'Finland', code: 'FI', coords: [60.1699, 24.9384] as [number, number] },
  // Masdika Sidoarjo Edge Datacenter & Indonesian Nodes
  { city: 'Sidoarjo (Masdika Datacenter)', country: 'Indonesia', code: 'ID', coords: [-7.4478, 112.7183] as [number, number] },
  { city: 'Surabaya Edge Node', country: 'Indonesia', code: 'ID', coords: [-7.2575, 112.7521] as [number, number] },
  { city: 'Jakarta Core Gateway', country: 'Indonesia', code: 'ID', coords: [-6.2088, 106.8456] as [number, number] },
  { city: 'Bandung Cloud Node', country: 'Indonesia', code: 'ID', coords: [-6.9175, 107.6191] as [number, number] },
  { city: 'Medan Regional Hub', country: 'Indonesia', code: 'ID', coords: [3.5952, 98.6722] as [number, number] },
  { city: 'Makassar Transit Edge', country: 'Indonesia', code: 'ID', coords: [-5.1477, 119.4327] as [number, number] },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '15', 10);
  const realOnly = searchParams.get('realOnly') === 'true';

  const now = new Date();
  const events: AttackEvent[] = [];

  // =========================================================================
  // 1. FETCH REAL ATTACK INCIDENTS DIRECTLY FROM DATABASE
  // =========================================================================
  let realCount = 0;
  try {
    const [realFailedLogins, realBlockedUsers] = await Promise.all([
      prisma.loginLog.findMany({
        where: { success: false },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.blockedUser.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    // Process real failed login attempts
    for (const log of realFailedLogins) {
      const geo = await resolveIpGeo(log.ipAddress);
      const logDate = new Date(log.createdAt);
      const hours = String(logDate.getHours()).padStart(2, '0');
      const minutes = String(logDate.getMinutes()).padStart(2, '0');
      const seconds = String(logDate.getSeconds()).padStart(2, '0');

      const maskedTarget = maskTarget(log.emailAttempt);
      const maskedIp = maskIp(log.ipAddress);

      events.push({
        id: `real-login-${log.id}`,
        timestamp: `${hours}:${minutes}:${seconds}`,
        attackName: `Auth.BruteForce.CredentialStuffing (Target: ${maskedTarget})`,
        sourceCity: geo.city,
        sourceCountry: geo.country,
        sourceCode: geo.code,
        sourceIp: maskedIp,
        sourceCoords: geo.coords,
        targetCity: 'Sidoarjo (Primary Datacenter)',
        targetCountry: 'Indonesia',
        targetCode: 'ID',
        targetCoords: [-7.4478, 112.7183],
        severity: 'Critical',
        protocol: 'HTTPS',
        port: 443,
        mitigation: log.isBanned ? 'Permanent IP Blacklist' : 'Blocked by Anti-BruteForce Gate',
        isReal: true,
      });
      realCount++;
    }

    // Process real permanently blocked IPs
    for (const blocked of realBlockedUsers) {
      if (blocked.type === 'IP' || (blocked.value && !blocked.value.includes('@'))) {
        const rawIp = blocked.value;
        const geo = await resolveIpGeo(rawIp);
        const maskedIp = maskIp(rawIp);
        const blockDate = new Date(blocked.createdAt);
        const hours = String(blockDate.getHours()).padStart(2, '0');
        const minutes = String(blockDate.getMinutes()).padStart(2, '0');
        const seconds = String(blockDate.getSeconds()).padStart(2, '0');

        events.push({
          id: `real-blocked-${blocked.id}`,
          timestamp: `${hours}:${minutes}:${seconds}`,
          attackName: `Permanent.WAF.Drop (${blocked.reason || 'Malicious Traffic Detected'})`,
          sourceCity: geo.city,
          sourceCountry: geo.country,
          sourceCode: geo.code,
          sourceIp: maskedIp,
          sourceCoords: geo.coords,
          targetCity: 'Sidoarjo (Primary Datacenter)',
          targetCountry: 'Indonesia',
          targetCode: 'ID',
          targetCoords: [-7.4478, 112.7183],
          severity: 'Critical',
          protocol: 'TCP',
          port: 443,
          mitigation: 'Dropped at Edge Firewall (Banned IP)',
          isReal: true,
        });
        realCount++;
      }
    }
  } catch (err) {
    console.error('Error fetching real incident records from DB:', err);
  }

  // =========================================================================
  // 2. QUERY PROMETHEUS FOR REAL SECURITY COUNTERS (If reachable)
  // =========================================================================
  let realSshFailedCount = 0;
  try {
    const promUrl = process.env.PROMETHEUS_URL || 'http://masdika-prometheus:9090';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);

    const promRes = await fetch(
      `${promUrl}/api/v1/query?query=sum(promtail_custom_ssh_failed_logins_total)+or+vector(0)`,
      { signal: controller.signal }
    ).catch(() => null);
    clearTimeout(timeout);

    if (promRes && promRes.ok) {
      const data = await promRes.json();
      const val = data?.data?.result?.[0]?.value?.[1];
      if (val) realSshFailedCount = parseInt(val, 10);
    }
  } catch {
    // Prometheus gracefully handled
  }

  if (realSshFailedCount > 0) {
    events.unshift({
      id: `real-ssh-${Date.now()}`,
      timestamp: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      attackName: `Host.SSH.FailedAuth (Total Host Incidents: ${realSshFailedCount})`,
      sourceCity: 'Host Audit Sensor',
      sourceCountry: 'Incoming SSH Probe',
      sourceCode: 'SEC',
      sourceIp: 'Audit Log (/var/log/auth.log)',
      sourceCoords: [48.8566, 2.3522],
      targetCity: 'Sidoarjo (Primary Datacenter)',
      targetCountry: 'Indonesia',
      targetCode: 'ID',
      targetCoords: [-7.4478, 112.7183],
      severity: 'Critical',
      protocol: 'SSH',
      port: 22,
      mitigation: 'Mitigated by Promtail Security Gate',
      isReal: true,
    });
    realCount++;
  }

  // =========================================================================
  // 3. FILL WITH GLOBAL TELEMETRY PROBES FOR PERPETUAL RADAR VISUALIZATION
  // =========================================================================
  if (!realOnly) {
    const needed = Math.max(0, count - events.length);
    for (let i = 0; i < needed; i++) {
      const vector = GLOBAL_VECTORS[Math.floor(Math.random() * GLOBAL_VECTORS.length)];
      const source = GLOBAL_SOURCES[Math.floor(Math.random() * GLOBAL_SOURCES.length)];
      const target = TARGET_NODES[Math.floor(Math.random() * TARGET_NODES.length)];

      const eventTime = new Date(now.getTime() - (i + events.length) * (Math.floor(Math.random() * 2500) + 900));
      const hours = String(eventTime.getHours()).padStart(2, '0');
      const minutes = String(eventTime.getMinutes()).padStart(2, '0');
      const seconds = String(eventTime.getSeconds()).padStart(2, '0');

      events.push({
        id: `global-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: `${hours}:${minutes}:${seconds}`,
        attackName: vector.name,
        sourceCity: source.city,
        sourceCountry: source.country,
        sourceCode: source.code,
        sourceIp: `${Math.floor(Math.random() * 190) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.***`,
        sourceCoords: source.coords,
        targetCity: target.city,
        targetCountry: target.country,
        targetCode: target.code,
        targetCoords: target.coords,
        severity: vector.severity as 'Critical' | 'High' | 'Medium',
        protocol: vector.proto as 'TCP' | 'UDP' | 'HTTPS' | 'SSH',
        port: vector.port,
        mitigation: 'Mitigated / Blocked by WAF',
        isReal: false,
      });
    }
  }

  // Query database real security counts for industry and country telemetry
  let dbFailedLoginsCount = 0;
  let dbBlockedCount = 0;
  try {
    const [failedCount, blockedCount] = await Promise.all([
      prisma.loginLog.count({ where: { success: false } }),
      prisma.blockedUser.count(),
    ]);
    dbFailedLoginsCount = failedCount;
    dbBlockedCount = blockedCount;
  } catch {
    // fallback
  }

  const totalBlocked = 853490 + (dbFailedLoginsCount * 7) + (dbBlockedCount * 18);
  const totalRealSecurityEvents = realCount + dbFailedLoginsCount + dbBlockedCount;

  return NextResponse.json({
    status: 'success',
    timestamp: now.toISOString(),
    stats: {
      attacksPerSecond: Math.floor(Math.random() * 6) + 14,
      blockedIn24h: totalBlocked,
      activeOutbreaks: 140,
      realIncidentsCount: realCount,
      threatPosture: 'Normal / Protected',
      edgeStatus: '100% Operational (Zero Breaches)',
    },
    topThreats: [
      { name: 'Apache.Log4j.RCE.Payload.Exploit', count: '360K', percent: 94 },
      { name: 'SLP.Register.Service.Reflection.DoS', count: '158K', percent: 76 },
      { name: 'React.Server.Components.RCE.Probe', count: '107K', percent: 62 },
      { name: 'Realtek.SDK.UDPServer.Command.Execution', count: '89K', percent: 54 },
      { name: 'SSH.BruteForce.HostAudit.Probe', count: `${realSshFailedCount || 21}K`, percent: 42 },
      { name: 'Traefik.DDoS.Layer7.RateLimit.429', count: '18K', percent: 35 },
      { name: 'GeoServer.OGC.Eval.Remote.Code.Exec', count: '25K', percent: 28 },
      { name: 'Nginx.Traversal.SensitivePath.404.Probe', count: '14K', percent: 20 },
    ],
    topCountries: [
      { name: 'Indonesia', code: 'ID', count: `${(totalRealSecurityEvents + 4.8).toFixed(1)}K`, percent: 96 },
      { name: 'Germany', code: 'DE', count: '5.3K', percent: 84 },
      { name: 'United States', code: 'US', count: '3.0K', percent: 72 },
      { name: 'Italy', code: 'IT', count: '728', percent: 55 },
      { name: 'Japan', code: 'JP', count: '314', percent: 42 },
      { name: 'Iceland', code: 'IS', count: '311', percent: 39 },
      { name: 'South Africa', code: 'ZA', count: '301', percent: 36 },
      { name: 'Denmark', code: 'DK', count: '278', percent: 31 },
      { name: 'Canada', code: 'CA', count: '233', percent: 26 },
      { name: 'France', code: 'FR', count: '230', percent: 24 },
      { name: 'Netherlands', code: 'NL', count: '226', percent: 22 },
      { name: 'Austria', code: 'AT', count: '190', percent: 18 },
    ],
    targetedIndustries: [
      { name: 'Technology & Cloud Compute', count: `${((dbFailedLoginsCount * 14 + 2310) / 10).toFixed(1)}K`, percent: 96 },
      { name: 'Banking / Finance / Fintech', count: `${((dbFailedLoginsCount * 11 + 2290) / 10).toFixed(1)}K`, percent: 92 },
      { name: 'Government & Public Sector', count: `${((dbBlockedCount * 18 + 1040) / 10).toFixed(1)}K`, percent: 68 },
      { name: 'Automotive & Hardware', count: '89.4K', percent: 61 },
      { name: 'Manufacturing & Industrial IoT', count: '74.2K', percent: 52 },
      { name: 'Education & Research', count: '38.6K', percent: 35 },
      { name: 'Telecommunication / Carrier', count: '19.8K', percent: 18 },
    ],
    events,
  });
}
