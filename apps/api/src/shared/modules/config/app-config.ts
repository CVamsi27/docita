import { z } from 'zod';

export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  STAGING_DATABASE_URL: z.string().optional(),
  CPU_COUNT: z.coerce.number().default(4),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().length(64),
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().min(1),
  NEXT_PUBLIC_API_URL: z.string().min(1),
  CORS_ORIGINS: z.string().min(1),
  STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_PRODUCTION_MODE: z.coerce.boolean().default(false),
  RESEND_API_KEY: z.string().optional(),
  RESEND_API_URL: z.string().default('https://api.resend.com/emails'),
  EMAIL_FROM: z.string().default('Docita <notifications@docita.work>'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  APP_VERSION: z.string().default('1.0.0'),
  ANALYTICS_CACHE_TTL: z.coerce.number().default(300),
  PAYMENT_LINK_TTL_MINUTES: z.coerce.number().default(15),
  BULK_IMPORT_MAX_FILE_SIZE: z.coerce.number().default(52428800),
  BULK_IMPORT_MAX_ROWS: z.coerce.number().default(100000),
  BULK_IMPORT_RATE_LIMIT_INTERVAL: z.coerce.number().default(300),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().default(1000),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  SECRETS_PROVIDER: z.enum(['env', 'aws']).default('env'),
  API_LOG_MODE: z.string().default('access-and-errors'),
  DOCTOR_VERIFICATION_API_URL: z.string().optional(),
  DOCTOR_VERIFICATION_API_KEY: z.string().optional(),
  META_BUSINESS_ACCOUNT_ID: z.string().optional(),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),
  ENCRYPTION_KEY_V2: z.string().optional(),
  ENCRYPTION_KEY_V3: z.string().optional(),
  ENCRYPTION_KEY_V4: z.string().optional(),
  ENCRYPTION_KEY_V5: z.string().optional(),
  PUBLIC_LANDING_CLINICS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_DOCTORS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_PATIENTS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_PRESCRIPTIONS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_APPOINTMENTS: z.coerce.number().int().min(0).optional(),
  PUBLIC_LANDING_UPTIME: z.string().optional(),
  SLA_UPTIME_TARGET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo'),
  AI_REQUEST_TIMEOUT: z.coerce.number().default(5000),
  AI_CACHE_ENABLED: z.coerce.boolean().default(true),
  AI_CACHE_TTL: z.coerce.number().default(86400),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function isDevelopment(): boolean {
  return (process.env.NODE_ENV || 'development') === 'development';
}

export function getCorsOrigins(): (string | RegExp)[] {
  return validateEnv()
    .CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getWebSocketCorsOrigins(): (string | RegExp)[] {
  return getCorsOrigins();
}

let validatedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (validatedEnv) return validatedEnv;

  const envToParse = { ...process.env };
  envToParse.META_BUSINESS_ACCOUNT_ID ??=
    envToParse.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (
    envToParse.NODE_ENV === 'staging' &&
    !envToParse.DATABASE_URL &&
    envToParse.STAGING_DATABASE_URL
  ) {
    envToParse.DATABASE_URL = envToParse.STAGING_DATABASE_URL;
  }

  if (envToParse.NODE_ENV === 'test') {
    envToParse.DATABASE_URL ??=
      'postgresql://test:test@localhost:5434/docita_test';
    envToParse.JWT_SECRET ??= 'test-jwt-secret-minimum-32-characters';
    envToParse.ENCRYPTION_KEY ??=
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    envToParse.APP_URL ??= 'http://localhost:3001';
    envToParse.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
    envToParse.NEXT_PUBLIC_API_URL ??= 'http://localhost:3001/api';
    envToParse.CORS_ORIGINS ??= 'http://localhost:3000';
  }

  const result = EnvSchema.safeParse(envToParse);

  if (!result.success) {
    const formatted = result.error.format();

    if (envToParse.NODE_ENV === 'test') {
      throw new Error(
        `API environment validation failed for tests: ${JSON.stringify(formatted)}`,
      );
    }

    process.stderr.write('\nAPI environment validation failed.\n');
    process.stderr.write('Please fix the following environment variables:\n');

    Object.entries(formatted).forEach(([key, value]) => {
      if (
        key !== '_errors' &&
        typeof value === 'object' &&
        '_errors' in value
      ) {
        const errors = (value as { _errors: string[] })._errors;
        if (errors.length > 0) {
          process.stderr.write(`  - ${key}: ${errors.join(', ')}\n`);
        }
      }
    });

    const rootErrors = formatted._errors;
    if (Array.isArray(rootErrors) && rootErrors.length > 0) {
      process.stderr.write(`  - env: ${rootErrors.join(', ')}\n`);
    }

    process.stderr.write('\n');

    process.exit(1);
  }

  validatedEnv = result.data;
  if (envToParse.NODE_ENV === 'staging' && envToParse.STAGING_DATABASE_URL) {
    process.env.DATABASE_URL = result.data.DATABASE_URL;
  }
  return result.data;
}

export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}
