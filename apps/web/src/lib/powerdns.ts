import dns from "node:dns";
import net from "node:net";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";

export const SUPPORTED_RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
  "NS",
  "SRV",
  "CAA",
] as const;

export type SupportedRecordType = (typeof SUPPORTED_RECORD_TYPES)[number];

export interface PdnsRecordEntry {
  content: string;
  disabled?: boolean;
}

export interface PdnsRrset {
  name: string;
  type: string;
  ttl: number;
  changetype?: "REPLACE" | "DELETE";
  records: PdnsRecordEntry[];
  comments?: Array<{ content: string; account?: string; modified_at?: number }>;
}

export interface PdnsZoneResponse {
  id: string;
  name: string;
  kind: string;
  serial: number;
  dnssec?: boolean;
  rrsets?: PdnsRrset[];
}

export interface PdnsCryptoKey {
  id: number;
  keytype: string;
  active: boolean;
  published?: boolean;
  bits?: number;
  algorithm?: string;
  dnskey?: string;
  ds?: string[];
}

export interface ParsedDsRecord {
  keyTag: string;
  algorithm: string;
  digestType: string;
  digest: string;
  raw: string;
}

export interface PdnsDnssecInfo {
  enabled: boolean;
  algorithm?: string;
  keyType?: string;
  dnskey?: string;
  dsRecords: ParsedDsRecord[];
}

export interface PdnsRuntimeConfig {
  enabled: boolean;
  configured: boolean;
  apiUrl: string;
  apiKey: string;
  nameservers: string[];
  resolver: string;
  publicIp: string;
}

const PDNS_SETTING_KEYS = [
  "powerdns_enabled",
  "powerdns_api_url",
  "powerdns_api_key",
  "powerdns_nameservers",
  "powerdns_resolver",
  "powerdns_public_ip",
] as const;

let cachedConfig: { data: PdnsRuntimeConfig; expiresAt: number } | null = null;

export function invalidatePowerDnsCache() {
  cachedConfig = null;
}

function tryDecryptSetting(val: string | undefined | null): string {
  if (!val) return "";
  try {
    const dec = decryptDeterministic(val);
    return dec || val;
  } catch {
    return val;
  }
}

export async function getPdnsRuntimeConfig(): Promise<PdnsRuntimeConfig> {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) {
    return cachedConfig.data;
  }

  const rows = await prisma.setting.findMany({
    where: { key: { in: [...PDNS_SETTING_KEYS] } },
  });
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }

  const enabled =
    map.powerdns_enabled !== undefined
      ? map.powerdns_enabled === "true"
      : process.env.POWERDNS_ENABLED !== "false";

  const apiUrl = (
    map.powerdns_api_url ||
    process.env.POWERDNS_API_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");

  const apiKey = (
    tryDecryptSetting(map.powerdns_api_key) ||
    process.env.POWERDNS_API_KEY ||
    ""
  ).trim();

  const nameserversRaw = (
    map.powerdns_nameservers ||
    process.env.POWERDNS_NAMESERVERS ||
    ""
  ).trim();

  const nameservers = nameserversRaw
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\.+$/, ""))
    .filter(Boolean);

  const resolver = (
    map.powerdns_resolver ||
    process.env.POWERDNS_RESOLVER ||
    ""
  ).trim();

  const publicIp = (
    map.powerdns_public_ip ||
    process.env.POWERDNS_PUBLIC_IP ||
    ""
  ).trim();

  const configured = Boolean(apiUrl && apiKey && nameservers.length > 0);
  const config: PdnsRuntimeConfig = {
    enabled,
    configured,
    apiUrl,
    apiKey,
    nameservers,
    resolver,
    publicIp,
  };

  cachedConfig = {
    data: config,
    expiresAt: Date.now() + 30_000,
  };

  return config;
}

export async function getPdnsPublicInfo() {
  const cfg = await getPdnsRuntimeConfig();
  return {
    enabled: cfg.enabled,
    configured: cfg.configured,
    nameservers: cfg.nameservers,
    resolver: cfg.resolver,
    publicIp: cfg.publicIp,
  };
}

export async function testPowerDnsConnection(params: {
  apiUrl: string;
  apiKey: string;
}): Promise<{ success: boolean; message: string; version?: string; latencyMs?: number }> {
  const cleanUrl = params.apiUrl.trim().replace(/\/+$/, "");
  const cleanKey = params.apiKey.trim();
  if (!cleanUrl || !cleanKey) {
    return { success: false, message: "PowerDNS API URL and API Key are required." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const startedAt = Date.now();

  try {
    const res = await fetch(cleanUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "X-API-Key": cleanKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const latencyMs = Date.now() - startedAt;
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    if (!res.ok) {
      return {
        success: false,
        message: data?.error || `PowerDNS API returned HTTP ${res.status}`,
        latencyMs,
      };
    }

    return {
      success: true,
      message: `Connected to PowerDNS ${data?.daemon_type || "authoritative"} v${data?.version || "unknown"}`,
      version: data?.version,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.name === "AbortError" ? "Connection timed out after 8s" : err?.message || "Connection failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function pdnsFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cfg = await getPdnsRuntimeConfig();
  if (!cfg.configured) {
    throw new Error("PowerDNS is not configured. Please configure it in Admin Settings -> PowerDNS.");
  }
  if (!cfg.enabled) {
    throw new Error("DNS Pointing service is currently disabled by administrator.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${cfg.apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "X-API-Key": cfg.apiKey,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    if (res.status === 204) {
      return undefined as T;
    }

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const msg = data?.error || `PowerDNS API error (${res.status})`;
      const err = new Error(msg) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

const PUBLIC_SUFFIX_SECOND_LEVEL = new Set([
  "co.id",
  "or.id",
  "ac.id",
  "sch.id",
  "go.id",
  "mil.id",
  "net.id",
  "web.id",
  "my.id",
  "biz.id",
  "desa.id",
  "ponpes.id",
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "com.sg",
  "com.my",
  "co.jp",
  "co.kr",
  "com.cn",
  "com.br",
  "com.mx",
  "github.io",
  "gitlab.io",
  "vercel.app",
  "netlify.app",
  "herokuapp.com",
  "pages.dev",
  "workers.dev",
]);

export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/\.+$/, "");
}

export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  if (PUBLIC_SUFFIX_SECOND_LEVEL.has(domain)) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain);
}

export async function isReservedPlatformDomain(domain: string): Promise<boolean> {
  const lower = normalizeDomain(domain);
  if (PUBLIC_SUFFIX_SECOND_LEVEL.has(lower)) return true;
  if (lower === "masdika.id" || lower.endsWith(".masdika.id")) return true;
  if (lower === "masdikacloud.my.id" || lower.endsWith(".masdikacloud.my.id")) return true;

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const appHost = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
        .toLowerCase()
        .replace(/^www\./, "");
      if (appHost && (lower === appHost || lower.endsWith(`.${appHost}`))) {
        return true;
      }
    } catch {}
  }

  try {
    const cfg = await getPdnsRuntimeConfig();
    for (const host of [...cfg.nameservers, cfg.resolver]) {
      const clean = normalizeDomain(host);
      if (!clean) continue;
      if (lower === clean || lower.endsWith(`.${clean}`) || clean.endsWith(`.${lower}`)) {
        return true;
      }
    }
  } catch {}

  return false;
}

export function toZoneFqdn(domain: string): string {
  return `${normalizeDomain(domain)}.`;
}

export function toRecordFqdn(nameInput: string, zoneDomain: string): string {
  const zone = normalizeDomain(zoneDomain);
  const raw = nameInput.trim().toLowerCase();

  if (!raw || raw === "@" || raw === zone || raw === `${zone}.`) {
    return `${zone}.`;
  }

  const stripped = raw.replace(/\.+$/, "");
  if (stripped === zone) {
    return `${zone}.`;
  }
  if (stripped.endsWith(`.${zone}`)) {
    return `${stripped}.`;
  }

  if (!/^(?:\*\.)?(?:[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?\.)*[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?$/.test(stripped)) {
    throw new Error("Invalid record hostname");
  }

  return `${stripped}.${zone}.`;
}

export function formatDisplayRecordName(fqdn: string, zoneDomain: string): string {
  const zoneFqdn = `${normalizeDomain(zoneDomain)}.`;
  const lower = fqdn.toLowerCase();
  if (lower === zoneFqdn) return "@";
  if (lower.endsWith(`.${zoneFqdn}`)) {
    return lower.slice(0, -(zoneFqdn.length + 1));
  }
  return lower.replace(/\.+$/, "");
}

function ensureTrailingDot(target: string): string {
  const trimmed = target.trim().toLowerCase();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

export function validateAndFormatRecordContent(
  type: SupportedRecordType,
  rawContent: string,
  priority?: number
): string {
  const value = rawContent.trim();
  if (!value) {
    throw new Error("Record value is required");
  }
  if (/[\r\n\0]/.test(value)) {
    throw new Error("Record value contains invalid control characters");
  }

  switch (type) {
    case "A": {
      if (!net.isIPv4(value)) {
        throw new Error(`Invalid IPv4 address: ${value}`);
      }
      return value;
    }
    case "AAAA": {
      if (!net.isIPv6(value)) {
        throw new Error(`Invalid IPv6 address: ${value}`);
      }
      return value;
    }
    case "CNAME":
    case "NS": {
      const fqdn = ensureTrailingDot(value);
      const hostOnly = fqdn.slice(0, -1);
      if (!isValidDomain(hostOnly)) {
        throw new Error(`Invalid hostname for ${type} record: ${value}`);
      }
      return fqdn;
    }
    case "MX": {
      let prio = priority;
      let host = value;
      const parts = value.split(/\s+/);
      if (parts.length === 2 && /^\d+$/.test(parts[0])) {
        prio = Number(parts[0]);
        host = parts[1];
      }
      const finalPrio = Number.isFinite(prio) ? Math.max(0, Math.min(65535, Number(prio))) : 10;
      const fqdn = ensureTrailingDot(host);
      if (!isValidDomain(fqdn.slice(0, -1))) {
        throw new Error(`Invalid mail server hostname: ${host}`);
      }
      return `${finalPrio} ${fqdn}`;
    }
    case "TXT": {
      const stripped =
        value.startsWith('"') && value.endsWith('"') && value.length >= 2
          ? value.slice(1, -1)
          : value;
      if (stripped.length > 255) {
        throw new Error("TXT record string cannot exceed 255 characters");
      }
      return `"${stripped.replace(/(?<!\\)"/g, '\\"')}"`;
    }
    case "SRV": {
      const parts = value.split(/\s+/);
      if (parts.length !== 4 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2])) {
        throw new Error("SRV value must be: <priority> <weight> <port> <target>");
      }
      return `${parts[0]} ${parts[1]} ${parts[2]} ${ensureTrailingDot(parts[3])}`;
    }
    case "CAA": {
      const parts = value.split(/\s+/);
      if (parts.length < 3 || !/^\d+$/.test(parts[0])) {
        throw new Error('CAA value must be: <flag> <tag> "<value>" (e.g. 0 issue "letsencrypt.org")');
      }
      const tag = parts[1].toLowerCase();
      const rest = parts.slice(2).join(" ");
      const quoted = rest.startsWith('"') && rest.endsWith('"') ? rest : `"${rest.replace(/"/g, "")}"`;
      return `${parts[0]} ${tag} ${quoted}`;
    }
    default:
      return value;
  }
}

export async function createPdnsZone(domain: string): Promise<PdnsZoneResponse> {
  const zoneName = toZoneFqdn(domain);
  const { nameservers } = await getPdnsPublicInfo();
  if (nameservers.length === 0) {
    throw new Error("Authoritative nameservers are not configured.");
  }
  const nsFqdns = nameservers.map((ns) => ensureTrailingDot(ns));

  return pdnsFetch<PdnsZoneResponse>("/zones", {
    method: "POST",
    body: JSON.stringify({
      name: zoneName,
      kind: "Native",
      nameservers: nsFqdns,
      soa_edit_api: "DEFAULT",
    }),
  });
}

export async function getPdnsZone(domain: string): Promise<PdnsZoneResponse> {
  const zoneId = encodeURIComponent(toZoneFqdn(domain));
  return pdnsFetch<PdnsZoneResponse>(`/zones/${zoneId}`, { method: "GET" });
}

export async function patchPdnsZoneRrsets(
  domain: string,
  rrsets: PdnsRrset[]
): Promise<void> {
  const zoneId = encodeURIComponent(toZoneFqdn(domain));
  await pdnsFetch(`/zones/${zoneId}`, {
    method: "PATCH",
    body: JSON.stringify({ rrsets }),
  });
}

export async function deletePdnsZone(domain: string): Promise<void> {
  const zoneId = encodeURIComponent(toZoneFqdn(domain));
  try {
    await pdnsFetch(`/zones/${zoneId}`, { method: "DELETE" });
  } catch (err: any) {
    if (err?.status === 404 || err?.status === 422) {
      return;
    }
    throw err;
  }
}

export function parseDsRecordString(raw: string): ParsedDsRecord | null {
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 4) return null;
  return {
    keyTag: parts[0],
    algorithm: parts[1],
    digestType: parts[2],
    digest: parts.slice(3).join(""),
    raw: raw.trim(),
  };
}

export async function getPdnsDnssecInfo(
  domain: string,
  zoneDnssecFlag?: boolean
): Promise<PdnsDnssecInfo> {
  const zoneId = encodeURIComponent(toZoneFqdn(domain));
  let enabled = zoneDnssecFlag;
  if (enabled === undefined) {
    const z = await getPdnsZone(domain);
    enabled = Boolean(z.dnssec);
  }

  if (!enabled) {
    return { enabled: false, dsRecords: [] };
  }

  const keys = await pdnsFetch<PdnsCryptoKey[]>(`/zones/${zoneId}/cryptokeys`, {
    method: "GET",
  });

  const activeSigningKeys = (keys || []).filter(
    (k) => k.active && Array.isArray(k.ds) && k.ds.length > 0
  );
  const primary = activeSigningKeys[0];
  const dsRecords: ParsedDsRecord[] = [];
  for (const k of activeSigningKeys) {
    for (const rawDs of k.ds || []) {
      const parsed = parseDsRecordString(rawDs);
      if (parsed) dsRecords.push(parsed);
    }
  }

  return {
    enabled: true,
    algorithm: primary?.algorithm,
    keyType: primary?.keytype?.toUpperCase(),
    dnskey: primary?.dnskey,
    dsRecords,
  };
}

export async function setPdnsDnssec(
  domain: string,
  enabled: boolean
): Promise<PdnsDnssecInfo> {
  const zoneId = encodeURIComponent(toZoneFqdn(domain));
  await pdnsFetch(`/zones/${zoneId}`, {
    method: "PUT",
    body: JSON.stringify({ dnssec: enabled }),
  });
  return getPdnsDnssecInfo(domain, enabled);
}

export async function checkNsDelegation(domain: string): Promise<{
  delegated: boolean;
  detectedNs: string[];
}> {
  const { nameservers } = await getPdnsPublicInfo();
  const expected = new Set(nameservers.map((n) => n.toLowerCase()));
  if (expected.size === 0) {
    return { delegated: false, detectedNs: [] };
  }

  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["1.1.1.1", "8.8.8.8"]);
    const timeoutPromise = new Promise<string[]>((_, reject) =>
      setTimeout(() => reject(new Error("DNS timeout")), 2500)
    );
    const nsList = await Promise.race([
      resolver.resolveNs(normalizeDomain(domain)),
      timeoutPromise,
    ]);
    const normalized = nsList.map((n) => n.toLowerCase().replace(/\.+$/, ""));
    const delegated = normalized.some((ns) => expected.has(ns));
    return { delegated, detectedNs: normalized };
  } catch {
    return { delegated: false, detectedNs: [] };
  }
}
