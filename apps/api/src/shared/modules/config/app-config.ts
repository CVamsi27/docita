import { z } from 'zod';

export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_USER: z.string().default('postgres'),
  DATABASE_PASSWORD: z.string().default(''),
  DATABASE_NAME: z.string().default('docita'),
  DB_ENCRYPTION_AT_REST_CONFIRMED: z.enum(['true', 'false']).default('false'),
  DATABASE_READ_URL: z.string().optional(),
  BACKUP_DIR: z.string().default('/backups/postgresql'),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(30),
  CPU_COUNT: z.coerce.number().default(4),
  JWT_SECRET: z.string(),
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
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_PRODUCTION_MODE: z.coerce.boolean().default(false),
  AI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_API_URL: z.string().default('https://api.resend.com/emails'),
  EMAIL_FROM: z.string().default('Docita <notifications@docita.work>'),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_PROFILES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  APP_VERSION: z.string().default('1.0.0'),
  ANALYTICS_CACHE_TTL: z.coerce.number().default(300),
  PAYMENT_LINK_TTL_MINUTES: z.coerce.number().default(15),
  QUEUE_PROVIDER: z.enum(['bull', 'memory']).default('memory'),
  CACHE_PROVIDER: z.enum(['redis', 'memory']).default('memory'),
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
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo'),
  AI_REQUEST_TIMEOUT: z.coerce.number().default(5000),
  AI_CACHE_ENABLED: z.coerce.boolean().default(true),
  AI_CACHE_TTL: z.coerce.number().default(86400),
  CURRENCY_CODE: z.string().optional().default('INR'),
  PGBOUNCER_HOST: z.string().default('localhost'),
  PGBOUNCER_PORT: z.coerce.number().default(6432),
  PGBOUNCER_ENABLED: z.coerce.boolean().default(false),
  PRISMA_ACCELERATE_KEY: z.string().optional(),
  PRISMA_ACCELERATE_ENABLED: z.coerce.boolean().default(false),
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

  if (envToParse.NODE_ENV === 'test') {
    envToParse.DATABASE_URL ??=
      'postgresql://test:test@localhost:5432/docita_test';
    envToParse.JWT_SECRET ??= 'test-jwt-secret';
    envToParse.ENCRYPTION_KEY ??=
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    envToParse.APP_URL ??= 'http://localhost:3001';
    envToParse.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
    envToParse.NEXT_PUBLIC_API_URL ??= 'http://localhost:3001/api';
    envToParse.CORS_ORIGINS ??= 'http://localhost:3000';
    envToParse.CURRENCY_CODE ??= 'INR';
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
  return result.data;
}

export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}
