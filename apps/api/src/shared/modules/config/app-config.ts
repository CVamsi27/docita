import { EnvConfigStore } from './env-config.store';
import { EnvSchema, type EnvConfig } from './env-schema';
import {
  assertDocitaOnlyPublicOrigins,
  assertRuntimeSecretRequirements,
  createEnvToParse,
  writeSchemaValidationFailure,
} from './app-config-validation';

export type { EnvConfig };

export const WORKER_JWT_MODULE_PLACEHOLDER_SECRET =
  'worker-jwt-placeholder-not-used-for-http-auth-32chars-min';

export function isDevelopment(): boolean {
  return (process.env.NODE_ENV || 'development') === 'development';
}

export function getCorsOrigins(): (string | RegExp)[] {
  const env = validateEnv();
  const parsed = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!isDevelopment()) {
    return parsed;
  }

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

  const envToParse = createEnvToParse(process.env);
  const result = EnvSchema.safeParse(envToParse);

  if (!result.success) {
    const formatted = result.error.format();

    if (envToParse.NODE_ENV === 'test') {
      throw new Error(
        `API environment validation failed for tests: ${JSON.stringify(formatted)}`,
      );
    }

    writeSchemaValidationFailure(formatted);
    process.exit(1);
  }

  assertRuntimeSecretRequirements(result.data);
  assertDocitaOnlyPublicOrigins(result.data);

  EnvConfigStore.setCached(result.data);
  return result.data;
}

export function getEnv(): EnvConfig {
  const cached = EnvConfigStore.getCached();
  if (cached) return cached;
  return validateEnv();
}
