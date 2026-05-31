import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
} from '@workspace/auth';

export const AUTH_CONSTANTS = {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  MFA_CHALLENGE_TTL_MS: 5 * 60 * 1000,
  MFA_BACKUP_CODE_COUNT: 10,
  PASSWORD_RESET_TTL_MS: 30 * 60 * 1000,
  PASSWORD_EXPIRY_DAYS: 90,
  PASSWORD_HISTORY_COUNT: 5,
} as const;

/** Human-readable password-reset link TTL for outbound email copy. */
export function formatPasswordResetTtlLabel(): string {
  const minutes = AUTH_CONSTANTS.PASSWORD_RESET_TTL_MS / (60 * 1000);
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${minutes} minutes`;
}

export const CACHE_CONSTANTS = {
  CLINIC_AUTH_TTL_MS: 5 * 60 * 1000,
  MAX_CLINIC_AUTH_CACHE_SIZE: 1000,
} as const;

export const DATABASE_CONSTANTS = {
  SLOW_QUERY_THRESHOLD_MS: 500,
  POOL_MAX_PRODUCTION: 15,
  POOL_MAX_DEVELOPMENT: 5,
  POOL_IDLE_TIMEOUT_PRODUCTION_MS: 300_000,
  POOL_IDLE_TIMEOUT_DEVELOPMENT_MS: 30_000,
  CONNECTION_TIMEOUT_MS: 10_000,
  /** Default interactive transaction pool wait (Prisma default is 2s). */
  TRANSACTION_MAX_WAIT_MS: 8_000,
  TRANSACTION_TIMEOUT_MS: 30_000,
  /**
   * Per-request RLS envelope (TenantContextInterceptor) must cover slow list
   * endpoints; Prisma default execution timeout is only 5s.
   */
  RLS_REQUEST_TRANSACTION_MAX_WAIT_MS: 10_000,
  RLS_REQUEST_TRANSACTION_TIMEOUT_MS: 60_000,
  /** Auth refresh is high-volume; allow extra pool wait + one retry under contention. */
  AUTH_REFRESH_TRANSACTION_MAX_WAIT_MS: 12_000,
  AUTH_REFRESH_TRANSACTION_TIMEOUT_MS: 15_000,
  AUTH_REFRESH_TRANSACTION_MAX_ATTEMPTS: 2,
  AUTH_REFRESH_TRANSACTION_RETRY_DELAY_MS: 75,
} as const;

export const ENCRYPTION_CONSTANTS = {
  ALGORITHM: 'aes-256-gcm' as const,
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
} as const;
