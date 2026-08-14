import { SetMetadata } from '@nestjs/common';
import type { AbacAction } from '@workspace/authorization';

export const REQUIRE_POLICY_KEY = 'requirePolicy';

export interface RequirePolicyMetadata {
  resource: string;
  action: AbacAction;
}

/** Declares the ABAC resource+action posture for a route (additive to @Roles/@RequireFeature). */
export const RequirePolicy = (resource: string, action: AbacAction) =>
  SetMetadata(REQUIRE_POLICY_KEY, {
    resource,
    action,
  } satisfies RequirePolicyMetadata);
