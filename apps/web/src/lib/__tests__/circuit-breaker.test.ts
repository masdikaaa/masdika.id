import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitBreakerTimeoutError,
  withCircuitBreaker,
  circuitBreakerRegistry,
} from '../circuit-breaker';

describe('Circuit Breaker & Graceful Degradation Engine', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      name: 'test_breaker',
      timeoutMs: 100, // 100ms for fast test execution
      errorThresholdPercentage: 50,
      volumeThreshold: 3,
      resetTimeoutMs: 200,
    });
  });

  it('should execute action successfully in CLOSED state', async () => {
    const result = await breaker.execute(async () => 'hello world');
    expect(result).toBe('hello world');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should timeout and throw CircuitBreakerTimeoutError when action is slow', async () => {
    await expect(
      breaker.execute(async () => {
        await new Promise((r) => setTimeout(r, 200));
        return 'too slow';
      })
    ).rejects.toThrow(CircuitBreakerTimeoutError);

    const stats = breaker.getStats();
    expect(stats.timeouts).toBe(1);
    expect(stats.failedCalls).toBe(1);
  });

  it('should invoke fallback gracefully when action fails', async () => {
    const result = await breaker.execute(
      async () => {
        throw new Error('Database connection failed');
      },
      (err) => {
        expect(err.message).toBe('Database connection failed');
        return 'cached_fallback_response';
      }
    );

    expect(result).toBe('cached_fallback_response');
    expect(breaker.getStats().fallbacksExecuted).toBe(1);
  });

  it('should trip to OPEN state when error threshold is exceeded', async () => {
    // 3 volume threshold, 50% error threshold.
    // 1st failure:
    await breaker.execute(async () => { throw new Error('fail 1'); }, () => 'fb');
    expect(breaker.getState()).toBe('CLOSED');

    // 2nd failure:
    await breaker.execute(async () => { throw new Error('fail 2'); }, () => 'fb');
    expect(breaker.getState()).toBe('CLOSED');

    // 3rd failure (hits volume 3, 100% fail rate -> Trips!):
    await breaker.execute(async () => { throw new Error('fail 3'); }, () => 'fb');
    expect(breaker.getState()).toBe('OPEN');
  });

  it('should fast-fail without touching action when circuit is OPEN', async () => {
    // Force trip
    for (let i = 0; i < 3; i++) {
      await breaker.execute(async () => { throw new Error('err'); }, () => 'fb');
    }
    expect(breaker.getState()).toBe('OPEN');

    let actionExecuted = false;
    const fallbackVal = await breaker.execute(
      async () => {
        actionExecuted = true;
        return 'live';
      },
      (err) => {
        expect(err).toBeInstanceOf(CircuitBreakerOpenError);
        return 'graceful_degraded_response';
      }
    );

    expect(actionExecuted).toBe(false); // Action was NOT called!
    expect(fallbackVal).toBe('graceful_degraded_response');
    expect(breaker.getStats().shortCircuitedCalls).toBe(1);
  });

  it('should transition to HALF_OPEN after reset timeout and re-close upon success', async () => {
    // Trip to OPEN
    for (let i = 0; i < 3; i++) {
      await breaker.execute(async () => { throw new Error('err'); }, () => 'fb');
    }
    expect(breaker.getState()).toBe('OPEN');

    // Advance clock past resetTimeoutMs (200ms)
    await new Promise((r) => setTimeout(r, 250));

    expect(breaker.getState()).toBe('HALF_OPEN');

    // Trial probe succeeds
    const recoveryRes = await breaker.execute(async () => 'recovered!');
    expect(recoveryRes).toBe('recovered!');
    expect(breaker.getState()).toBe('CLOSED'); // Back to healthy!
  });

  it('should export valid Prometheus metrics string', () => {
    const metrics = circuitBreakerRegistry.toPrometheusMetrics();
    const joined = metrics.join('\n');

    expect(joined).toContain('circuit_breaker_state');
    expect(joined).toContain('circuit_breaker_tripped_total');
    expect(joined).toContain('circuit_breaker_fallback_total');
  });

  it('should support withCircuitBreaker helper', async () => {
    const res = await withCircuitBreaker(
      'mock_api',
      async () => 'mock_data',
      () => 'fallback'
    );
    expect(res).toBe('mock_data');
  });
});

