import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppConfigService } from '../config/app-configuration.service';

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private metricsBuffer: Map<string, any> = new Map();
  private readonly METRICS_FLUSH_INTERVAL = 60000;

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
  ) {
    this.startMetricsFlushing();
  }

  initializeSentry(options?: Sentry.NodeOptions): void {
    const config = this.configService.getConfig();
    const sentryDsn = config.SENTRY_DSN;

    if (!sentryDsn) {
      this.logger.warn('SENTRY_DSN not configured. Error tracking disabled.');
      return;
    }

    Sentry.init({
      dsn: sentryDsn,
      environment: config.NODE_ENV,
      tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: config.SENTRY_PROFILES_SAMPLE_RATE,
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      integrations: [],
      initialScope: {
        tags: {
          service: 'docita-api',
          version: config.APP_VERSION,
        },
      },
      ...options,
    });

    this.logger.debug('Sentry initialized');
  }

  captureException(
    error: unknown,
    context?: Record<string, unknown> | string,
    level: Sentry.SeverityLevel = 'error',
  ): void {
    const normalizedContext =
      typeof context === 'string' ? { correlationId: context } : context;
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (normalizedContext) {
        Object.entries(normalizedContext).forEach(([key, value]) => {
          scope.setContext(key, value as any);
        });
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(
    message: string,
    context?: Record<string, unknown> | string,
    level: Sentry.SeverityLevel = 'info',
  ): void {
    const normalizedContext =
      typeof context === 'string' ? { correlationId: context } : context;
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (normalizedContext) {
        Object.entries(normalizedContext).forEach(([key, value]) => {
          scope.setContext(key, value as any);
        });
      }
      Sentry.captureMessage(message);
    });
  }

  logStructured(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const scope = Sentry.getCurrentScope();
    const requestContext = scope?.getScopeData()?.contexts?.request as
      | Record<string, unknown>
      | undefined;
    const correlationId = (requestContext?.id as string) || 'unknown';

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId,
      service: 'docita-api',
      ...metadata,
    };

    console.log(JSON.stringify(logEntry));

    if (level === 'warn' || level === 'error') {
      const sentryLevel = level === 'warn' ? 'warning' : 'error';
      this.captureMessage(message, { ...logEntry }, sentryLevel);
    }
  }

  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string> | string,
  ): void {
    const normalizedLabels =
      typeof labels === 'string' ? { label: labels } : labels;

    const key = normalizedLabels
      ? `${name}{${Object.entries(normalizedLabels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')}}`
      : name;

    this.metricsBuffer.set(key, {
      name,
      value,
      labels: normalizedLabels,
      timestamp: Date.now(),
    });
  }

  recordRequestLatency(
    endpoint: string,
    method: string,
    statusCode: number,
    durationMs: number,
  ): void {
    this.recordMetric('http_request_duration_ms', durationMs, {
      endpoint,
      method,
      status: String(statusCode),
    });

    const percentileKey = `${endpoint}_${method}_${statusCode}`;
    const latencies: number[] = JSON.parse(
      (this.metricsBuffer.get(percentileKey)?.value as string) ?? '[]',
    );
    latencies.push(durationMs);

    if (latencies.length > 1000) {
      latencies.shift();
    }

    this.recordMetric('request_latencies', latencies.length, {
      endpoint,
      method,
      status: String(statusCode),
    });
  }

  recordDatabaseQueryDuration(
    operation: string,
    durationMs: number,
    success: boolean,
  ): void {
    this.recordMetric('db_query_duration_ms', durationMs, {
      operation,
      status: success ? 'success' : 'error',
    });
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, unknown>;
  }> {
    const checks: Record<string, unknown> = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB timeout')), 5000),
        ),
      ]);
      checks.database = { status: 'connected', checked_at: new Date() };
    } catch (error) {
      checks.database = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const dbConnected =
      (checks.database as Record<string, unknown>)?.status === 'connected';
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (dbConnected) {
      status = 'healthy';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }

  async getDatabaseHealth(): Promise<Record<string, unknown>> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT
          (SELECT count(*) FROM "User") as user_count,
          (SELECT count(*) FROM "Clinic") as clinic_count,
          (SELECT count(*) FROM "Appointment") as appointment_count,
          (SELECT count(*) FROM "Patient") as patient_count,
          (SELECT extract(epoch from (now() - max(pg_postmaster_start_time()))) / 3600 as uptime_hours
            FROM pg_postmaster_start_time())
      `;

      return {
        status: 'connected',
        stats: result,
        checked_at: new Date(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        checked_at: new Date(),
      };
    }
  }

  getMetricsSummary(): Record<string, unknown> {
    const metrics: Record<string, unknown> = {};

    for (const [key, value] of this.metricsBuffer.entries()) {
      metrics[key] = value;
    }

    return metrics;
  }

  private clearOldMetrics(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000;

    for (const [key, metric] of this.metricsBuffer.entries()) {
      if (now - metric.timestamp > maxAge) {
        this.metricsBuffer.delete(key);
      }
    }
  }

  private startMetricsFlushing(): void {
    setInterval(() => {
      this.clearOldMetrics();
      this.logStructured('debug', 'Metrics buffer size', {
        size: this.metricsBuffer.size,
      });
    }, this.METRICS_FLUSH_INTERVAL);
  }

  sendHeartbeat(): void {
    Sentry.captureMessage('Heartbeat', 'info');
  }

  async flush(timeout: number = 2000): Promise<boolean> {
    try {
      await Sentry.close(timeout);
      return true;
    } catch (error) {
      this.logger.error(
        'Error flushing Sentry:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return false;
    }
  }
}
