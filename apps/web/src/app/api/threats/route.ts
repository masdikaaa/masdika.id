import { NextResponse } from 'next/server';

interface AttackEvent {
  id: string;
  timestamp: string;
  attackName: string;
  sourceCity: string;
  sourceCountry: string;
  sourceCode: string;
  sourceFlag: string;
  sourceCoords: [number, number]; // [lat, lng]
  targetCity: string;
  targetCountry: string;
  targetCode: string;
  targetFlag: string;
  targetCoords: [number, number];
  severity: 'Critical' | 'High' | 'Medium';
  protocol: 'TCP' | 'UDP' | 'HTTPS' | 'SSH';
  port: number;
  mitigation: string;
}

const ATTACK_VECTORS = [
  { name: 'Apache.Log4j.Error.Log.Remote.Code.Execution', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'Realtek.SDK.UDPServer.Command.Execution', severity: 'High', port: 5358, proto: 'UDP' },
  { name: 'SSH.BruteForce.CredentialStuffing', severity: 'High', port: 22, proto: 'SSH' },
  { name: 'React.Server.Components.RCE.Probe', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'SLP.Register.Service.Reflection.DoS', severity: 'High', port: 427, proto: 'UDP' },
  { name: 'Traefik.DDoS.Layer7.RateLimit.429', severity: 'Medium', port: 443, proto: 'HTTPS' },
  { name: 'GeoServer.OGC.Eval.Remote.Code.Exec', severity: 'Critical', port: 8080, proto: 'TCP' },
  { name: 'Hikvision.Products.SDK.WebLanguage.Tag.Command', severity: 'High', port: 80, proto: 'HTTPS' },
  { name: 'Nginx.Traversal.SensitivePath.404.Probe', severity: 'Medium', port: 443, proto: 'HTTPS' },
  { name: 'SolarWinds.SUNBURST.BackDoor.Probe', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'Atlassian.Server.Endpoint.Info.Disclosure', severity: 'Medium', port: 8090, proto: 'HTTPS' },
  { name: 'Spring4Shell.CloudCore.Invocation.Exec', severity: 'Critical', port: 443, proto: 'HTTPS' },
  { name: 'PostgreSQL.ClientAuth.DictionaryAttack', severity: 'High', port: 5432, proto: 'TCP' },
  { name: 'K8s.API.UnauthorizedBearerProbe', severity: 'High', port: 6443, proto: 'HTTPS' },
];

const SOURCE_LOCATIONS = [
  { city: 'Amol', country: 'Iran', code: 'IR', flag: '🇮🇷', coords: [36.4696, 52.3507] as [number, number] },
  { city: 'Seoul', country: 'South Korea', code: 'KR', flag: '🇰🇷', coords: [37.5665, 126.9780] as [number, number] },
  { city: 'Tokyo', country: 'Japan', code: 'JP', flag: '🇯🇵', coords: [35.6762, 139.6503] as [number, number] },
  { city: 'Frankfurt', country: 'Germany', code: 'DE', flag: '🇩🇪', coords: [50.1109, 8.6821] as [number, number] },
  { city: 'Milan', country: 'Italy', code: 'IT', flag: '🇮🇹', coords: [45.4642, 9.1900] as [number, number] },
  { city: 'Prosecco', country: 'Italy', code: 'IT', flag: '🇮🇹', coords: [45.7042, 13.7200] as [number, number] },
  { city: 'Dallas', country: 'United States', code: 'US', flag: '🇺🇸', coords: [32.7767, -96.7970] as [number, number] },
  { city: 'Silicon Valley', country: 'United States', code: 'US', flag: '🇺🇸', coords: [37.3875, -122.0575] as [number, number] },
  { city: 'Shenzhen', country: 'China', code: 'CN', flag: '🇨🇳', coords: [22.5431, 114.0579] as [number, number] },
  { city: 'Moscow', country: 'Russia', code: 'RU', flag: '🇷🇺', coords: [55.7558, 37.6173] as [number, number] },
  { city: 'Singapore', country: 'Singapore', code: 'SG', flag: '🇸🇬', coords: [1.3521, 103.8198] as [number, number] },
  { city: 'London', country: 'United Kingdom', code: 'GB', flag: '🇬🇧', coords: [51.5074, -0.1278] as [number, number] },
  { city: 'Sao Paulo', country: 'Brazil', code: 'BR', flag: '🇧🇷', coords: [-23.5505, -46.6333] as [number, number] },
  { city: 'Sydney', country: 'Australia', code: 'AU', flag: '🇦🇺', coords: [-33.8688, 151.2093] as [number, number] },
];

const TARGET_NODES = [
  { city: 'Sidoarjo (Primary Datacenter)', country: 'Indonesia', code: 'ID', flag: '🇮🇩', coords: [-7.4478, 112.7183] as [number, number] },
  { city: 'Surabaya Edge Node', country: 'Indonesia', code: 'ID', flag: '🇮🇩', coords: [-7.2575, 112.7521] as [number, number] },
  { city: 'Jakarta Core Gateway', country: 'Indonesia', code: 'ID', flag: '🇮🇩', coords: [-6.2088, 106.8456] as [number, number] },
  { city: 'Semarang Transit Node', country: 'Indonesia', code: 'ID', flag: '🇮🇩', coords: [-6.9667, 110.4167] as [number, number] },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = parseInt(searchParams.get('count') || '15', 10);

  const now = new Date();
  const events: AttackEvent[] = [];

  for (let i = 0; i < count; i++) {
    const vector = ATTACK_VECTORS[Math.floor(Math.random() * ATTACK_VECTORS.length)];
    const source = SOURCE_LOCATIONS[Math.floor(Math.random() * SOURCE_LOCATIONS.length)];
    const target = TARGET_NODES[Math.floor(Math.random() * TARGET_NODES.length)];
    
    // Stagger timestamp backwards by a few seconds each
    const eventTime = new Date(now.getTime() - i * (Math.floor(Math.random() * 2500) + 800));
    const hours = String(eventTime.getHours()).padStart(2, '0');
    const minutes = String(eventTime.getMinutes()).padStart(2, '0');
    const seconds = String(eventTime.getSeconds()).padStart(2, '0');

    events.push({
      id: `atk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: `${hours}:${minutes}:${seconds}`,
      attackName: vector.name,
      sourceCity: source.city,
      sourceCountry: source.country,
      sourceCode: source.code,
      sourceFlag: source.flag,
      sourceCoords: source.coords,
      targetCity: target.city,
      targetCountry: target.country,
      targetCode: target.code,
      targetFlag: target.flag,
      targetCoords: target.coords,
      severity: vector.severity as 'Critical' | 'High' | 'Medium',
      protocol: vector.proto as 'TCP' | 'UDP' | 'HTTPS' | 'SSH',
      port: vector.port,
      mitigation: 'Mitigated / Blocked by WAF',
    });
  }

  return NextResponse.json({
    status: 'success',
    timestamp: now.toISOString(),
    stats: {
      attacksPerSecond: Math.floor(Math.random() * 10) + 12,
      blockedIn24h: 853490 + Math.floor(Math.random() * 120),
      activeOutbreaks: 142,
      threatPosture: 'Normal / Protected',
      edgeStatus: 'Operational (Zero Breaches)',
    },
    topThreats: [
      { name: 'Apache.Log4j.Error.Log.Remote.Code.Execution', count: '360K', percent: 94 },
      { name: 'SLP.Register.Service.Reflection.DoS', count: '158K', percent: 76 },
      { name: 'React.Server.Components.RCE.Probe', count: '107K', percent: 62 },
      { name: 'Realtek.SDK.UDPServer.Command.Execution', count: '89K', percent: 54 },
      { name: 'GeoServer.OGC.Eval.Remote.Code.Exec', count: '25K', percent: 38 },
      { name: 'SolarWinds.SUNBURST.BackDoor.Probe', count: '21K', percent: 32 },
      { name: 'Hikvision.Products.SDK.WebLanguage.Tag.Command', count: '11K', percent: 24 },
      { name: 'Traefik.RateLimited.HTTP.429.DDoS', count: '9.8K', percent: 18 },
    ],
    targetedIndustries: [
      { name: 'Technology & Cloud Compute', count: '231K', percent: 95 },
      { name: 'Banking / Finance / Fintech', count: '229K', percent: 93 },
      { name: 'Government & Public Sector', count: '104K', percent: 68 },
      { name: 'Manufacturing & Hardware', count: '101K', percent: 65 },
      { name: 'Education & Research', count: '29K', percent: 34 },
      { name: 'Construction & Real Estate', count: '12K', percent: 18 },
      { name: 'Transportation & Logistics', count: '12K', percent: 17 },
      { name: 'Telecommunication / Carrier', count: '11K', percent: 15 },
    ],
    events,
  });
}

