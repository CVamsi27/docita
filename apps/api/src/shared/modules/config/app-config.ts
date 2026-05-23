import { z } from 'zod';
import { EnvConfigStore } from './env-config.store';

function isValidationErrorRecord(value: unknown): value is {
  _errors?: unknown;
} {
  return value !== null && typeof value === 'object';
}

/** Parses env boolean strings (`"false"` must not coerce to true). */
function envBoolean(defaultValue: boolean) {
  return z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return defaultValue;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      const normalized = String(value).trim().toLowerCase();
      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
      }
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      return defaultValue;
    });
}

export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CPU_COUNT: z.coerce.number().default(4),
  // API needs JWT_SECRET for auth. Worker-only processes should not fail hard
  // if JWT issuance/verification is not part of their runtime responsibilities.
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRATION: z.string().default('15m'),
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
  DOCITA_TAX_COUNTRY_CODE: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .default('IN'),
  DOCITA_TAX_REGIME: z
    .enum(['IN_GST', 'VAT', 'SALES_TAX', 'NONE'])
    .default('IN_GST'),
  DOCITA_TAX_REGISTRATION_ID: z.string().optional(),
  DOCITA_TAX_REGISTRATION_LABEL: z.string().default('GSTIN'),
  DOCITA_TAX_LEGAL_NAME: z.string().default('Docita'),
  DOCITA_TAX_ADDRESS: z.string().optional(),
  DOCITA_TAX_STATE_CODE: z.string().optional(),
  DOCITA_TAX_STATE_NAME: z.string().optional(),
  DOCITA_SUBSCRIPTION_TAX_RATE: z.coerce.number().min(0).max(100).default(18),
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_PRODUCTION_MODE: z.coerce.boolean().default(false),
  WHATSAPP_PER_CLINIC_SENDER_ENABLED: z.coerce.boolean().default(false),
  ENTERPRISE_CONTRACT_DYNAMIC_PRICING_ENABLED: z.coerce
    .boolean()
    .default(false),
  ZEPTOMAIL_SENDMAIL_TOKEN: z.string().optional(),
  ZEPTOMAIL_API_URL: z.string().default('https://api.zeptomail.in/v1.1/email'),
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
  ENABLE_SCHEDULERS: envBoolean(true),
  QUEUE_BACKEND: z.enum(['memory', 'postgres']).default('memory'),
  CACHE_BACKEND: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().url().optional(),
  API_LOG_MODE: z.string().default('access-and-errors'),
  WORKER_ENTRYPOINT: z.enum(['main', 'worker']).default('main'),
  DOCTOR_VERIFICATION_API_URL: z.string().optional(),
  DOCTOR_VERIFICATION_API_KEY: z.string().optional(),
  HPR_API_URL: z.string().optional(),
  HPR_API_KEY: z.string().optional(),
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
  TENANT_RATE_LIMIT_DEFAULT_RPS: z.coerce.number().int().positive().default(50),
  TENANT_RATE_LIMIT_DEFAULT_RPM: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),
  TENANT_RATE_LIMIT_DEFAULT_MONTHLY_BUDGET: z.coerce
    .number()
    .int()
    .positive()
    .default(5_000_000),
  RLS_ENABLED: z.coerce.boolean().default(false),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /**
   * Comma-separated list of email addresses allowed to authenticate as
   * Role.INTERNAL. Empty/unset = allow any user with the INTERNAL role
   * (legacy behaviour). Recommended in production: lock down to the
   * Docita owner/team.
   */
  INTERNAL_ALLOWED_EMAILS: z.string().default(''),
  DOCITA_API_E2E: z.string().optional(),
  CPT_CATALOG_SOURCE: z.string().optional(),
  CPT_LICENSED_API_URL: z.string().optional(),
  CPT_LICENSED_API_KEY: z.string().optional(),
  CPT_LICENSED_SEARCH_PATH: z.string().optional(),
  CPT_LICENSED_SYNC_PATH: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Used only to satisfy Nest JwtModule registration when WORKER_ENTRYPOINT is
 * `worker` and JWT_SECRET is unset. The worker process does not serve HTTP auth;
 * do not rely on this value to verify tokens issued by the API.
 */
export const WORKER_JWT_MODULE_PLACEHOLDER_SECRET =
  'worker-jwt-placeholder-not-used-for-http-auth-32chars-min';

export function isDevelopment(): boolean {
  return (process.env.NODE_ENV || 'development') === 'development';
}

const DOCITA_HTTPS_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*docita\.work$/i;

function assertDocitaOnlyPublicOrigins(
  config: z.infer<typeof EnvSchema>,
): void {
  if (config.NODE_ENV !== 'production' && config.NODE_ENV !== 'staging') {
    return;
  }

  const corsOrigins = config.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of corsOrigins) {
    if (!DOCITA_HTTPS_ORIGIN_RE.test(origin)) {
      process.stderr.write('\nAPI environment validation failed.\n');
      process.stderr.write(
        `CORS_ORIGINS must list https://*.docita.work hosts only. Invalid entry: ${origin}\n\n`,
      );
      process.exit(1);
    }
  }

  for (const [key, value] of [
    ['APP_URL', config.APP_URL],
    ['NEXT_PUBLIC_APP_URL', config.NEXT_PUBLIC_APP_URL],
    ['NEXT_PUBLIC_API_URL', config.NEXT_PUBLIC_API_URL],
  ] as const) {
    let hostname: string;
    try {
      hostname = new URL(value).hostname;
    } catch {
      process.stderr.write('\nAPI environment validation failed.\n');
      process.stderr.write(`  - ${key}: must be a valid URL\n\n`);
      process.exit(1);
    }

    if (hostname !== 'docita.work' && !hostname.endsWith('.docita.work')) {
      process.stderr.write('\nAPI environment validation failed.\n');
      process.stderr.write(
        `  - ${key}: must use a docita.work host in staging/production\n\n`,
      );
      process.exit(1);
    }
  }
}

export function getCorsOrigins(): (string | RegExp)[] {
  const env = validateEnv();
  const parsed = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!isDevelopment()) {
    return parsed;
  }

  // In local dev it's common to run the app on localhost/127.0.0.1 (or alternate ports).
  // Keep strict allowlisting in non-dev environments.
  const devFallbacks: (string | RegExp)[] = [
    env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
  ];

  const merged: (string | RegExp)[] = [...parsed];
  for (const candidate of devFallbacks) {
    if (typeof candidate === 'string') {
      if (!candidate.trim()) continue;
      if (!merged.some((o) => typeof o === 'string' && o === candidate)) {
        merged.push(candidate);
      }
      continue;
    }
    merged.push(candidate);
  }

  return merged;
}

export function getWebSocketCorsOrigins(): (string | RegExp)[] {
  return getCorsOrigins();
}

export function validateEnv(): EnvConfig {
  const cached = EnvConfigStore.getCached();
  if (cached) return cached;

  const envToParse = { ...process.env };
  envToParse.META_BUSINESS_ACCOUNT_ID ??=
    envToParse.WHATSAPP_BUSINESS_ACCOUNT_ID;

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
    envToParse.ENABLE_SCHEDULERS ??= 'true';
    envToParse.QUEUE_BACKEND ??= 'memory';
    envToParse.WORKER_ENTRYPOINT ??= 'main';
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
        isValidationErrorRecord(value) &&
        Array.isArray(value._errors)
      ) {
        const errors = value._errors.filter(
          (entry): entry is string => typeof entry === 'string',
        );
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

  // Enforce JWT_SECRET only when running the request-serving API runtime.
  const runningAsWorker = result.data.WORKER_ENTRYPOINT === 'worker';
  if (!runningAsWorker && !result.data.JWT_SECRET) {
    process.stderr.write('\nAPI environment validation failed.\n');
    process.stderr.write('Please fix the following environment variables:\n');
    process.stderr.write('  - JWT_SECRET: Required\n\n');
    process.exit(1);
  }

  const requiresDurableQueue =
    runningAsWorker &&
    (result.data.NODE_ENV === 'production' ||
      result.data.NODE_ENV === 'staging');
  if (requiresDurableQueue && result.data.QUEUE_BACKEND !== 'postgres') {
    process.stderr.write('\nAPI environment validation failed.\n');
    process.stderr.write('Please fix the following environment variables:\n');
    process.stderr.write(
      '  - QUEUE_BACKEND: Must be postgres for worker in staging/production\n\n',
    );
    process.exit(1);
  }

  assertDocitaOnlyPublicOrigins(result.data);

  EnvConfigStore.setCached(result.data);
  return result.data;
}

export function getEnv(): EnvConfig {
  const cached = EnvConfigStore.getCached();
  if (cached) {
    return cached;
  }
  return validateEnv();
}
