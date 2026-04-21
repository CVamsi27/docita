export type RestrictionRole =
  | "INTERNAL"
  | "ADMIN"
  | "ADMIN_DOCTOR"
  | "DOCTOR"
  | "NURSE"
  | "RECEPTIONIST"
  | "PATIENT";

export interface DoctorScopeResolutionInput {
  role?: RestrictionRole | string | null;
  userId?: string | null;
  requestedDoctorId?: string | null;
}

export interface DoctorScopeResolution {
  denied: boolean;
  scopedDoctorId?: string;
}

export const DOCTOR_SCOPED_APPOINTMENT_ROLES: ReadonlySet<string> = new Set([
  "DOCTOR",
]);

export const CLINIC_WIDE_APPOINTMENT_ROLES: ReadonlySet<string> = new Set([
  "ADMIN",
  "ADMIN_DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "INTERNAL",
]);

export const isDoctorScopedAppointmentRole = (
  role?: RestrictionRole | string | null,
): boolean => {
  if (!role) return false;
  return DOCTOR_SCOPED_APPOINTMENT_ROLES.has(role);
};

export const isClinicWideAppointmentRole = (
  role?: RestrictionRole | string | null,
): boolean => {
  if (!role) return false;
  return CLINIC_WIDE_APPOINTMENT_ROLES.has(role);
};

export const resolveDoctorScopedAppointmentFilter = (
  input: DoctorScopeResolutionInput,
): DoctorScopeResolution => {
  const { role, userId, requestedDoctorId } = input;
  const normalizedRequestedDoctorId = requestedDoctorId?.trim();

  if (!isDoctorScopedAppointmentRole(role)) {
    return {
      denied: false,
      scopedDoctorId: normalizedRequestedDoctorId || undefined,
    };
  }

  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    return { denied: true };
  }

  return {
    denied: false,
    scopedDoctorId: normalizedUserId,
  };
};
