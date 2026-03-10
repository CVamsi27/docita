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

  getPaymentCallbackUrl(): string {
    return `${this.getAppUrl()}/api/payment/callback`;
  }

  getEnvironment(): 'development' | 'staging' | 'production' | 'test' {
    return this.getConfig().NODE_ENV;
  }

  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  getDatabaseUrl(): string {
    return this.getConfig().DATABASE_URL;
  }

  getDatabaseReadUrl(): string | undefined {
    return this.getConfig().DATABASE_READ_URL;
  }

  getJwtSecret(): string {
    return this.getConfig().JWT_SECRET;
  }

  getEncryptionKey(): string {
    return this.getConfig().ENCRYPTION_KEY;
  }

  getCorsOrigins(): (string | RegExp)[] {
    return this.getConfig()
      .CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  getSentryConfig() {
    return {
      dsn: this.getConfig().SENTRY_DSN,
      tracesSampleRate: this.getConfig().SENTRY_TRACES_SAMPLE_RATE,
      profilesSampleRate: this.getConfig().SENTRY_PROFILES_SAMPLE_RATE,
      logLevel: this.getConfig().LOG_LEVEL,
      environment: this.getEnvironment(),
      release: this.getConfig().APP_VERSION,
    };
  }

  getRazorpayConfig() {
    return {
      keyId: this.getRazorpayKeyId(),
      keySecret: this.getRazorpayKeySecret(),
      webhookSecret: this.getRazorpayWebhookSecret(),
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
      appSecret: this.getConfig().META_APP_SECRET || '',
      verifyToken: this.getConfig().META_VERIFY_TOKEN || '',
      productionMode: this.getConfig().WHATSAPP_PRODUCTION_MODE,
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

  getPaymentTtl(): number {
    return this.getConfig().PAYMENT_TTL;
  }

  getPaymentRetryConfig() {
    return {
      maxAttempts: this.getConfig().PAYMENT_RETRY_MAX_ATTEMPTS,
      backoffMultiplier: this.getConfig().PAYMENT_RETRY_BACKOFF_MULTIPLIER,
    };
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

  getMetaVerifyToken(): string {
    const config = getEnv();
    return config.META_VERIFY_TOKEN || '';
  }

  getGoogleCloudProjectId(): string | undefined {
    const config = getEnv();
    return config.GOOGLE_CLOUD_PROJECT_ID;
  }

  getGoogleCloudCredentialsJson(): string | undefined {
    const config = getEnv();
    return config.GOOGLE_CLOUD_CREDENTIALS_JSON;
  }

  getOcrConfidenceThreshold(): number {
    const config = getEnv();
    return config.OCR_CONFIDENCE_THRESHOLD || 0.75;
  }

  getOcrMedicalFieldThreshold(): number {
    const config = getEnv();
    return config.OCR_MEDICAL_FIELD_THRESHOLD || 0.8;
  }

  getOcrContactFieldThreshold(): number {
    const config = getEnv();
    return config.OCR_CONTACT_FIELD_THRESHOLD || 0.65;
  }

  getRedisUrl(): string | undefined {
    const config = getEnv();
    return config.REDIS_URL;
  }

  getRedisHost(): string {
    const config = getEnv();
    return config.REDIS_HOST;
  }

  getRedisPort(): number {
    const config = getEnv();
    return config.REDIS_PORT;
  }

  getRedisPassword(): string | undefined {
    const config = getEnv();
    return config.REDIS_PASSWORD;
  }

  getRedisUsername(): string | undefined {
    const config = getEnv();
    return config.REDIS_USERNAME;
  }

  getLogLevel(): string {
    const config = getEnv();
    return config.LOG_LEVEL;
  }

  getPort(): number {
    const config = getEnv();
    return config.PORT;
  }

  getSentryDsn(): string | undefined {
    const config = getEnv();
    return config.SENTRY_DSN;
  }

  getSentryTracesSampleRate(): number {
    const config = getEnv();
    return config.SENTRY_TRACES_SAMPLE_RATE;
  }

  getSentryProfilesSampleRate(): number {
    const config = getEnv();
    return config.SENTRY_PROFILES_SAMPLE_RATE;
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

  getCurrencyCode(): string {
    const config = getEnv();
    return config.CURRENCY_CODE;
  }
}
