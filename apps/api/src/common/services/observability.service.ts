import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { PrismaService } from '../services/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';

/**
 * Observability Service
 * Provides Sentry error tracking, structured logging, health checks, and metrics collection
 */
@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);
  private metricsBuffer: Map<string, any> = new Map();
  private readonly METRICS_FLUSH_INTERVAL = 60000; // 1 minute

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    // Start periodic metrics flush
    this.startMetricsFlushing();
  }

  /**
   * Initialize Sentry with enhanced configuration
   */
  initializeSentry(options?: Sentry.NodeOptions): void {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const sentryDsn = process.env.SENTRY_DSN;

    if (!sentryDsn) {
      this.logger.warn(
        'SENTRY_DSN not configured. Error tracking disabled.',
      );
      return;
    }

    Sentry.init({
      dsn: sentryDsn,
      environment: nodeEnv,
      tracesSampleRate: parseFloat(
        process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
      ),
      profilesSampleRate:
        nodeEnv === 'production'
          ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1')
          : 1.0,
      maxBreadcrumbs: 50,
      attachStacktrace: true,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      // Add custom tags to all events
      initialScope: {
        tags: {
          service: 'docita-api',
          version: process.env.APP_VERSION || '1.0.0',
        },
      },
      ...options,
    });

    this.logger.debug('✅ Sentry initialized');
  }

  /**
   * Capture exception with context
   */
  captureException(
    error: Error,
    context?: Record<string, any>,
    level: Sentry.SeverityLevel = 'error',
  ): void {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Capture message with context
   */
  captureMessage(
    message: string,
    context?: Record<string, any>,
    level: Sentry.SeverityLevel = 'info',
  ): void {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
      }
      Sentry.captureMessage(message);
    });
  }

  /**
   * Record structured log with correlation ID
   */
  logStructured(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, any>,
  ): void {
    const correlationId =
      Sentry.getCurrentScope()?.getContext('request')?.id ||
      'unknown';

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId,
      service: 'docita-api',
      ...metadata,
    };

    // Log to stdout in JSON format for structured logging
    console.log(JSON.stringify(logEntry));

    // Also log via Sentry if level is warning or error
    if (level === 'warn' || level === 'error') {
      this.captureMessage(message, { ...logEntry }, level);
    }
  }

  /**
   * Record metric for Prometheus/OpenTelemetry
   */
  recordMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    const key = labels
      ? `${name}{${Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')}}`
      : name;

    this.metricsBuffer.set(key, {
      name,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record request latency
   */
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

    // Track percentiles
    const percentileKey = `${endpoint}_${method}_${statusCode}`;
    const latencies: number[] = JSON.parse(
      this.metricsBuffer.get(percentileKey)?.value ?? '[]',
    );
    latencies.push(durationMs);

    if (latencies.length > 1000) {
      latencies.shift(); // Keep only last 1000 samples
    }

    this.recordMetric('request_latencies', latencies.length, {
      endpoint,
      method,
      status: String(statusCode),
    });
  }

  /**
   * Record database query performance
   */
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

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, any>;
  }> {
    const checks: Record<string, any> = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    try {
      // Check database connectivity
      const dbCheck = await Promise.race([
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

    try {
      // Check Redis connectivity
      await this.redis.ping();
      checks.redis = { status: 'connected', checked_at: new Date() };
    } catch (error) {
      checks.redis = {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Determine overall status
    const dbConnected = checks.database.status === 'connected';
    const redisConnected = checks.redis.status === 'connected';
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (dbConnected && redisConnected) {
      status = 'healthy';
    } else if (dbConnected || redisConnected) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks };
  }

  /**
   * Get detailed database health
   */
  async getDatabaseHealth(): Promise<Record<string, any>> {
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

  /**
   * Get application metrics summary
   */
  getMetricsSummary(): Record<string, any> {
    const metrics: Record<string, any> = {};

    for (const [key, value] of this.metricsBuffer.entries()) {
      metrics[key] = value;
    }

    return metrics;
  }

  /**
   * Clear old metrics to prevent memory leak
   */
  private clearOldMetrics(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // Keep metrics for 5 minutes

    for (const [key, metric] of this.metricsBuffer.entries()) {
      if (now - metric.timestamp > maxAge) {
        this.metricsBuffer.delete(key);
      }
    }
  }

  /**
   * Start periodic metrics flushing
   */
  private startMetricsFlushing(): void {
    setInterval(() => {
      this.clearOldMetrics();

      // Could integrate with Prometheus/OpenTelemetry here
      // For now, metrics are accumulated in memory
      this.logStructured('debug', 'Metrics buffer size', {
        size: this.metricsBuffer.size,
      });
    }, this.METRICS_FLUSH_INTERVAL);
  }

  /**
   * Send Sentry heartbeat
   */
  sendHeartbeat(): void {
    Sentry.captureMessage('Heartbeat', 'info');
  }

  /**
   * Flush pending Sentry events
   */
  async flush(timeout: number = 2000): Promise<boolean> {
    try {
      await Sentry.close(timeout);
      return true;
    } catch (error) {
      this.logger.error('Error flushing Sentry:', error);
      return false;
    }
  }
}
