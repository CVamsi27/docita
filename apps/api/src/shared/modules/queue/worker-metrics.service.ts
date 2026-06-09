import { Injectable } from '@nestjs/common';
import {
  ensureCounter,
  ensureGauge,
  ensureHistogram,
} from '@/shared/common/utils/prom-metric-factories';

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
