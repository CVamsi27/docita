import { DATABASE_CONSTANTS } from '@/shared/modules/config/app-constants';

/** Prisma interactive transaction / client `transactionOptions` shape. */
export type InteractiveTransactionOptions = {
  maxWait?: number;
  timeout?: number;
};

export function getDefaultTransactionOptions(): InteractiveTransactionOptions {
  return {
    maxWait: DATABASE_CONSTANTS.TRANSACTION_MAX_WAIT_MS,
    timeout: DATABASE_CONSTANTS.TRANSACTION_TIMEOUT_MS,
  };
}

/** Whole HTTP request under TenantContextInterceptor + RLS GUC scope. */
export function getRlsRequestTransactionOptions(): InteractiveTransactionOptions {
  return {
    maxWait: DATABASE_CONSTANTS.RLS_REQUEST_TRANSACTION_MAX_WAIT_MS,
    timeout: DATABASE_CONSTANTS.RLS_REQUEST_TRANSACTION_TIMEOUT_MS,
  };
}

export function getAuthRefreshTransactionOptions(): InteractiveTransactionOptions {
  return {
    maxWait: DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_MAX_WAIT_MS,
    timeout: DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_TIMEOUT_MS,
  };
}
