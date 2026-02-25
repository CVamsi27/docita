import { z } from 'zod';

export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_READ_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(64),
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  APP_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
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
  EMAIL_FROM: z.string().default('Docita <noreply@docita.work>'),
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_CREDENTIALS_JSON: z.string().optional(),
  OCR_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
  OCR_MEDICAL_FIELD_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  OCR_CONTACT_FIELD_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
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
  CLINIC_NAME: z.string().default('Docita Clinic'),
  CLINIC_ADDRESS: z.string().optional(),
  CLINIC_PHONE: z.string().optional(),
  CLINIC_EMAIL: z.string().optional(),
  CLINIC_WEBSITE: z.string().optional(),
  CLINIC_GSTIN: z.string().optional(),
  PAYMENT_TTL: z.coerce.number().default(3600),
  PAYMENT_LINK_TTL_MINUTES: z.coerce.number().default(15),
  PAYMENT_RETRY_MAX_ATTEMPTS: z.coerce.number().default(3),
  PAYMENT_RETRY_BACKOFF_MULTIPLIER: z.coerce.number().default(24),
  QUEUE_PROVIDER: z.enum(['bull', 'memory']).default('memory'),
  CACHE_PROVIDER: z.enum(['redis', 'memory']).default('memory'),
  BULK_IMPORT_MAX_FILE_SIZE: z.coerce.number().default(52428800),
  BULK_IMPORT_MAX_ROWS: z.coerce.number().default(100000),
  BULK_IMPORT_RATE_LIMIT_INTERVAL: z.coerce.number().default(300),
  SLOW_QUERY_THRESHOLD_MS: z.coerce.number().default(1000),
  REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function isDevelopment(): boolean {
  return (process.env.NODE_ENV || 'development') === 'development';
}

export function getCorsOrigins(): (string | RegExp)[] {
  const envOrigins = process.env.CORS_ORIGINS;
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

export function getWebSocketCorsOrigins(): (string | RegExp)[] {
  return getCorsOrigins();
}

let validatedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (validatedEnv) return validatedEnv;

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n Environment configuration validation failed:\n');
    const formatted = result.error.format();

    Object.entries(formatted).forEach(([key, value]) => {
      if (
        key !== '_errors' &&
        typeof value === 'object' &&
        '_errors' in value
      ) {
        const errors = (value as { _errors: string[] })._errors;
        if (errors.length > 0) {
          console.error(`  • ${key}: ${errors.join(', ')}`);
        }
      }
    });

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
