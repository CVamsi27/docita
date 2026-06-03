import { Injectable } from '@nestjs/common';
import { CircuitBreaker, type CircuitBreakerOptions } from './circuit-breaker';

const _BREAKER_NAMES = [
  'whatsapp-meta-api',
  'razorpay-api',
  'zeptomail-api',
  'openai-api',
  'nlm-coding-api',
  'licensed-cpt-api',
  'turnstile-api',
  'doctor-verify-api',
  'ops-alert-webhook',
] as const;

type BreakerName = (typeof _BREAKER_NAMES)[number];

const DEFAULT_BREAKER_CONFIGS: Record<
  BreakerName,
  Partial<CircuitBreakerOptions>
> = {
  'whatsapp-meta-api': {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  'razorpay-api': {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  'zeptomail-api': {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  'openai-api': { failureThreshold: 5, successThreshold: 2, timeoutMs: 30_000 },
  'nlm-coding-api': {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  'licensed-cpt-api': {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  'turnstile-api': {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  'doctor-verify-api': {
    failureThreshold: 5,
    successThreshold: 2,
    timeoutMs: 30_000,
  },
  'ops-alert-webhook': {
    failureThreshold: 3,
    successThreshold: 1,
    timeoutMs: 10_000,
  },
};

@Injectable()
export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  get(name: BreakerName): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      const config = DEFAULT_BREAKER_CONFIGS[name];
      breaker = new CircuitBreaker({ name, ...config });
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  getAllStates(): Array<{
    name: string;
    state: string;
    metrics: ReturnType<CircuitBreaker['getMetrics']>;
  }> {
    return Array.from(this.breakers.entries()).map(([name, breaker]) => ({
      name,
      state: breaker.getState(),
      metrics: breaker.getMetrics(),
    }));
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}
