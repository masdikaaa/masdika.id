import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  acquireConcurrencySlot,
  releaseConcurrencySlot,
  getAiGatewayConfig,
  invalidateAiGatewayConfigCache,
  getAiModelCached,
  invalidateAiModelCache,
  aiUpstreamCircuitBreaker,
  ensureAiModelsExist,
} from '../ai-gateway';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    setting: {
      findMany: vi.fn(),
    },
    aiModel: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    aiGatewayKey: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('../redis', () => ({
  redis: null, // Test in-memory fallback concurrency & resilience path
}));

describe('AI Gateway High-Concurrency & Resilience Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateAiGatewayConfigCache();
    invalidateAiModelCache();
    aiUpstreamCircuitBreaker.reset();
  });

  describe('Fair-Share Concurrency Limiter', () => {
    it('allows up to maxConcurrent in-flight requests and rejects excess requests', async () => {
      const userKey = 'test_user_concurrency_1';
      const limit = 3;

      expect(await acquireConcurrencySlot(userKey, limit)).toBe(true);
      expect(await acquireConcurrencySlot(userKey, limit)).toBe(true);
      expect(await acquireConcurrencySlot(userKey, limit)).toBe(true);

      // 4th concurrent request exceeds ceiling
      expect(await acquireConcurrencySlot(userKey, limit)).toBe(false);

      // Releasing one slot allows the next request to proceed
      await releaseConcurrencySlot(userKey);
      expect(await acquireConcurrencySlot(userKey, limit)).toBe(true);
      expect(await acquireConcurrencySlot(userKey, limit)).toBe(false);

      // Cleanup
      await releaseConcurrencySlot(userKey);
      await releaseConcurrencySlot(userKey);
      await releaseConcurrencySlot(userKey);
    });
  });

  describe('Config & Model In-Memory Caching (Database Protection)', () => {
    it('caches getAiGatewayConfig in memory and does not hit DB on subsequent calls', async () => {
      (prisma.setting.findMany as any).mockResolvedValueOnce([
        { key: 'ai_gateway_enabled', value: 'true' },
        { key: 'ai_gateway_markup_percent', value: '15' },
      ]);

      const config1 = await getAiGatewayConfig();
      expect(config1.enabled).toBe(true);
      expect(config1.markupPercent).toBe(15);
      expect(prisma.setting.findMany).toHaveBeenCalledTimes(1);

      // Second call should return from cache with zero DB queries
      const config2 = await getAiGatewayConfig();
      expect(config2.markupPercent).toBe(15);
      expect(prisma.setting.findMany).toHaveBeenCalledTimes(1);

      // Invalidation forces DB reload
      invalidateAiGatewayConfigCache();
      (prisma.setting.findMany as any).mockResolvedValueOnce([
        { key: 'ai_gateway_enabled', value: 'true' },
        { key: 'ai_gateway_markup_percent', value: '25' },
      ]);

      const config3 = await getAiGatewayConfig();
      expect(config3.markupPercent).toBe(25);
      expect(prisma.setting.findMany).toHaveBeenCalledTimes(2);
    });

    it('caches getAiModelCached in memory avoiding repeated Prisma findUnique lookups', async () => {
      (prisma.aiModel.findUnique as any).mockResolvedValueOnce({
        id: 1,
        modelId: 'deepseek-v4.1-flash',
        name: 'DeepSeek V4.1 Flash',
        isActive: true,
      });

      const m1 = await getAiModelCached('deepseek-v4.1-flash');
      expect(m1?.name).toBe('DeepSeek V4.1 Flash');
      expect(prisma.aiModel.findUnique).toHaveBeenCalledTimes(1);

      // 2nd call uses cache
      const m2 = await getAiModelCached('deepseek-v4.1-flash');
      expect(m2?.name).toBe('DeepSeek V4.1 Flash');
      expect(prisma.aiModel.findUnique).toHaveBeenCalledTimes(1);

      // Invalidation
      invalidateAiModelCache('deepseek-v4.1-flash');
      (prisma.aiModel.findUnique as any).mockResolvedValueOnce({
        id: 1,
        modelId: 'deepseek-v4.1-flash',
        name: 'DeepSeek V4.1 Flash (Updated)',
        isActive: true,
      });

      const m3 = await getAiModelCached('deepseek-v4.1-flash');
      expect(m3?.name).toBe('DeepSeek V4.1 Flash (Updated)');
      expect(prisma.aiModel.findUnique).toHaveBeenCalledTimes(2);
    });

    it('throttles ensureAiModelsExist so it skips DB writes during heavy request bursts', async () => {
      (prisma.aiModel.count as any).mockResolvedValue(10);
      (prisma.aiModel.findMany as any).mockResolvedValue([]);
      (prisma.aiModel.updateMany as any).mockResolvedValue({ count: 0 });

      await ensureAiModelsExist(true); // force first run
      expect(prisma.aiModel.count).toHaveBeenCalledTimes(1);

      // Immediate subsequent calls should be throttled and skip count
      await ensureAiModelsExist(false);
      await ensureAiModelsExist(false);
      expect(prisma.aiModel.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('Circuit Breaker Protection', () => {
    it('trips to OPEN state after consecutive upstream failures and fast-fails', () => {
      expect(aiUpstreamCircuitBreaker.getState()).toBe('CLOSED');

      // Record failures beyond threshold
      for (let i = 0; i < 7; i++) {
        aiUpstreamCircuitBreaker.recordFailure(new Error('Helipod 503 Service Unavailable'));
      }

      expect(aiUpstreamCircuitBreaker.getState()).toBe('OPEN');
    });
  });
});
