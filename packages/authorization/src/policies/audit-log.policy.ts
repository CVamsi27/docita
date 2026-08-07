// jscpd:ignore-start — intentional mirror of invoice.policy.ts (C4, ADR-0013):
// policies share the posture scaffold (imports + decision ordering); see
// docs/analysis/SUPPRESSION_LEDGER.md.
import type {
  AbacAction,
  AbacDecision,
  AbacPolicy,
} from "../types.js";
import {
  allowDecision,
  denyDecision,
  notApplicableDecision,
} from "../evaluator.js";
import type {
  EnvAttributes,
  ResourceAttributes,
  SubjectAttributes,
} from "@workspace/types/authorization";

/**
 * Roles that may read audit logs within their own clinic. Union of the two
 * audit controllers' role gates (AuditLogsApiAccess: ADMIN + INTERNAL;
 * AuditSummaryApiAccess: ADMIN + ADMIN_DOCTOR + DOCTOR). INTERNAL is handled
 * by the bypass below; RolesGuard runs before PolicyGuard (global guard order
 * in app.module.ts), so the union can never widen the wire contract — the
 * policy is purely additive.
 */
const AUDIT_READER_ROLES = new Set(["ADMIN", "ADMIN_DOCTOR", "DOCTOR"]);

/**
 * Audit-log object-level policy (C5, ADR-0013). Mirrors the current audit
 * surface: tenant-scoped admin read (the controller forces filter.clinicId to
 * the requester's clinic for every non-INTERNAL) with no existence disclosure.
 * The tenant discipline here is the defense-in-depth invariant: on today's
 * list routes the resource clinicId IS the requester's own clinic (the
 * resolver resolves from the authenticated user), so tenant_mismatch never
 * fires on them — it pins the contract for any future `:id` route. Order
 * matters:
 *   1. INTERNAL bypass (cross-clinic read is the INTERNAL job)
 *   2. not-applicable for non-audit-log resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. audit-reader roles (ADMIN / ADMIN_DOCTOR / DOCTOR) same-clinic
 *   5. default-deny (no PATIENT own-row — the audit surface is staff-only)
 * VIEW_PROFILE PHI-read obligations are enforced at the controller layer via
 * logPatientPhiRead (C1 precedent); the policy-emitted obligation adapter is
 * Phase D2 (B5), not this slice.
 */
export class AuditLogAbacPolicy implements AbacPolicy {
  readonly id = "audit-log";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "audit-log") return notApplicableDecision(this.id);

    if (
      subject.clinicId &&
      resource.clinicId &&
      subject.clinicId !== resource.clinicId
    ) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.some((role) => AUDIT_READER_ROLES.has(role))) {
      return allowDecision(this.id);
    }

    return denyDecision(this.id, "role_denied");
  }
}
// jscpd:ignore-end
