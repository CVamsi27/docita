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

/** Roles that may operate a lab order within their own clinic (matrix roles: API_LAB_TESTS / API_LAB_WORKSPACE). */
const CLINICAL_STAFF_ROLES = new Set([
  "DOCTOR",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "LAB",
]);

/**
 * Lab-order object-level policy (C4, ADR-0013). Mirrors the current
 * lab-workflow wire contract: clinic-scoped 404 via getOrderById + matrix
 * roles; LAB is clinic-wide on object routes today (labId scoping exists only
 * on the list queue). Order matters:
 *   1. INTERNAL bypass
 *   2. not-applicable for non-lab-order resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. PATIENT own-row (assignedPatientId === subject.patientId — portal parity)
 *   5. clinical staff same-clinic (incl. LAB)
 *   6. default-deny
 * C4.1 DEFERS assignment pinning (LAB → LabTestOrder.labId) and payment-state
 * conditions: no service-layer guard exists today, so enforcing them would
 * tighten LAB/staff behavior beyond the legacy contract. The `status`
 * attribute carries LabTestOrderStatus (populated, not enforced); the oracle
 * rows + e2e pin the baseline and must flip in the same commit as the
 * decision.
 */
export class LabOrderAbacPolicy implements AbacPolicy {
  readonly id = "lab-order";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "lab-order") return notApplicableDecision(this.id);

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
