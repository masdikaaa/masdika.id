import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userHasActiveVps, cleanupUserCloudflareResourcesIfNoActiveVps } from '../cloudflare-cleanup';
import { prisma } from '@/lib/prisma';
import { sendCloudflareCleanupEmail } from '@/lib/email';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    vpsService: {
      count: vi.fn(),
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
  sendCloudflareCleanupEmail: vi.fn(),
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

  describe('cleanupUserCloudflareResourcesIfNoActiveVps', () => {
    it('should PRESERVE tunnels and domains if user still has an active VPS (even if VPS is offline/stopped)', async () => {
      // User has 1 active VPS
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(1);

      const result = await cleanupUserCloudflareResourcesIfNoActiveVps(103);

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

    it('should AUTOMATICALLY DELETE tunnels and domains if user has NO active VPS (e.g. terminated)', async () => {
      // User has NO active VPS
      vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(0);

      // Mock user tunnels
      vi.mocked(prisma.cloudflareTunnel.findMany).mockResolvedValueOnce([
        { id: 1, cfTunnelId: 'cf-tunnel-uuid-1', name: 'my-tunnel', userId: 104 } as any,
      ]);
      vi.mocked(prisma.cloudflareTunnel.delete).mockResolvedValueOnce({} as any);

      // Mock user domains
      vi.mocked(prisma.cloudflareDomain.findMany).mockResolvedValueOnce([
        {
          id: 10,
          cfZoneId: 'cf-zone-id-1',
          domain: 'example.com',
          userId: 104,
          user: { email: 'user@example.com', name: 'User Test' },
        } as any,
      ]);
      vi.mocked(prisma.cloudflareDomain.delete).mockResolvedValueOnce({} as any);

      const result = await cleanupUserCloudflareResourcesIfNoActiveVps(104);

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

