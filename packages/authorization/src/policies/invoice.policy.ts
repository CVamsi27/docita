// jscpd:ignore-start — intentional mirror of prescription.policy.ts (C4, ADR-0013):
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

/** Roles that may operate an invoice within their own clinic (legacy InvoicePolicy: only PATIENT gets an object check). */
const CLINICAL_STAFF_ROLES = new Set([
  "DOCTOR",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "LAB",
]);

/**
 * Invoice object-level policy (C4, ADR-0013). Mirrors the legacy InvoicePolicy:
 * PATIENT own-row; all clinical staff clinic-wide after the matrix gates.
 * NO doctor author-of-record branch — the legacy policy has none, so the C3.1
 * question resolved to keep approve-invoice clinic-wide (unlike prescriptions,
 * C4.3). Order matters:
 *   1. INTERNAL bypass
 *   2. not-applicable for non-invoice resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. PATIENT own-row (assignedPatientId === subject.patientId)
 *   5. clinical staff same-clinic
 *   6. default-deny
 */
export class InvoiceAbacPolicy implements AbacPolicy {
  readonly id = "invoice";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "invoice") return notApplicableDecision(this.id);

    if (
      subject.clinicId &&
      resource.clinicId &&
      subject.clinicId !== resource.clinicId
    ) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.includes("PATIENT")) {
      if (
        !resource.assignedPatientId ||
        resource.assignedPatientId !== subject.patientId
      ) {
        return denyDecision(this.id, "ownership_denied");
      }
      return allowDecision(this.id);
    }

    if (subject.roles.some((role) => CLINICAL_STAFF_ROLES.has(role))) {
      return allowDecision(this.id);
    }

    return denyDecision(this.id, "role_denied");
  }
}
// jscpd:ignore-end
