import { getCurrentTenant } from '@/shared/common/middleware/tenant.middleware';
import {
  applyTenantScopeForTest,
  coerceTenantExtensionArgs,
} from '@/shared/common/extensions/tenant-scope-policy';

/** Keeps persistence doubles subject to the production unique-read policy. */
export function assertTenantQualifiedRead(
  model: string,
  args: unknown,
  fixtureClinicId: string,
): void {
  applyTenantScopeForTest(
    model,
    'findUnique',
    coerceTenantExtensionArgs(args),
    getCurrentTenant()?.clinicId ?? fixtureClinicId,
  );
}
