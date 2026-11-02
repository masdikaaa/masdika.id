/**
 * Enterprise Circuit Breaker & Graceful Degradation Engine (Gojek / Netflix Hystrix pattern).
 *
 * Prevents cascading failures when downstream dependencies (PostgreSQL, Redis, AI, Payments)
 * slow down or experience intermittent outages.
 *
 * States:
 * - CLOSED: Everything healthy, all calls pass through.
 * - OPEN: Circuit tripped after failure threshold. Fails fast immediately with fallback.
 * - HALF_OPEN: Trial period. Tests single probe request to check if downstream recovered.
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  timeoutMs?: number;               // Maximum time before a call is aborted (default: 4000ms)
  errorThresholdPercentage?: number;// Percentage of failed calls before tripping (default: 50%)
  volumeThreshold?: number;         // Minimum requests required before tripping (default: 5)
  resetTimeoutMs?: number;          // Time to wait in OPEN state before trying HALF_OPEN (default: 10000ms)
}

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly breakerName: string) {
    super(`[CircuitBreaker:${breakerName}] Circuit is OPEN (Fast-failed to protect system)`);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreakerTimeoutError extends Error {
  constructor(public readonly breakerName: string, public readonly timeoutMs: number) {
    super(`[CircuitBreaker:${breakerName}] Operation timed out after ${timeoutMs}ms`);
    this.name = 'CircuitBreakerTimeoutError';
  }
}

export class CircuitBreaker {
  public readonly name: string;
  public readonly timeoutMs: number;
  public readonly errorThresholdPercentage: number;
  public readonly volumeThreshold: number;
  public readonly resetTimeoutMs: number;

  private state: CircuitBreakerState = 'CLOSED';
  private nextAttempt: number = 0;
  
  // Rolling stats
  private successfulCalls = 0;
  private failedCalls = 0;
  private timeouts = 0;
  private shortCircuitedCalls = 0;
  private fallbacksExecuted = 0;
  private totalTrips = 0;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.timeoutMs = options.timeoutMs ?? 4000;
    this.errorThresholdPercentage = options.errorThresholdPercentage ?? 50;
    this.volumeThreshold = options.volumeThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
  }

  public getState(): CircuitBreakerState {
    if (this.state === 'OPEN' && Date.now() >= this.nextAttempt) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  public getStats() {
    return {
      name: this.name,
      state: this.getState(),
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      timeouts: this.timeouts,
      shortCircuitedCalls: this.shortCircuitedCalls,
      fallbacksExecuted: this.fallbacksExecuted,
      totalTrips: this.totalTrips,
    };
  }

  /** Force reset for testing or admin overrides */
  public reset() {
    this.state = 'CLOSED';
    this.nextAttempt = 0;
    this.successfulCalls = 0;
    this.failedCalls = 0;
    this.timeouts = 0;
  }

  /**
   * Executes an async action protected by the circuit breaker with timeout and fallback.
   */
  public async execute<T>(
    action: () => Promise<T>,
    fallback?: (error: Error) => Promise<T> | T
  ): Promise<T> {
    const currentState = this.getState();

    // If circuit is OPEN, fail fast immediately
    if (currentState === 'OPEN') {
      this.shortCircuitedCalls++;
      const err = new CircuitBreakerOpenError(this.name);
      if (fallback) {
        this.fallbacksExecuted++;
        return await fallback(err);
      }
      throw err;
    }

    // Execute with timeout race
    let timeoutTimer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        this.timeouts++;
        reject(new CircuitBreakerTimeoutError(this.name, this.timeoutMs));
      }, this.timeoutMs);
    });

    try {
      const result = await Promise.race([action(), timeoutPromise]);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      this.onSuccess();
      return result;
    } catch (err: any) {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      this.onFailure(err);

      if (fallback) {
        this.fallbacksExecuted++;
        return await fallback(err);
      }
      throw err;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      // Downstream recovered! Re-close circuit
      this.state = 'CLOSED';
      this.successfulCalls = 0;
      this.failedCalls = 0;
      this.timeouts = 0;
    } else {
      this.successfulCalls++;
    }
  }

  private onFailure(error: Error) {
    if (this.state === 'HALF_OPEN') {
      // Trial call failed: trip back to OPEN immediately
      this.trip();
      return;
    }

    this.failedCalls++;
    const totalCalls = this.successfulCalls + this.failedCalls;

    if (totalCalls >= this.volumeThreshold) {
      const errorRate = (this.failedCalls / totalCalls) * 100;
      if (errorRate >= this.errorThresholdPercentage) {
        this.trip();
      }
    }
  }

  private trip() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.resetTimeoutMs;
    this.totalTrips++;
    console.warn(`[CircuitBreaker:${this.name}] 🚨 Circuit TRIPPED to OPEN state! Next retry at ${new Date(this.nextAttempt).toISOString()}`);
  }
}

// Global registry of breakers across the application
class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  public getOrCreate(name: string, options: Partial<CircuitBreakerOptions> = {}): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker({ name, ...options });
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  public getAll(): CircuitBreaker[] {
    return Array.from(this.breakers.values());
  }

  /**
   * Generates Prometheus exposition format metrics for all registered circuit breakers.
   */
  public toPrometheusMetrics(): string[] {
    const lines: string[] = [
      '# HELP circuit_breaker_state Current state of circuit breaker (0=CLOSED, 1=HALF_OPEN, 2=OPEN).',
      '# TYPE circuit_breaker_state gauge',
      '# HELP circuit_breaker_tripped_total Total times the circuit breaker has tripped to OPEN.',
      '# TYPE circuit_breaker_tripped_total counter',
      '# HELP circuit_breaker_fallback_total Total times a graceful fallback response was served.',
      '# TYPE circuit_breaker_fallback_total counter',
      '# HELP circuit_breaker_calls_total Total calls processed by circuit breaker.',
      '# TYPE circuit_breaker_calls_total counter',
    ];

    for (const breaker of this.breakers.values()) {
      const stats = breaker.getStats();
      const stateNumeric = stats.state === 'CLOSED' ? 0 : stats.state === 'HALF_OPEN' ? 1 : 2;

      lines.push(`circuit_breaker_state{name="${stats.name}"} ${stateNumeric}`);
      lines.push(`circuit_breaker_tripped_total{name="${stats.name}"} ${stats.totalTrips}`);
      lines.push(`circuit_breaker_fallback_total{name="${stats.name}"} ${stats.fallbacksExecuted}`);
      lines.push(`circuit_breaker_calls_total{name="${stats.name}",status="success"} ${stats.successfulCalls}`);
      lines.push(`circuit_breaker_calls_total{name="${stats.name}",status="failure"} ${stats.failedCalls}`);
      lines.push(`circuit_breaker_calls_total{name="${stats.name}",status="timeout"} ${stats.timeouts}`);
      lines.push(`circuit_breaker_calls_total{name="${stats.name}",status="short_circuited"} ${stats.shortCircuitedCalls}`);
    }

    return lines;
  }
}

export const circuitBreakerRegistry = new CircuitBreakerManager();

// Pre-configured shared circuit breakers
export const dbCircuitBreaker = circuitBreakerRegistry.getOrCreate('database', {
  timeoutMs: 4000,
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  resetTimeoutMs: 10000,
});

export const redisCircuitBreaker = circuitBreakerRegistry.getOrCreate('redis', {
  timeoutMs: 2000,
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  resetTimeoutMs: 10000,
});

export const externalApiCircuitBreaker = circuitBreakerRegistry.getOrCreate('external_api', {
  timeoutMs: 5000,
  errorThresholdPercentage: 50,
  volumeThreshold: 5,
  resetTimeoutMs: 15000,
});

/**
 * Convenience helper to execute any async operation protected by circuit breaker.
 */
export async function withCircuitBreaker<T>(
  name: string,
  action: () => Promise<T>,
  fallback?: (error: Error) => Promise<T> | T,
  options?: Partial<CircuitBreakerOptions>
): Promise<T> {
  const breaker = circuitBreakerRegistry.getOrCreate(name, options);
  return breaker.execute(action, fallback);
}
