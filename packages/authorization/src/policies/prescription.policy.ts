// jscpd:ignore-start — intentional mirror of appointment.policy.ts (C3, ADR-0013):
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

/** Roles that may operate a prescription within their own clinic (legacy PrescriptionPolicy: only DOCTOR/PATIENT get object checks). */
const CLINICAL_STAFF_ROLES = new Set([
  "DOCTOR",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "LAB",
]);

/**
 * Prescription object-level policy (C3, ADR-0013). Mirrors the legacy
 * PrescriptionPolicy: PATIENT own-row read-only; DOCTOR author-of-record on
 * update/delete (sign maps to update at the enforcement stage); other
 * clinical staff clinic-wide after the matrix gates. Read retains the matrix
 * roles — a non-author DOCTOR may read any clinic prescription.
 * Order matters:
 *   1. INTERNAL bypass
 *   2. not-applicable for non-prescription resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. PATIENT own-row (assignedPatientId === subject.patientId), read-only
 *   5. DOCTOR author-of-record on update/delete (assignedDoctorIds derived
 *      from prescription.doctorId; unconditional, a prescription always
 *      carries its author)
 *   6. clinical staff same-clinic
 *   7. default-deny
 */
export class PrescriptionAbacPolicy implements AbacPolicy {
  readonly id = "prescription";

  can(
    action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "prescription") return notApplicableDecision(this.id);

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
      if (action !== "read") return denyDecision(this.id, "role_denied");
      return allowDecision(this.id);
    }

    if (
      subject.roles.includes("DOCTOR") &&
      (action === "update" || action === "delete")
    ) {
      if (
        !subject.doctorId ||
        !resource.assignedDoctorIds.includes(subject.doctorId)
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
