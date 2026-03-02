import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  clinicId?: string;
  userId?: string;
  bypassed?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getCurrentTenant(): TenantContext | undefined {
  return tenantStorage.getStore();
}

export function getClinicIdOrFail(): string {
  const context = getCurrentTenant();
  if (!context?.clinicId) {
    throw new Error('No tenant context available');
  }
  return context.clinicId;
}

export function runWithTenant<T>(context: TenantContext, fn: () => T): T {
  return tenantStorage.run(context, fn);
}
