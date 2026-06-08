import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import * as Sentry from '@sentry/nestjs';
import { ErrorSeverity } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { createSentryBeforeSend } from '@/shared/modules/error-handling/sentry.utils';
import {
  getRecordStatus,
  getRecordString,
  isRecord,
  mapLogLevelToErrorSeverity,
  toSentryContextValue,
  type MetricEntry,
  type StructuredLogOptions,
} from './observability.helpers';

@Injectable()
export class ObservabilityService implements OnModuleDestroy {
  private readonly logger = new Logger(ObservabilityService.name);
  private metricsBuffer: Map<string, MetricEntry> = new Map();
  private readonly METRICS_FLUSH_INTERVAL = 60000;
  private metricsFlushTimer: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {
    this.startMetricsFlushing();
  }

  initializeSentry(options?: Sentry.NodeOptions): void {
    const sentryConfig = this.configService.getSentryConfig();
    const nodeEnv = this.configService.getEnvironment();
    const {
      integrations: optionIntegrations,
      beforeSend: optionBeforeSend,
      ...sentryOptions
    } = options ?? {};
    const consoleLoggingIntegration = Sentry.consoleLoggingIntegration({
      levels: ['log', 'warn', 'error'],
    });
    const integrations: Sentry.NodeOptions['integrations'] =
      typeof optionIntegrations === 'function'
        ? (defaultIntegrations) => [
            consoleLoggingIntegration,
            ...optionIntegrations(defaultIntegrations),
          ]
        : [consoleLoggingIntegration, ...(optionIntegrations ?? [])];
    const beforeSend = createSentryBeforeSend(optionBeforeSend);

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
      enableLogs: true,
      integrations,
      beforeSend,
      initialScope: {
        tags: {
          service: 'docita-api',
          version: this.configService.getAppVersion(),
        },
      },
      ...sentryOptions,
    });

    this.logger.debug('Sentry initialized');
  }

  // Shared by `captureException` and `captureMessage` — both normalize the
  // context shorthand (a bare string becomes `{ correlationId }`), open a
  // Sentry scope at the requested severity, stamp the normalized context
  // entries onto it, and only then hand off to the capture call that differs
  // between them. Keeping the scope setup in one place stops the two
  // reporters from drifting apart.
  private withSentryScope(
    context: Record<string, unknown> | string | undefined,
    level: Sentry.SeverityLevel,
    capture: () => void,
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
      capture();
    });
  }

  captureException(
    error: unknown,
    context?: Record<string, unknown> | string,
    level: Sentry.SeverityLevel = 'error',
  ): void {
    this.withSentryScope(context, level, () => Sentry.captureException(error));
  }

  captureMessage(
    message: string,
    context?: Record<string, unknown> | string,
    level: Sentry.SeverityLevel = 'info',
  ): void {
    this.withSentryScope(context, level, () => Sentry.captureMessage(message));
  }

  logStructured(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>,
    options: StructuredLogOptions = {},
  ): void {
    const scope = Sentry.getCurrentScope();
    const requestContext = scope?.getScopeData()?.contexts?.request as
      | Record<string, unknown>
      | undefined;
    const correlationId = getRecordString(requestContext, 'id') || 'unknown';

    const logEntry = {
      timestamp: this.clock.now().toISOString(),
      level,
      message,
      correlationId,
      service: 'docita-api',
      ...metadata,
    };

    if (level !== 'debug') {
      void this.persistStructuredLog(
        level,
        message,
        correlationId,
        metadata,
      ).catch((error: unknown) => {
        this.logger.warn(
          `Structured log persistence task failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }

    if (
      (level === 'warn' || level === 'error') &&
      options.captureInSentry !== false
    ) {
      const sentryLevel = level === 'warn' ? 'warning' : 'error';
      this.captureMessage(message, { ...logEntry }, sentryLevel);
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
          severity: mapLogLevelToErrorSeverity(level),
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
    Sentry.metrics.distribution('http_request_duration_ms', durationMs);

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
    Sentry.metrics.distribution('db_query_duration_ms', durationMs);
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, unknown>;
  }> {
    const checks: Record<string, unknown> = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: this.clock.now().toISOString(),
    };

    const checkedAt = this.clock.now();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('DB timeout')), 5000);
        }),
      ]);
      checks.database = { status: 'connected', checked_at: checkedAt };
    } catch (error) {
      checks.database = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
    const checkedAt = this.clock.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'connected',
        checked_at: checkedAt,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        checked_at: checkedAt,
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
    this.metricsFlushTimer = setInterval(() => {
      this.clearOldMetrics();
      this.logStructured('debug', 'Metrics buffer size', {
        size: this.metricsBuffer.size,
      });
    }, this.METRICS_FLUSH_INTERVAL);
    this.metricsFlushTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.metricsFlushTimer) {
      clearInterval(this.metricsFlushTimer);
      this.metricsFlushTimer = null;
    }
  }

  sendHeartbeat(): void {
    Sentry.captureMessage('Heartbeat', 'info');
    Sentry.metrics.count('docita_heartbeat', 1);
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
