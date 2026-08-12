import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";

/** Canonical ABAC action vocabulary (same values the matrix uses). */
export const ABAC_ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "manage",
] as const;
export type AbacAction = (typeof ABAC_ACTIONS)[number];

/**
 * Machine-readable deny reasons. This is the single source; the API's
 * `AuthorizationDenyReason` is a type alias of `AbacReason` so the outward
 * contract stays stable.
 */
export const ABAC_DENY_REASONS = [
  "no_user",
  "no_clinic",
  "subscription_inactive",
  "subscription_billing_locked",
  "feature_not_available",
  "feature_locked",
  "role_denied",
  "permission_denied",
  "ownership_denied",
  "tenant_mismatch",
  "policy_not_found",
] as const;
export type AbacReason = (typeof ABAC_DENY_REASONS)[number];

export type AbacEffect = "allow" | "deny" | "not-applicable";

/** Obligations a policy may emit; the enforcement adapter enforces them after an allow. */
export type AbacObligation =
  | { kind: "audit"; policyId: string; reason: string; action: AbacAction }
  | { kind: "none" };

export interface AbacDecision {
  effect: AbacEffect;
  reason?: AbacReason;
  /** Stable policy id for logs/audit (e.g. "patient"). */
  policyId: string;
  /** Attribute references matched, for audit quality (ids/reasons only, never values). */
  matched?: string[];
  obligations?: AbacObligation[];
}

/**
 * A pure, framework-agnostic policy: evaluates one decision from resolved
 * attributes. Implementations must not import NestJS or Prisma.
 */
export interface AbacPolicy {
  readonly id: string;
  can(
    action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    env: EnvAttributes,
  ): AbacDecision;
}
