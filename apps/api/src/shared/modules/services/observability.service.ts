import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ErrorSeverity } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface MetricEntry {
  name: string;
  value: number | number[];
  labels?: Record<string, string>;
  timestamp: number;
}

function toSentryContextValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }

  return { value };
}

function getRecordStatus(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const status = (value as { status?: unknown }).status;
  return typeof status === 'string' ? status : undefined;
}

function getRecordString(
  value: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const field = value?.[key];
  return typeof field === 'string' ? field : undefined;
}

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private metricsBuffer: Map<string, MetricEntry> = new Map();
  private readonly METRICS_FLUSH_INTERVAL = 60000;

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
  ) {
    this.startMetricsFlushing();
  }

  initializeSentry(options?: Sentry.NodeOptions): void {
    const sentryConfig = this.configService.getSentryConfig();
    const nodeEnv = this.configService.getEnvironment();

    if (!sentryConfig.dsn) {
      this.logger.warn('SENTRY_DSN not configured. Error tracking disabled.');
      return;
    }

    Sentry.init({
      dsn: sentryConfig.dsn,
      environment: nodeEnv,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      profilesSampleRate: sentryConfig.profilesSampleRate,
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      integrations: [],
      initialScope: {
        tags: {
          service: 'docita-api',
          version: this.configService.getAppVersion(),
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
          scope.setContext(key, toSentryContextValue(value));
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
          scope.setContext(key, toSentryContextValue(value));
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
    const correlationId = getRecordString(requestContext, 'id') || 'unknown';

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId,
      service: 'docita-api',
      ...metadata,
    };

    if (level !== 'debug') {
      void this.persistStructuredLog(level, message, correlationId, metadata);
    }

    if (level === 'warn' || level === 'error') {
      const sentryLevel = level === 'warn' ? 'warning' : 'error';
      this.captureMessage(message, { ...logEntry }, sentryLevel);
    }
  }

  private mapSeverity(level: 'debug' | 'info' | 'warn' | 'error') {
    switch (level) {
      case 'debug':
        return ErrorSeverity.DEBUG;
      case 'warn':
        return ErrorSeverity.WARNING;
      case 'error':
        return ErrorSeverity.ERROR;
      default:
        return ErrorSeverity.INFO;
    }
  }

  private async persistStructuredLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    correlationId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const rawPath = metadata?.['path'];
    const rawMethod = metadata?.['method'];

    await this.prisma.errorLog
      .create({
        data: {
          type: `Observability:${level.toUpperCase()}`,
          message: message.slice(0, 1000),
          path: typeof rawPath === 'string' ? rawPath : undefined,
          method: typeof rawMethod === 'string' ? rawMethod : 'OBSERVABILITY',
          severity: this.mapSeverity(level),
          metadata: {
            source: 'api-observability',
            correlationId,
            level,
            service: 'docita-api',
            ...(metadata ?? {}),
          },
        },
      })
      .catch((error) => {
        this.logger.warn(
          `Failed to persist structured log: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      });
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
    const existingValue = this.metricsBuffer.get(percentileKey)?.value;
    const latencies: number[] = Array.isArray(existingValue)
      ? [...existingValue]
      : [];
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

    const dbConnected = getRecordStatus(checks.database) === 'connected';
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
