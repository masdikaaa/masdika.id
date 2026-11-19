import { Address4, Address6 } from 'ip-address';
import { prisma } from '@/lib/prisma';
import redis from '@/lib/redis';

const REDIS_BLOCKED_IPS_KEY = 'masdika:security:blocked-ips';
const REDIS_BLOCKED_USERS_KEY = 'masdika:security:blocked-user-ids';
const REDIS_CACHE_TTL_SECONDS = 30;
const MEMORY_CACHE_TTL_MS = 2000;

interface MemoryCache<T> {
  value: T;
  expiresAt: number;
}

let blockedIpsCache: MemoryCache<string[]> | null = null;
let blockedUsersCache: MemoryCache<Set<number>> | null = null;

/**
 * Normalize raw IP strings (strips ::ffff: IPv4-mapped prefix, IPv4 :port, zone IDs).
 */
export function normalizeIp(ip: string | null | undefined): string {
  if (!ip || typeof ip !== 'string') return '';
  let clean = ip.trim();
  if (!clean || clean === 'unknown' || clean === 'unknown-ip') return '';

  const zoneIdx = clean.indexOf('%');
  if (zoneIdx > 0) {
    clean = clean.slice(0, zoneIdx);
  }

  if (clean.toLowerCase().startsWith('::ffff:')) {
    const v4Candidate = clean.slice(7);
    if (Address4.isValid(v4Candidate)) {
      return v4Candidate;
    }
  }

  if (!clean.includes(':') || (clean.includes('.') && clean.lastIndexOf(':') > clean.lastIndexOf('.'))) {
    const lastColon = clean.lastIndexOf(':');
    if (lastColon > 0) {
      const maybeV4 = clean.slice(0, lastColon);
      if (Address4.isValid(maybeV4)) {
        return maybeV4;
      }
    }
  }

  return clean;
}

/**
 * Returns true if the IP is empty, unknown, or a loopback/unspecified address.
 */
export function isLoopbackOrUnknownIp(ip: string | null | undefined): boolean {
  const clean = normalizeIp(ip);
  if (!clean) return true;
  if (clean === '127.0.0.1' || clean.startsWith('127.') || clean === '0.0.0.0' || clean === '::1') {
    return true;
  }
  if (Address6.isValid(clean)) {
    try {
      return new Address6(clean).isLoopback();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Computes the /24 (IPv4) or /64 (IPv6) subnet CIDR for a non-loopback IP.
 */
export function getIpSubnet(ip: string | null | undefined): string | null {
  const clean = normalizeIp(ip);
  if (!clean || isLoopbackOrUnknownIp(clean)) return null;

  if (Address4.isValid(clean)) {
    const parts = clean.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }

  if (Address6.isValid(clean)) {
    try {
      const addr6 = new Address6(clean);
      const prefix = addr6.parsedAddress.slice(0, 4).join(':');
      return `${prefix}::/64`;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Matches a client IP against an exact IP or CIDR rule (supports IPv4 & IPv6).
 */
export function matchesIpOrSubnet(clientIp: string, ruleValue: string): boolean {
  const cleanClient = normalizeIp(clientIp);
  const cleanRule = normalizeIp(ruleValue);
  if (!cleanClient || !cleanRule) return false;

  if (cleanClient === cleanRule) return true;

  if (Address4.isValid(cleanClient) && Address4.isValid(cleanRule)) {
    try {
      return new Address4(cleanClient).isInSubnet(new Address4(cleanRule));
    } catch {
      return false;
    }
  }

  if (Address6.isValid(cleanClient) && Address6.isValid(cleanRule)) {
    try {
      return new Address6(cleanClient).isInSubnet(new Address6(cleanRule));
    } catch {
      return false;
    }
  }

  return false;
}

async function loadBlockedIpRules(): Promise<string[]> {
  const now = Date.now();
  if (blockedIpsCache && now < blockedIpsCache.expiresAt) {
    return blockedIpsCache.value;
  }

  if (redis) {
    try {
      const cached = await redis.get(REDIS_BLOCKED_IPS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as string[];
        if (Array.isArray(parsed)) {
          blockedIpsCache = { value: parsed, expiresAt: now + MEMORY_CACHE_TTL_MS };
          return parsed;
        }
      }
    } catch {
      // Fallback to DB
    }
  }

  const rows = await prisma.blockedUser.findMany({
    where: { type: 'IP' },
    select: { value: true },
  });
  const rules = rows.map((r) => r.value);

  blockedIpsCache = { value: rules, expiresAt: now + MEMORY_CACHE_TTL_MS };
  if (redis) {
    redis.set(REDIS_BLOCKED_IPS_KEY, JSON.stringify(rules), 'EX', REDIS_CACHE_TTL_SECONDS).catch(() => {});
  }

  return rules;
}

async function loadBlockedUserIds(): Promise<Set<number>> {
  const now = Date.now();
  if (blockedUsersCache && now < blockedUsersCache.expiresAt) {
    return blockedUsersCache.value;
  }

  if (redis) {
    try {
      const cached = await redis.get(REDIS_BLOCKED_USERS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as number[];
        if (Array.isArray(parsed)) {
          const set = new Set(parsed);
          blockedUsersCache = { value: set, expiresAt: now + MEMORY_CACHE_TTL_MS };
          return set;
        }
      }
    } catch {
      // Fallback to DB
    }
  }

  const rows = await prisma.user.findMany({
    where: { isSuspended: true },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  const set = new Set(ids);

  blockedUsersCache = { value: set, expiresAt: now + MEMORY_CACHE_TTL_MS };
  if (redis) {
    redis.set(REDIS_BLOCKED_USERS_KEY, JSON.stringify(ids), 'EX', REDIS_CACHE_TTL_SECONDS).catch(() => {});
  }

  return set;
}

/**
 * Immediately clears in-memory and Redis block caches so block/unblock changes take effect in real time.
 */
export async function invalidateSecurityBlockCache(): Promise<void> {
  blockedIpsCache = null;
  blockedUsersCache = null;
  if (redis) {
    try {
      await redis.del(REDIS_BLOCKED_IPS_KEY, REDIS_BLOCKED_USERS_KEY);
    } catch {
      // Ignore Redis errors on invalidation
    }
  }
}

/**
 * Checks if a given IP address is blocked (exact match or CIDR subnet).
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const cleanIp = normalizeIp(ip);
  if (!cleanIp) return false;

  try {
    const blockedIPs = await loadBlockedIpRules();
    for (const rule of blockedIPs) {
      if (matchesIpOrSubnet(cleanIp, rule)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking blocked IP:', error);
    return false;
  }
}

/**
 * Checks in real time if a user ID is currently blocked.
 */
export async function isUserBlocked(userId: number): Promise<boolean> {
  if (!Number.isSafeInteger(userId) || userId <= 0) return false;

  try {
    const blockedIds = await loadBlockedUserIds();
    return blockedIds.has(userId);
  } catch (error) {
    console.error('Error checking blocked user:', error);
    return false;
  }
}
