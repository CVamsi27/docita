import { z } from 'zod';
import { EnvSchema } from './env-schema';

function isValidationErrorRecord(value: unknown): value is {
  _errors?: unknown;
} {
  return value !== null && typeof value === 'object';
}

export function createEnvToParse(source: NodeJS.ProcessEnv) {
  const envToParse = { ...source };
  envToParse.META_BUSINESS_ACCOUNT_ID ??=
    envToParse.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (envToParse.NODE_ENV !== 'test') {
    return envToParse;
  }

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

  return envToParse;
}

export function assertDocitaOnlyPublicOrigins(
  config: z.infer<typeof EnvSchema>,
): void {
  if (config.NODE_ENV !== 'production' && config.NODE_ENV !== 'staging') {
    return;
  }

  assertDocitaCorsOrigins(config.CORS_ORIGINS);
  assertDocitaUrl('APP_URL', config.APP_URL);
  assertDocitaUrl('NEXT_PUBLIC_APP_URL', config.NEXT_PUBLIC_APP_URL);
  assertDocitaUrl('NEXT_PUBLIC_API_URL', config.NEXT_PUBLIC_API_URL);
}

export function writeSchemaValidationFailure(
  formatted: z.ZodFormattedError<z.infer<typeof EnvSchema>>,
) {
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
}

export function assertRuntimeSecretRequirements(
  config: z.infer<typeof EnvSchema>,
) {
  const runningAsWorker = config.WORKER_ENTRYPOINT === 'worker';
  assertJwtSecret(config, runningAsWorker);
  assertRazorpaySecrets(config, runningAsWorker);
  assertDurableWorkerQueue(config, runningAsWorker);
}

function assertDocitaCorsOrigins(corsOriginsValue: string) {
  const corsOrigins = corsOriginsValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of corsOrigins) {
    if (!/^https:\/\/([a-z0-9-]+\.)*docita\.work$/i.test(origin)) {
      process.stderr.write('\nAPI environment validation failed.\n');
      process.stderr.write(
        `CORS_ORIGINS must list https://*.docita.work hosts only. Invalid entry: ${origin}\n\n`,
      );
      process.exit(1);
    }
  }
}

function assertDocitaUrl(key: string, value: string) {
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

function assertJwtSecret(
  config: z.infer<typeof EnvSchema>,
  runningAsWorker: boolean,
) {
  if (!runningAsWorker && !config.JWT_SECRET) {
    process.stderr.write('\nAPI environment validation failed.\n');
    process.stderr.write('Please fix the following environment variables:\n');
    process.stderr.write('  - JWT_SECRET: Required\n\n');
    process.exit(1);
  }
}

function assertRazorpaySecrets(
  config: z.infer<typeof EnvSchema>,
  runningAsWorker: boolean,
) {
  const requiresRazorpay =
    !runningAsWorker &&
    (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging');
  if (!requiresRazorpay) {
    return;
  }

  const missingRazorpay: string[] = [];
  if (!config.RAZORPAY_KEY_ID) missingRazorpay.push('RAZORPAY_KEY_ID');
  if (!config.RAZORPAY_KEY_SECRET) missingRazorpay.push('RAZORPAY_KEY_SECRET');
  if (!config.RAZORPAY_WEBHOOK_SECRET)
    missingRazorpay.push('RAZORPAY_WEBHOOK_SECRET');
  if (missingRazorpay.length === 0) {
    return;
  }

  process.stderr.write('\nAPI environment validation failed.\n');
  process.stderr.write('Please fix the following environment variables:\n');
  for (const name of missingRazorpay) {
    process.stderr.write(`  - ${name}: Required in staging/production\n`);
  }
  process.stderr.write('\n');
  process.exit(1);
}

function assertDurableWorkerQueue(
  config: z.infer<typeof EnvSchema>,
  runningAsWorker: boolean,
) {
  const requiresDurableQueue =
    runningAsWorker &&
    (config.NODE_ENV === 'production' || config.NODE_ENV === 'staging');
  if (requiresDurableQueue && config.QUEUE_BACKEND !== 'postgres') {
    process.stderr.write('\nAPI environment validation failed.\n');
    process.stderr.write('Please fix the following environment variables:\n');
    process.stderr.write(
      '  - QUEUE_BACKEND: Must be postgres for worker in staging/production\n\n',
    );
    process.exit(1);
  }
}
