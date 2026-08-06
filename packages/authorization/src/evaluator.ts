import type {
  AbacAction,
  AbacDecision,
  AbacPolicy,
  AbacReason,
} from "./types.js";
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";

export interface EvaluateInput {
  action: AbacAction;
  subject: SubjectAttributes;
  resource: ResourceAttributes;
  env: EnvAttributes;
}

/** Evaluate a single policy against fully-resolved attributes. */
export function evaluatePolicy(
  policy: AbacPolicy,
  input: EvaluateInput,
): AbacDecision {
  return policy.can(input.action, input.subject, input.resource, input.env);
}

/**
 * Deny-overrides combinator with default-deny: any active deny denies;
 * else any allow allows; else (empty / all not-applicable) deny.
 */
export function denyOverrides(decisions: AbacDecision[]): AbacDecision {
  const active = decisions.filter((d) => d.effect !== "not-applicable");
  const deny = active.find((d) => d.effect === "deny");
  if (deny) return deny;
  const allow = active.find((d) => d.effect === "allow");
  return (
    allow ?? {
      effect: "deny",
      policyId: "default-deny",
      reason: "role_denied",
    }
  );
}

export function allowDecision(policyId: string): AbacDecision {
  return { effect: "allow", policyId };
}

export function denyDecision(
  policyId: string,
  reason: AbacReason,
): AbacDecision {
  return { effect: "deny", policyId, reason };
}

export function notApplicableDecision(policyId: string): AbacDecision {
  return { effect: "not-applicable", policyId };
}
