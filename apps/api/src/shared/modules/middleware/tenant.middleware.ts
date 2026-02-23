import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context stored in AsyncLocalStorage
 */
interface TenantContext {
  clinicId?: string;
  userId?: string;
  bypassed?: boolean;
}

/**
 * AsyncLocalStorage instance for tenant context
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get the current tenant context
 */
export function getCurrentTenant(): TenantContext | undefined {
  return tenantStorage.getStore();
}

/**
 * Get the current clinic ID or throw
 */
export function getClinicIdOrFail(): string {
  const context = getCurrentTenant();
  if (!context?.clinicId) {
    throw new Error('No tenant context available');
  }
  return context.clinicId;
}

/**
 * Run a function within a tenant context
 */
export function runWithTenant<T>(context: TenantContext, fn: () => T): T {
  return tenantStorage.run(context, fn);
}
