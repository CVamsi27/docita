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

/** Roles that may operate an appointment within their own clinic (legacy AppointmentPolicy: only DOCTOR/PATIENT get object checks). */
const CLINICAL_STAFF_ROLES = new Set([
  "DOCTOR",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "LAB",
]);

/**
 * Appointment object-level policy (C2, ADR-0013). Mirrors the legacy
 * AppointmentPolicy: DOCTOR scoped to assigned appointments, PATIENT
 * own-row, other clinical staff clinic-wide after the matrix gates.
 * Order matters:
 *   1. INTERNAL bypass
 *   2. not-applicable for non-appointment resources
 *   3. tenant discipline (cross-clinic → PolicyGuard 404, no existence disclosure)
 *   4. PATIENT own-row (assignedPatientId === subject.patientId)
 *   5. DOCTOR assignment (assignedDoctorIds derived from appointment.doctorId;
 *      unconditional — an appointment always carries its doctor)
 *   6. clinical staff same-clinic
 *   7. default-deny
 * Status-based write locks (no-show/completed) are DEFERRED by recorded
 * decision (ADR-0013, C2.1): no service-layer guard exists today, so
 * enforcing them would tighten staff behavior beyond the legacy policy.
 */
export class AppointmentAbacPolicy implements AbacPolicy {
  readonly id = "appointment";

  can(
    _action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    _env: EnvAttributes,
  ): AbacDecision {
    if (subject.roles.includes("INTERNAL")) return allowDecision(this.id);

    if (resource.type !== "appointment") return notApplicableDecision(this.id);

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

    if (subject.roles.includes("DOCTOR")) {
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
