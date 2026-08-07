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

/** Roles that may operate a patient record within their own clinic. */
const CLINICAL_STAFF_ROLES = new Set([
  "DOCTOR",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "LAB",
]);

/**
 * Patient object-level policy. Order matters:
 *   1. INTERNAL bypass (mirrors the legacy AuthorizationService guard semantics)
 *   2. not-applicable for non-patient resources
 *   3. tenant discipline (cross-clinic → deny, no existence disclosure)
 *   4. PATIENT own-row (Patient.userId === subject.userId — PatientDoctorGuard semantics)
 *   5. doctor assignment-pinning, only when resource.requiresAssignment is set
 *      AND the subject is a plain DOCTOR (ADMIN_DOCTOR/NURSE/RECEPTIONIST/ADMIN
 *      bypass per the legacy PatientDoctorGuard — C1 phase-2, ADR-0013)
 *   6. clinical staff same-clinic (current effective behavior)
 *   7. default-deny
 */
export class PatientAbacPolicy implements AbacPolicy {
  readonly id = "patient";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "patient") return notApplicableDecision(this.id);

    if (
      subject.clinicId &&
      resource.clinicId &&
      subject.clinicId !== resource.clinicId
    ) {
      return denyDecision(this.id, "tenant_mismatch");
    }

    if (subject.roles.includes("PATIENT")) {
      if (!resource.ownerId || resource.ownerId !== subject.userId) {
        return denyDecision(this.id, "ownership_denied");
      }
      return allowDecision(this.id);
    }

    if (resource.requiresAssignment && subject.roles.includes("DOCTOR")) {
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
