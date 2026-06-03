import { Counter, Gauge, register } from 'prom-client';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  name: string;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  timeoutMs: 30_000,
  name: 'unnamed',
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  private readonly stateGauge: Gauge<string>;
  private readonly failureCounter: Counter<string>;
  private readonly successCounter: Counter<string>;
  private readonly rejectionCounter: Counter<string>;

  constructor(opts?: Partial<CircuitBreakerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...opts };
    const n = this.options.name;

    const stateExisting = register.getSingleMetric(`cb_state_${n}`);
    this.stateGauge =
      stateExisting instanceof Gauge
        ? stateExisting
        : new Gauge({
            name: `cb_state_${n}`,
            help: `Circuit breaker state for ${n} (0=CLOSED, 1=HALF_OPEN, 2=OPEN)`,
          });

    const failExisting = register.getSingleMetric(`cb_failures_total_${n}`);
    this.failureCounter =
      failExisting instanceof Counter
        ? failExisting
        : new Counter({
            name: `cb_failures_total_${n}`,
            help: `Total circuit breaker failures for ${n}`,
          });

    const successExisting = register.getSingleMetric(`cb_successes_total_${n}`);
    this.successCounter =
      successExisting instanceof Counter
        ? successExisting
        : new Counter({
            name: `cb_successes_total_${n}`,
            help: `Total circuit breaker successes for ${n}`,
          });

    const rejectExisting = register.getSingleMetric(`cb_rejections_total_${n}`);
    this.rejectionCounter =
      rejectExisting instanceof Counter
        ? rejectExisting
        : new Counter({
            name: `cb_rejections_total_${n}`,
            help: `Total requests rejected by open circuit breaker for ${n}`,
          });
  }

  getState(): CircuitState {
    return this.state;
  }

  async call<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.timeoutMs) {
        this.state = 'HALF_OPEN';
        this.stateGauge.set(1);
      } else {
        this.rejectionCounter.inc();
        if (fallback) return fallback();
        throw new Error(`Circuit breaker OPEN for ${this.options.name}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return fallback();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.reset();
      }
    } else {
      this.reset();
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.failureCounter.inc();
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.stateGauge.set(2);
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.stateGauge.set(0);
  }

  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
