import { DATABASE_CONSTANTS } from '@/shared/modules/config/app-constants';
import type { Prisma } from '@workspace/db';

export function getDefaultTransactionOptions(): Prisma.TransactionOptions {
  return {
    maxWait: DATABASE_CONSTANTS.TRANSACTION_MAX_WAIT_MS,
    timeout: DATABASE_CONSTANTS.TRANSACTION_TIMEOUT_MS,
  };
}

/** Whole HTTP request under TenantContextInterceptor + RLS GUC scope. */
export function getRlsRequestTransactionOptions(): Prisma.TransactionOptions {
  return {
    maxWait: DATABASE_CONSTANTS.RLS_REQUEST_TRANSACTION_MAX_WAIT_MS,
    timeout: DATABASE_CONSTANTS.RLS_REQUEST_TRANSACTION_TIMEOUT_MS,
  };
}

export function getAuthRefreshTransactionOptions(): Prisma.TransactionOptions {
  return {
    maxWait: DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_MAX_WAIT_MS,
    timeout: DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_TIMEOUT_MS,
  };
}
