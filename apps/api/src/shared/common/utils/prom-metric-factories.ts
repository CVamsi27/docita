import { Counter, Gauge, Histogram, register } from 'prom-client';

/**
 * Idempotent prom-client metric constructors shared by every metrics service
 * (`WorkerMetricsService`, `BusinessMetricsService`, ...). Each returns the
 * already-registered metric of the expected type when one exists — guarding
 * against `prom-client`'s "metric already registered" error when a service is
 * instantiated more than once (e.g. in tests, or across module re-imports).
 */

export const ensureCounter = (
  name: string,
  help: string,
  labelNames: readonly string[],
): Counter<string> => {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Counter) return existing;
  return new Counter({ name, help, labelNames: [...labelNames] });
};

export const ensureHistogram = (
  name: string,
  help: string,
  labelNames: readonly string[],
  buckets: readonly number[],
): Histogram<string> => {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Histogram) return existing;
  return new Histogram({
    name,
    help,
    labelNames: [...labelNames],
    buckets: [...buckets],
  });
};

export const ensureGauge = (
  name: string,
  help: string,
  labelNames: readonly string[],
): Gauge<string> => {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Gauge) return existing;
  return new Gauge({ name, help, labelNames: [...labelNames] });
};
