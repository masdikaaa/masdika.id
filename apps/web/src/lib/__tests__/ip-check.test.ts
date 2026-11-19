import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  blockedIps: [] as Array<{ value: string }>,
  blockedUsers: [] as Array<{ id: number }>,
  redisStore: new Map<string, string>(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    blockedUser: {
      findMany: vi.fn(async () => mockState.blockedIps),
    },
    user: {
      findMany: vi.fn(async () => mockState.blockedUsers),
    },
  },
}));

vi.mock('@/lib/redis', () => ({
  default: {
    get: vi.fn(async (key: string) => mockState.redisStore.get(key) ?? null),
    set: vi.fn(async (key: string, val: string) => {
      mockState.redisStore.set(key, val);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      for (const k of keys) mockState.redisStore.delete(k);
      return keys.length;
    }),
  },
}));

import {
  getIpSubnet,
  invalidateSecurityBlockCache,
  isIpBlocked,
  isLoopbackOrUnknownIp,
  isUserBlocked,
  matchesIpOrSubnet,
  normalizeIp,
} from '../ip-check';

describe('ip-check & real-time blocklist', () => {
  beforeEach(async () => {
    mockState.blockedIps = [];
    mockState.blockedUsers = [];
    mockState.redisStore.clear();
    await invalidateSecurityBlockCache();
  });

  it('normalizes IPv4-mapped IPv6, ports, and zone IDs', () => {
    expect(normalizeIp('::ffff:114.120.33.5')).toBe('114.120.33.5');
    expect(normalizeIp('114.120.33.5:54321')).toBe('114.120.33.5');
    expect(normalizeIp('fe80::1%eth0')).toBe('fe80::1');
    expect(normalizeIp('unknown')).toBe('');
  });

  it('identifies loopback and unknown IPs', () => {
    expect(isLoopbackOrUnknownIp('127.0.0.1')).toBe(true);
    expect(isLoopbackOrUnknownIp('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackOrUnknownIp('::1')).toBe(true);
    expect(isLoopbackOrUnknownIp('unknown')).toBe(true);
    expect(isLoopbackOrUnknownIp('114.120.33.5')).toBe(false);
  });

  it('computes /24 and /64 subnets for non-loopback IPs', () => {
    expect(getIpSubnet('114.120.33.5')).toBe('114.120.33.0/24');
    expect(getIpSubnet('::ffff:114.120.33.99')).toBe('114.120.33.0/24');
    expect(getIpSubnet('2404:c0:3561:fa1b::5')).toBe('2404:c0:3561:fa1b::/64');
    expect(getIpSubnet('127.0.0.1')).toBeNull();
  });

  it('matches exact IPs and IPv4/IPv6 CIDR subnets accurately', () => {
    expect(matchesIpOrSubnet('114.120.33.5', '114.120.33.5')).toBe(true);
    expect(matchesIpOrSubnet('::ffff:114.120.33.42', '114.120.33.0/24')).toBe(true);
    expect(matchesIpOrSubnet('114.120.34.42', '114.120.33.0/24')).toBe(false);
    expect(matchesIpOrSubnet('2404:c0:3561:fa1b:abcd::9', '2404:c0:3561:fa1b::/64')).toBe(true);
    expect(matchesIpOrSubnet('2404:c0:3561:fa1c::9', '2404:c0:3561:fa1b::/64')).toBe(false);
  });

  it('enforces IP/subnet and user blocking in real time after cache invalidation', async () => {
    expect(await isIpBlocked('114.120.33.88')).toBe(false);
    expect(await isUserBlocked(99)).toBe(false);

    mockState.blockedIps = [{ value: '114.120.33.0/24' }];
    mockState.blockedUsers = [{ id: 99 }];

    await invalidateSecurityBlockCache();

    expect(await isIpBlocked('::ffff:114.120.33.88')).toBe(true);
    expect(await isIpBlocked('114.120.33.1')).toBe(true);
    expect(await isUserBlocked(99)).toBe(true);

    mockState.blockedIps = [];
    mockState.blockedUsers = [];
    await invalidateSecurityBlockCache();

    expect(await isIpBlocked('114.120.33.88')).toBe(false);
    expect(await isUserBlocked(99)).toBe(false);
  });
});
