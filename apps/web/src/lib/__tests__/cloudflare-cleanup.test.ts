import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userHasActiveVps, userVpsGracePeriodExpired, cleanupUserCloudflareResourcesIfNoActiveVps } from '../cloudflare-cleanup';
import { prisma } from '@/lib/prisma';
import { sendCloudflareCleanupEmail } from '@/lib/email';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vpsService: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    cloudflareTunnel: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    cloudflareDomain: {
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email', () => ({
  sendCloudflareCleanupEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('Cloudflare Lifecycle & Auto-Cleanup - cloudflare-cleanup.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);
  });

  describe('userHasActiveVps', () => {
    it('should return true when user has at least one active / stopped VPS (not terminated)', async () => {
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(1);

      const result = await userHasActiveVps(101);
      expect(result).toBe(true);
      expect(prisma.vpsService.count).toHaveBeenCalledWith({
        where: {
          userId: 101,
          status: { notIn: ['TERMINATED', 'TERMINATING'] },
        },
      });
    });

    it('should return false when user has 0 non-terminated VPS (all terminated or none)', async () => {
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(0);

      const result = await userHasActiveVps(102);
      expect(result).toBe(false);
    });
  });

  describe('userVpsGracePeriodExpired', () => {
    it('should return false if user still has an active VPS', async () => {
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(1);

      const result = await userVpsGracePeriodExpired(103, 3);
      expect(result).toBe(false);
    });

    it('should return false if user VPS was terminated recently (< 3 days ago)', async () => {
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(0);
      // Recently terminated VPS found
      vi.mocked(prisma.vpsService.findFirst).mockResolvedValueOnce({
        id: 99,
        userId: 104,
        status: 'TERMINATED',
        terminationDate: new Date(),
      } as any);

      const result = await userVpsGracePeriodExpired(104, 3);
      expect(result).toBe(false); // Still within 3-day grace period
    });

    it('should return true if user has no active VPS and termination happened > 3 days ago', async () => {
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(0);
      // No recently terminated VPS (terminated > 3 days ago or never had VPS)
      vi.mocked(prisma.vpsService.findFirst).mockResolvedValueOnce(null);

      const result = await userVpsGracePeriodExpired(105, 3);
      expect(result).toBe(true); // Grace period expired!
    });
  });

  describe('cleanupUserCloudflareResourcesIfNoActiveVps', () => {
    it('should PRESERVE tunnels and domains if user still has an active VPS (even if VPS is offline/stopped)', async () => {
      // User has 1 active VPS
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(1);

      const result = await cleanupUserCloudflareResourcesIfNoActiveVps(106);

      expect(result.skipped).toBe(true);
      expect(result.deletedTunnels).toBe(0);
      expect(result.deletedDomains).toBe(0);

      // Verify no deletion was called on tunnels or domains
      expect(prisma.cloudflareTunnel.findMany).not.toHaveBeenCalled();
      expect(prisma.cloudflareTunnel.delete).not.toHaveBeenCalled();
      expect(prisma.cloudflareDomain.findMany).not.toHaveBeenCalled();
      expect(prisma.cloudflareDomain.delete).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should PRESERVE tunnels and domains during the 3-day grace period after VPS termination', async () => {
      // User has 0 active VPS
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(0);
      // But VPS was terminated within the last 3 days
      vi.mocked(prisma.vpsService.findFirst).mockResolvedValueOnce({
        id: 101,
        status: 'TERMINATED',
        terminationDate: new Date(),
      } as any);

      const result = await cleanupUserCloudflareResourcesIfNoActiveVps(107, { enforceGracePeriod: true });

      expect(result.skipped).toBe(true);
      expect(result.deletedTunnels).toBe(0);
      expect(result.deletedDomains).toBe(0);
      expect(result.message).toContain('3-day termination grace period');
      expect(prisma.cloudflareTunnel.delete).not.toHaveBeenCalled();
    });

    it('should AUTOMATICALLY DELETE tunnels and domains AFTER 3-day grace period expires', async () => {
      // User has NO active VPS
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(0);
      // No recently terminated VPS (grace period expired)
      vi.mocked(prisma.vpsService.findFirst).mockResolvedValueOnce(null);

      // Mock user tunnels
      vi.mocked(prisma.cloudflareTunnel.findMany).mockResolvedValueOnce([
        { id: 1, cfTunnelId: 'cf-tunnel-uuid-1', name: 'my-tunnel', userId: 108 } as any,
      ]);
      vi.mocked(prisma.cloudflareTunnel.delete).mockResolvedValueOnce({} as any);

      // Mock user domains
      vi.mocked(prisma.cloudflareDomain.findMany).mockResolvedValueOnce([
        {
          id: 10,
          cfZoneId: 'cf-zone-id-1',
          domain: 'example.com',
          userId: 108,
          user: { email: 'user@example.com', name: 'User Test' },
        } as any,
      ]);
      vi.mocked(prisma.cloudflareDomain.delete).mockResolvedValueOnce({} as any);

      const result = await cleanupUserCloudflareResourcesIfNoActiveVps(108);

      expect(result.skipped).toBe(false);
      expect(result.deletedTunnels).toBe(1);
      expect(result.deletedDomains).toBe(1);

      // Cloudflare API calls
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cfd_tunnel/cf-tunnel-uuid-1'),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/zones/cf-zone-id-1'),
        expect.objectContaining({ method: 'DELETE' })
      );

      // Database delete calls
      expect(prisma.cloudflareTunnel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.cloudflareDomain.delete).toHaveBeenCalledWith({ where: { id: 10 } });

      // Email notification
      expect(sendCloudflareCleanupEmail).toHaveBeenCalledWith(
        'user@example.com',
        'User Test',
        'example.com',
        expect.any(String)
      );
    });
  });
});
