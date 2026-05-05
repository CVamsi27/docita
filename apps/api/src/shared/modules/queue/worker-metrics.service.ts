import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

const ensureCounter = (
  name: string,
  help: string,
  labelNames: readonly string[],
): Counter<string> => {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Counter) return existing as Counter<string>;
  return new Counter({ name, help, labelNames: [...labelNames] });
};

const ensureHistogram = (
  name: string,
  help: string,
  labelNames: readonly string[],
  buckets: readonly number[],
): Histogram<string> => {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Histogram) return existing as Histogram<string>;
  return new Histogram({
    name,
    help,
    labelNames: [...labelNames],
    buckets: [...buckets],
  });
};

const ensureGauge = (
  name: string,
  help: string,
  labelNames: readonly string[],
): Gauge<string> => {
  const existing = register.getSingleMetric(name);
  if (existing instanceof Gauge) return existing as Gauge<string>;
  return new Gauge({ name, help, labelNames: [...labelNames] });
};

@Injectable()
export class WorkerMetricsService {
  private readonly jobsTotal = ensureCounter(
    'worker_jobs_total',
    'Total worker jobs processed by queue and final status',
    ['queue', 'status'],
  );

  private readonly jobDuration = ensureHistogram(
    'worker_job_duration_seconds',
    'Worker job processing duration in seconds, by queue',
    ['queue'],
    [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
  );

  private readonly dlqSize = ensureGauge(
    'worker_dlq_size',
    'Number of dead-lettered worker jobs by queue',
    ['queue'],
  );

  observeJobCompletion(queue: string, status: string): void {
    this.jobsTotal.inc({ queue, status });
  }

  observeJobDuration(queue: string, durationSeconds: number): void {
    this.jobDuration.observe({ queue }, durationSeconds);
  }

  setDlqSize(queue: string, size: number): void {
    this.dlqSize.set({ queue }, size);
  }
}
