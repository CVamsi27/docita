import { Injectable } from '@nestjs/common';
import { getEnv, type EnvConfig } from './app-config';
import {
  getRequiredRedisUrl,
  parseInternalAllowedEmails,
} from './app-configuration-values';
import {
  detectManagedDatabaseProvider,
  type ManagedDatabaseProvider,
} from './managed-database-provider';

@Injectable()
export class PlatformInfrastructureConfigService {
  getConfig(): EnvConfig {
    return getEnv();
  }

  getDatabaseUrl(): string {
    return getEnv().DATABASE_URL;
  }

  detectManagedDatabaseProvider(): ManagedDatabaseProvider | null {
    return detectManagedDatabaseProvider(this.getDatabaseUrl());
  }

  getRedisUrl(): string {
    return getRequiredRedisUrl(getEnv().REDIS_URL);
  }

  isRlsEnabled(): boolean {
    return getEnv().RLS_ENABLED;
  }

  getQueueBackend(): 'memory' | 'postgres' {
    return getEnv().QUEUE_BACKEND;
  }

  getCacheBackend(): 'memory' | 'redis' {
    return getEnv().CACHE_BACKEND;
  }

  getRequestTimeoutMs(): number {
    return getEnv().REQUEST_TIMEOUT_MS;
  }

  getSlowQueryThreshold(): number {
    return getEnv().SLOW_QUERY_THRESHOLD_MS;
  }

  getLogLevel(): string {
    return getEnv().LOG_LEVEL;
  }

  getApiLogMode(): string {
    return getEnv().API_LOG_MODE;
  }

  getSentryConfig() {
    const config = getEnv();
    return {
      dsn: config.SENTRY_DSN,
      tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: config.SENTRY_PROFILES_SAMPLE_RATE,
    };
  }

  getAnalyticsCacheTtl(): number {
    return getEnv().ANALYTICS_CACHE_TTL;
  }

  getTenantRateLimitDefaults(): {
    rps: number;
    rpm: number;
    monthlyBudget: number;
  } {
    const config = getEnv();
    return {
      rps: config.TENANT_RATE_LIMIT_DEFAULT_RPS,
      rpm: config.TENANT_RATE_LIMIT_DEFAULT_RPM,
      monthlyBudget: config.TENANT_RATE_LIMIT_DEFAULT_MONTHLY_BUDGET,
    };
  }

  getAppVersion(): string {
    return getEnv().APP_VERSION;
  }

  getInternalAllowedEmails(): string[] {
    return parseInternalAllowedEmails(getEnv().INTERNAL_ALLOWED_EMAILS);
  }
}
