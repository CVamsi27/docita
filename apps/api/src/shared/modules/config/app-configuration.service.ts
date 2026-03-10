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

  getCurrencyCode(): string {
    const config = getEnv();
    return config.CURRENCY_CODE;
  }
}
