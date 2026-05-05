import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  clinicId?: string;
  userId?: string;
  bypassed?: boolean;
  /**
   * Pre-tenant mode for authenticated users who do not yet belong to a clinic.
   * This must never allow access to clinic-scoped models; it exists only to
   * support limited self-scoped account flows (e.g. onboarding step selection).
   */
  preTenant?: boolean;
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
