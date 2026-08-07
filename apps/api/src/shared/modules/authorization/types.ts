import type { AbacReason } from '@workspace/authorization';

export type AuthorizationDenyReason = AbacReason;

export type AuthorizationDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: AuthorizationDenyReason;
      detail?: Record<string, unknown>;
    };
