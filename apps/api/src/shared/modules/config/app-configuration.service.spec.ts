import { describe, expect, it, jest } from '@jest/globals';
import { AppConfigService } from './app-configuration.service';
import {
  WORKER_JWT_MODULE_PLACEHOLDER_SECRET,
  type EnvConfig,
} from './app-config';

function buildConfig(overrides: Partial<EnvConfig> = {}): EnvConfig {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/docita',
    CPU_COUNT: 4,
    JWT_SECRET: '12345678901234567890123456789012',
    JWT_EXPIRATION: '7d',
    ENCRYPTION_KEY:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    NODE_ENV: 'production',
    PORT: 3001,
    LOG_LEVEL: 'info',
    APP_URL: 'https://api.docita.test',
    NEXT_PUBLIC_APP_URL: 'https://app.docita.test',
    NEXT_PUBLIC_API_URL: 'https://api.docita.test/api',
    CORS_ORIGINS: 'https://app.docita.test',
    STORAGE_PROVIDER: 'local',
    R2_ACCOUNT_ID: undefined,
    R2_ACCESS_KEY_ID: undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET_NAME: undefined,
    RAZORPAY_KEY_ID: undefined,
    RAZORPAY_KEY_SECRET: undefined,
    RAZORPAY_WEBHOOK_SECRET: undefined,
    DOCITA_TAX_COUNTRY_CODE: 'IN',
    DOCITA_TAX_REGIME: 'IN_GST',
    DOCITA_TAX_REGISTRATION_ID: undefined,
    DOCITA_TAX_REGISTRATION_LABEL: 'GSTIN',
    DOCITA_TAX_LEGAL_NAME: 'Docita',
    DOCITA_TAX_ADDRESS: undefined,
    DOCITA_TAX_STATE_CODE: undefined,
    DOCITA_TAX_STATE_NAME: undefined,
    DOCITA_SUBSCRIPTION_TAX_RATE: 18,
    META_ACCESS_TOKEN: undefined,
    META_PHONE_NUMBER_ID: undefined,
    META_APP_SECRET: undefined,
    META_VERIFY_TOKEN: undefined,
    WHATSAPP_PRODUCTION_MODE: false,
    RESEND_API_KEY: undefined,
    RESEND_API_URL: 'https://api.resend.com/emails',
    EMAIL_FROM: 'Docita <notifications@docita.work>',
    SENTRY_DSN: undefined,
    SENTRY_TRACES_SAMPLE_RATE: 0.1,
    SENTRY_PROFILES_SAMPLE_RATE: 0.1,
    APP_VERSION: '1.0.0',
    ANALYTICS_CACHE_TTL: 300,
    PAYMENT_LINK_TTL_MINUTES: 15,
    BULK_IMPORT_MAX_FILE_SIZE: 52428800,
    BULK_IMPORT_MAX_ROWS: 100000,
    BULK_IMPORT_RATE_LIMIT_INTERVAL: 300,
    SLOW_QUERY_THRESHOLD_MS: 1000,
    REQUEST_TIMEOUT_MS: 30000,
    SECRETS_PROVIDER: 'env',
    ENABLE_SCHEDULERS: true,
    API_LOG_MODE: 'access-and-errors',
    WORKER_ENTRYPOINT: 'main',
    DOCTOR_VERIFICATION_API_URL: undefined,
    DOCTOR_VERIFICATION_API_KEY: undefined,
    META_BUSINESS_ACCOUNT_ID: undefined,
    SMTP_HOST: 'localhost',
    SMTP_PORT: 587,
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
    SMS_API_KEY: undefined,
    SMS_SENDER_ID: undefined,
    ENCRYPTION_KEY_V2: undefined,
    ENCRYPTION_KEY_V3: undefined,
    ENCRYPTION_KEY_V4: undefined,
    ENCRYPTION_KEY_V5: undefined,
    PUBLIC_LANDING_CLINICS: undefined,
    PUBLIC_LANDING_DOCTORS: undefined,
    PUBLIC_LANDING_PATIENTS: undefined,
    PUBLIC_LANDING_PRESCRIPTIONS: undefined,
    PUBLIC_LANDING_APPOINTMENTS: undefined,
    PUBLIC_LANDING_UPTIME: undefined,
    SLA_UPTIME_TARGET: undefined,
    OPENAI_API_KEY: undefined,
    OPENAI_MODEL: 'gpt-4-turbo',
    AI_REQUEST_TIMEOUT: 5000,
    AI_CACHE_ENABLED: true,
    AI_CACHE_TTL: 86400,
    ...overrides,
  };
}

describe('AppConfigService.getJwtSecret', () => {
  it('returns the configured JWT secret for API runtime', () => {
    const service = new AppConfigService();
    jest.spyOn(service, 'getConfig').mockReturnValue(buildConfig());

    expect(service.getJwtSecret()).toBe('12345678901234567890123456789012');
  });

  it('returns the placeholder secret for worker runtime without JWT_SECRET', () => {
    const service = new AppConfigService();
    jest.spyOn(service, 'getConfig').mockReturnValue(
      buildConfig({
        JWT_SECRET: undefined,
        WORKER_ENTRYPOINT: 'worker',
      }),
    );

    expect(service.getJwtSecret()).toBe(WORKER_JWT_MODULE_PLACEHOLDER_SECRET);
  });

  it('throws for API runtime without JWT_SECRET', () => {
    const service = new AppConfigService();
    jest.spyOn(service, 'getConfig').mockReturnValue(
      buildConfig({
        JWT_SECRET: undefined,
      }),
    );

    expect(() => service.getJwtSecret()).toThrow(
      'JWT_SECRET is required for API runtime',
    );
  });
});
