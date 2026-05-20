import { Prisma } from '@workspace/db';
import { getCurrentTenant } from '@/shared/common/middleware/tenant.middleware';
import {
  applyTenantScopeForTest,
  getTenantScopeRule,
  type TenantExtensionArgs,
} from './tenant-scope-policy';

export const tenantExtension = Prisma.defineExtension({
  name: 'tenant-extension',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const rule = getTenantScopeRule(model);
        if (!rule) {
          return query(args);
        }

        const tenant = getCurrentTenant();

        if (tenant?.bypassed) {
          return query(args);
        }

        if (!tenant?.clinicId) {
          /**
           * Pre-tenant access is allowed only for self-scoped `User` operations.
           * This supports authenticated users who don't yet belong to a clinic
           * (e.g. onboarding step selection) without granting blanket bypass.
           */
          if (
            tenant?.preTenant &&
            model === 'User' &&
            tenant.userId &&
            (operation === 'findUnique' ||
              operation === 'findUniqueOrThrow' ||
              operation === 'findFirst' ||
              operation === 'findFirstOrThrow' ||
              operation === 'update')
          ) {
            const typedArgs = args as TenantExtensionArgs;
            const where = typedArgs.where ?? {};
            if (where['id'] !== tenant.userId) {
              throw new Error(
                `Security Violation: Pre-tenant access to '${model}' must be scoped to the authenticated user.`,
              );
            }
            return query(args);
          }

          throw new Error(
            `Security Violation: Attempted to access tenant-scoped model '${model}' without a valid tenant context.`,
          );
        }

        const typedArgs = args as TenantExtensionArgs;

        applyTenantScopeForTest(model, operation, typedArgs, tenant.clinicId);

        return query(args);
      },
    },
  },
});
