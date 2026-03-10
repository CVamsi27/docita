import { Injectable } from '@nestjs/common';
import { EnvConfig, getEnv } from './app-config';

@Injectable()
export class AppConfigService {
  getConfig(): EnvConfig {
    return getEnv();
  }

  getAppUrl(): string {
    return this.getConfig().APP_URL;
  }

  getFrontendAppUrl(): string {
    return this.getConfig().NEXT_PUBLIC_APP_URL;
  }

  getApiUrl(): string {
    return this.getConfig().NEXT_PUBLIC_API_URL;
  }

  getEnvironment(): 'development' | 'staging' | 'production' | 'test' {
    return this.getConfig().NODE_ENV;
  }

  isProduction(): boolean {
    return this.getConfig().NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  getCpuCount(): number {
    return this.getConfig().CPU_COUNT;
  }

  getDatabaseUrl(): string {
    return this.getConfig().DATABASE_URL;
  }

  getDatabaseReadUrl(): string | undefined {
    return this.getConfig().DATABASE_READ_URL;
  }

  getDatabaseConfig() {
    return {
      host: this.getConfig().DATABASE_HOST,
      port: this.getConfig().DATABASE_PORT,
      user: this.getConfig().DATABASE_USER,
      password: this.getConfig().DATABASE_PASSWORD,
      name: this.getConfig().DATABASE_NAME,
    };
  }

  getBackupConfig() {
    return {
      directory: this.getConfig().BACKUP_DIR,
      retentionDays: this.getConfig().BACKUP_RETENTION_DAYS,
    };
  }

  getRazorpayKeyId(): string {
    return this.getConfig().RAZORPAY_KEY_ID || '';
  }

  getRazorpayKeySecret(): string {
    return this.getConfig().RAZORPAY_KEY_SECRET || '';
  }

  getRazorpayWebhookSecret(): string {
    return this.getConfig().RAZORPAY_WEBHOOK_SECRET || '';
  }

  getMetaConfig() {
    return {
      accessToken: this.getConfig().META_ACCESS_TOKEN || '',
      phoneNumberId: this.getConfig().META_PHONE_NUMBER_ID || '',
      businessAccountId: this.getConfig().META_BUSINESS_ACCOUNT_ID || '',
      appSecret: this.getConfig().META_APP_SECRET || '',
      verifyToken: this.getConfig().META_VERIFY_TOKEN || '',
      productionMode: this.getConfig().WHATSAPP_PRODUCTION_MODE,
    };
  }

  getSmtpConfig() {
    return {
      host: this.getConfig().SMTP_HOST,
      port: this.getConfig().SMTP_PORT,
      user: this.getConfig().SMTP_USER || '',
      pass: this.getConfig().SMTP_PASS || '',
    };
  }

  getSmsConfig() {
    return {
      apiKey: this.getConfig().SMS_API_KEY || '',
      senderId: this.getConfig().SMS_SENDER_ID || '',
    };
  }

  getResendApiKey(): string {
    return this.getConfig().RESEND_API_KEY || '';
  }

  getResendApiUrl(): string {
    return this.getConfig().RESEND_API_URL;
  }

  getEmailFrom(): string {
    return this.getConfig().EMAIL_FROM;
  }

  getAnalyticsCacheTtl(): number {
    return this.getConfig().ANALYTICS_CACHE_TTL;
  }

  getRedisConfig() {
    return {
      host: this.getConfig().REDIS_HOST,
      port: this.getConfig().REDIS_PORT,
      password: this.getConfig().REDIS_PASSWORD,
      username: this.getConfig().REDIS_USERNAME,
      url: this.getConfig().REDIS_URL,
    };
  }

  getQueueProvider(): 'bull' | 'memory' {
    return this.getConfig().QUEUE_PROVIDER;
  }

  getCacheProvider(): 'redis' | 'memory' {
    return this.getConfig().CACHE_PROVIDER;
  }

  getBulkImportConfig() {
    return {
      maxFileSize: this.getConfig().BULK_IMPORT_MAX_FILE_SIZE,
      maxRows: this.getConfig().BULK_IMPORT_MAX_ROWS,
      rateLimitInterval: this.getConfig().BULK_IMPORT_RATE_LIMIT_INTERVAL,
    };
  }

  getSlowQueryThreshold(): number {
    return this.getConfig().SLOW_QUERY_THRESHOLD_MS;
  }

  getLogLevel(): string {
    const config = getEnv();
    return config.LOG_LEVEL;
  }

  getAppVersion(): string {
    const config = getEnv();
    return config.APP_VERSION;
  }

  getPaymentLinkTtlMinutes(): number {
    const config = getEnv();
    return config.PAYMENT_LINK_TTL_MINUTES;
  }

  getRequestTimeoutMs(): number {
    const config = getEnv();
    return config.REQUEST_TIMEOUT_MS;
  }

  getSecretsProvider(): 'env' | 'aws' {
    return this.getConfig().SECRETS_PROVIDER;
  }

  getJwtSecret(): string {
    return this.getConfig().JWT_SECRET;
  }

  getJwtExpiration(): string {
    return this.getConfig().JWT_EXPIRATION || '7d';
  }

  getEncryptionKey(): string {
    return this.getConfig().ENCRYPTION_KEY;
  }

  getHistoricalEncryptionKeys(): Record<string, string | undefined> {
    const config = this.getConfig();
    return {
      v2: config.ENCRYPTION_KEY_V2,
      v3: config.ENCRYPTION_KEY_V3,
      v4: config.ENCRYPTION_KEY_V4,
      v5: config.ENCRYPTION_KEY_V5,
    };
  }

  getEncryptionAtRestConfirmed(): boolean {
    return this.getConfig().DB_ENCRYPTION_AT_REST_CONFIRMED === 'true';
  }

  getAiApiKey(): string | undefined {
    return this.getConfig().AI_API_KEY;
  }

  getSentryConfig() {
    return {
      dsn: this.getConfig().SENTRY_DSN,
      tracesSampleRate: this.getConfig().SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: this.getConfig().SENTRY_PROFILES_SAMPLE_RATE,
    };
  }

  getApiLogMode(): string {
    return this.getConfig().API_LOG_MODE;
  }

  getDoctorVerificationConfig() {
    return {
      apiUrl: this.getConfig().DOCTOR_VERIFICATION_API_URL,
      apiKey: this.getConfig().DOCTOR_VERIFICATION_API_KEY,
    };
  }

  getOpenAiConfig() {
    return {
      apiKey: this.getConfig().OPENAI_API_KEY,
      model: this.getConfig().OPENAI_MODEL,
      requestTimeout: this.getConfig().AI_REQUEST_TIMEOUT,
      cacheEnabled: this.getConfig().AI_CACHE_ENABLED,
      cacheTtl: this.getConfig().AI_CACHE_TTL,
    };
  }

  getPort(): number {
    return this.getConfig().PORT;
  }

  getCurrencyCode(): string {
    return this.getConfig().CURRENCY_CODE;
  }

  getPgBouncerConfig() {
    return {
      host: this.getConfig().PGBOUNCER_HOST,
      port: this.getConfig().PGBOUNCER_PORT,
      enabled: this.getConfig().PGBOUNCER_ENABLED,
    };
  }

  getPrismaAccelerateConfig() {
    return {
      key: this.getConfig().PRISMA_ACCELERATE_KEY,
      enabled: this.getConfig().PRISMA_ACCELERATE_ENABLED,
    };
  }
}
