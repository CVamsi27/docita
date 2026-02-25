import { Injectable } from '@nestjs/common';
import { EnvConfig, getEnv } from './app-config';

@Injectable()
export class AppConfigService {
  getConfig(): EnvConfig {
    return getEnv();
  }

  getAppUrl(): string {
    return this.getConfig().APP_URL || 'http://localhost:3000';
  }

  getFrontendAppUrl(): string {
    return this.getConfig().NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  getApiUrl(): string {
    return this.getConfig().NEXT_PUBLIC_API_URL || '';
  }

  getPaymentCallbackUrl(): string {
    return `${this.getAppUrl()}/api/payment/callback`;
  }

  getEnvironment(): 'development' | 'staging' | 'production' | 'test' {
    return this.getConfig().NODE_ENV || 'development';
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
    const envOrigins = this.getConfig().CORS_ORIGINS;
    if (envOrigins) {
      return envOrigins.split(',').map((origin) => origin.trim());
    }

    return [
      'https://landing.docita.work',
      'https://app.docita.work',
      'https://admin.docita.work',
      /^https:\/\/.*\.vercel\.app$/,
      'http://localhost:3003',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002',
    ];
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

  getEmailFrom(): string {
    return this.getConfig().EMAIL_FROM;
  }

  getAnalyticsCacheTtl(): number {
    return this.getConfig().ANALYTICS_CACHE_TTL;
  }

  getClinicInfo() {
    return {
      name: this.getConfig().CLINIC_NAME,
      address: this.getConfig().CLINIC_ADDRESS,
      phone: this.getConfig().CLINIC_PHONE,
      email: this.getConfig().CLINIC_EMAIL,
      website: this.getConfig().CLINIC_WEBSITE,
      gstin: this.getConfig().CLINIC_GSTIN,
    };
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
    return config.LOG_LEVEL || 'info';
  }

  getPort(): number {
    const config = getEnv();
    return config.PORT || 3001;
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

  getClinicName(): string {
    const config = getEnv();
    return config.CLINIC_NAME;
  }

  getClinicAddress(): string | undefined {
    const config = getEnv();
    return config.CLINIC_ADDRESS;
  }

  getClinicPhone(): string | undefined {
    const config = getEnv();
    return config.CLINIC_PHONE;
  }

  getClinicEmail(): string | undefined {
    const config = getEnv();
    return config.CLINIC_EMAIL;
  }

  getClinicWebsite(): string | undefined {
    const config = getEnv();
    return config.CLINIC_WEBSITE;
  }

  getPaymentLinkTtlMinutes(): number {
    const config = getEnv();
    return config.PAYMENT_LINK_TTL_MINUTES;
  }
}
