import type { Appointment } from "@workspace/types";
import type { useCheckInAppointment } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

type CheckInAppointmentMutation = ReturnType<typeof useCheckInAppointment>;

export const CONSULTATION_DASHBOARD_TITLE = "Consultation";
export const CONSULTATION_DASHBOARD_DESCRIPTION =
  "Continue your current visit, open the next patient, or add a walk-in for today.";

/**
 * Derives the consultation dashboard's role-gated view flags from the
 * current user's role and their appointment-creation permission — pulled out
 * of `ConsultationDashboardUI` so the role→visibility mapping is independently
 * testable and the component body only consumes the resulting flags.
 */
export function deriveConsultationDashboardRoles(
  role: string | null | undefined,
  canCreateAppointment: boolean,
): { isDoctor: boolean; isNurse: boolean; canCreateWalkIn: boolean } {
  const resolvedRole = role ?? "RECEPTIONIST";
  const isDoctor = resolvedRole === "DOCTOR" || resolvedRole === "ADMIN_DOCTOR";
  const isReception =
    resolvedRole === "RECEPTIONIST" ||
    resolvedRole === "ADMIN" ||
    resolvedRole === "ADMIN_DOCTOR";
  const isNurse = resolvedRole === "NURSE";
  return {
    isDoctor,
    isNurse,
    canCreateWalkIn: canCreateAppointment && (isReception || isNurse),
  };
}

/**
 * Builds the "schedule a follow-up" appointments href — extracted so the
 * `URLSearchParams` assembly is a pure, testable function independent of the
 * `router.push` call site.
 */
export function buildFollowUpAppointmentHref(
  patientId?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("action", "new");
  if (patientId) {
    params.set("patientId", patientId);
  }
  return `/appointments?${params.toString()}`;
}

/**
 * Builds the walk-in dialog's `onAppointmentAdded` handler — checks the new
 * appointment in immediately, surfacing a toast if either step fails. Pulled
 * out of `ConsultationWalkInDialog` so the async try/catch flow is testable
 * independent of the dialog's render wiring.
 */
export function createWalkInCheckInHandler(
  checkInAppointment: CheckInAppointmentMutation,
): (appointment: Appointment) => Promise<void> {
  return async (appointment) => {
    try {
      if (!appointment.id) {
        showUserFacingErrorToast(
          "Missing appointment id.",
          "Appointment created, but we could not check-in the patient. Please refresh and try again from Appointments.",
          "save",
        );
        return;
      }
      await checkInAppointment.mutateAsync(appointment.id);
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "Appointment created, but we could not check-in the patient. You can check them in from Appointments.",
        "save",
      );
    }
  };
}
