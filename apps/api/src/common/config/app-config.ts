import { z } from 'zod';

/**
 * Environment variable validation schema.
 * Validates all required and optional env vars at startup.
 * Uses Zod for type-safe validation with clear error messages.
 */
export const EnvSchema = z.object({
  // Required - App will not start without these
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(1, 'JWT_SECRET is required')
    .refine((val) => {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd && val.length < 32) return false;
      return true;
    }, 'JWT_SECRET must be at least 32 characters in production'),
  ENCRYPTION_KEY: z
    .string()
    .min(1, 'ENCRYPTION_KEY is required')
    .length(64, 'ENCRYPTION_KEY must be exactly 64 hex characters (256-bit)')
    .regex(/^[0-9a-fA-F]+$/, 'ENCRYPTION_KEY must be a valid hex string'),

  // Optional with defaults
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Optional - Features gracefully degrade if not set
  APP_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  // Payment (Razorpay)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // WhatsApp (Meta)
  META_ACCESS_TOKEN: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),

  // AI
  AI_API_KEY: z.string().optional(),

  // Google Cloud (OCR)
  GOOGLE_CLOUD_PROJECT_ID: z.string().optional(),
  GOOGLE_CLOUD_CREDENTIALS_JSON: z.string().optional(),

  // OCR Thresholds
  OCR_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
  OCR_MEDICAL_FIELD_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  OCR_CONTACT_FIELD_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),

  // Redis
  REDIS_URL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

let validatedEnv: EnvConfig | null = null;

/**
 * Validates environment variables at startup.
 * Call this before starting the application.
 * Exits with code 1 if validation fails.
 */
export function validateEnv(): EnvConfig {
  if (validatedEnv) return validatedEnv;

  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Environment configuration validation failed:\n');
    const formatted = result.error.format();

    // Print each error in a readable format
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

    console.error(
      '\nPlease check your .env file and ensure all required variables are set.',
    );
    console.error('See .env.example for a template.\n');
    process.exit(1);
  }

  validatedEnv = result.data;
  return validatedEnv;
}

/**
 * Gets a validated environment variable.
 * Must call validateEnv() first.
 */
export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    throw new Error(
      'Environment not validated. Call validateEnv() before accessing env vars.',
    );
  }
  return validatedEnv;
}

export function getCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map((origin) => origin.trim());
  }

  return [
    'https://landing.docita.work',
    'https://app.docita.work',
    'https://admin.docita.work',
    'http://localhost:3003', // landing dev
    'http://localhost:3000', // app dev
    'http://localhost:3002', // admin dev
    'http://127.0.0.1:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
  ];
}
export function getWebSocketCorsOrigins(): string[] {
  return getCorsOrigins();
}
export function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}
export function getPaymentCallbackUrl(): string {
  return `${getAppUrl()}/api/payment/callback`;
}
export function getFrontendAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}
export const CONFIG = {
  APP_URL: getAppUrl(),
  FRONTEND_APP_URL: getFrontendAppUrl(),
  ENVIRONMENT: getEnvironment(),

  // CORS
  CORS_ORIGINS: getCorsOrigins(),
  CORS_CREDENTIALS: true,
  CORS_METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  CORS_ALLOWED_HEADERS: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Cache-Control',
  ],

  // Payment
  PAYMENT_CALLBACK_URL: getPaymentCallbackUrl(),

  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,

  // OCR Configuration
  OCR_CONFIDENCE_THRESHOLD: parseFloat(
    process.env.OCR_CONFIDENCE_THRESHOLD || '0.75',
  ),
  OCR_MEDICAL_FIELD_THRESHOLD: parseFloat(
    process.env.OCR_MEDICAL_FIELD_THRESHOLD || '0.8',
  ),
  OCR_CONTACT_FIELD_THRESHOLD: parseFloat(
    process.env.OCR_CONTACT_FIELD_THRESHOLD || '0.65',
  ),

  // Google Cloud Vision
  GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
  GOOGLE_CLOUD_CREDENTIALS_JSON: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON,
} as const;

export default {
  getCorsOrigins,
  getWebSocketCorsOrigins,
  getAppUrl,
  getPaymentCallbackUrl,
  getFrontendAppUrl,
  getEnvironment,
  isProduction,
  isDevelopment,
  validateEnv,
  getEnv,
  CONFIG,
};
