import { z } from 'zod';
import { EnvConfigStore } from './env-config.store';
import { EnvSchema, type EnvConfig } from './env-schema';

export type { EnvConfig };

function isValidationErrorRecord(value: unknown): value is {
  _errors?: unknown;
} {
  return value !== null && typeof value === 'object';
}

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
  // DEPRECATED (Audit 2026-05-23 / S2 inventory): the WHATSAPP_BUSINESS_ACCOUNT_ID
  // fallback exists for legacy deployments that predate the META_ prefix rename.
  // Remove this shim once the next planned secret-rotation cycle has migrated
  // every deployment to META_BUSINESS_ACCOUNT_ID. Until then, no .env.example
  // entry advertises the old name — it survives only to avoid forcing a
  // rotation on a stable environment.
  envToParse.META_BUSINESS_ACCOUNT_ID ??=
    envToParse.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (envToParse.NODE_ENV === 'test') {
    envToParse.DATABASE_URL ??=
      'postgresql://docita:docita@localhost:5434/docita_test';
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

  // Razorpay is required for the API in staging/production — billing routes
  // and webhook verification fail at call time without these. Workers and
  // dev/test environments do not need them.
  const requiresRazorpay =
    !runningAsWorker &&
    (result.data.NODE_ENV === 'production' ||
      result.data.NODE_ENV === 'staging');
  if (requiresRazorpay) {
    const missingRazorpay: string[] = [];
    if (!result.data.RAZORPAY_KEY_ID) missingRazorpay.push('RAZORPAY_KEY_ID');
    if (!result.data.RAZORPAY_KEY_SECRET)
      missingRazorpay.push('RAZORPAY_KEY_SECRET');
    if (!result.data.RAZORPAY_WEBHOOK_SECRET)
      missingRazorpay.push('RAZORPAY_WEBHOOK_SECRET');
    if (missingRazorpay.length > 0) {
      process.stderr.write('\nAPI environment validation failed.\n');
      process.stderr.write('Please fix the following environment variables:\n');
      for (const name of missingRazorpay) {
        process.stderr.write(`  - ${name}: Required in staging/production\n`);
      }
      process.stderr.write('\n');
      process.exit(1);
    }
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
