import type { Patient } from "@workspace/types";
import { DEFAULT_TIMEZONE, formatClinicPickerDayIsoFromSelection, formatClinicTodayPickerIso } from "@workspace/utils";
import { defaultStartIsoForSelectedCalendarDay } from "@/features/appointments/lib/calendar-slot-local-iso";
import { isDoctor } from "@/lib/auth/permissions";

export function mergePatientsWithPreselected(
  searchedPatients: Patient[],
  preselectedPatient: Patient | undefined,
  preselectedPatientId: string | undefined,
): Patient[] {
  if (preselectedPatient && preselectedPatientId) {
    const hasPreselected = searchedPatients.some(
      (p) => p.id === preselectedPatientId,
    );
    if (!hasPreselected) {
      return [preselectedPatient, ...searchedPatients];
    }
  }
  return searchedPatients;
}

export function getClinicTimezoneOrDefault(clinic: { timezone?: string | null } | undefined | null): string {
  const trimmed = clinic?.timezone?.trim();
  return trimmed || DEFAULT_TIMEZONE;
}

export function computeFilteredDoctors<T extends { id: string }>(
  doctors: T[],
  unavailableIds: Set<string>,
): T[] {
  return doctors.filter((d) => !unavailableIds.has(d.id));
}

export function buildDefaultAppointmentValues(params: {
  selectedDate?: Date;
  startHour: number;
  endHour: number;
  clinicTimezone: string;
  defaultDoctorId?: string;
  unavailableIds: Set<string>;
  user: { id: string; clinicId: string; role: string } | undefined;
  filteredDoctors: { id: string }[];
  preselectedPatientId?: string;
}) {
  let defaultStart = "";

  if (params.selectedDate) {
    defaultStart = defaultStartIsoForSelectedCalendarDay(
      params.selectedDate,
      params.startHour,
      params.endHour,
      params.clinicTimezone,
    );
  } else {
    const todayStr = formatClinicTodayPickerIso(params.clinicTimezone);
    defaultStart = defaultStartIsoForSelectedCalendarDay(
      todayStr,
      params.startHour,
      params.endHour,
      params.clinicTimezone,
    );
  }

  let resolvedDoctorId = "";
  if (params.defaultDoctorId && !params.unavailableIds.has(params.defaultDoctorId)) {
    resolvedDoctorId = params.defaultDoctorId;
  } else if (isDoctor(params.user?.role)) {
    resolvedDoctorId = params.user?.id && !params.unavailableIds.has(params.user.id) ? params.user.id : "";
  } else if (params.filteredDoctors.length > 0) {
    resolvedDoctorId = params.filteredDoctors[0]?.id || "";
  }

  return {
    patientId: params.preselectedPatientId || "",
    doctorId: resolvedDoctorId,
    clinicId: params.user?.clinicId || "",
    startTime: defaultStart,
    endTime: "",
    status: "scheduled" as const,
    type: "consultation" as const,
    notes: "",
  };
}

export function computeBlockingSlotsFromAppointments<T extends { startTime: string | Date; endTime: string | Date; status: string }>(
  appointments: T[] | undefined,
) {
  const items = appointments ?? [];
  return items.map((a) => ({
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
  }));
}

export function computeDateKey(
  date: Date | undefined,
  timezone: string,
): string | undefined {
  return date
    ? formatClinicPickerDayIsoFromSelection(date, timezone)
    : undefined;
}

export function toUnavailableIdSet(
  doctorIds: string[] | undefined,
): Set<string> {
  return new Set(doctorIds ?? []);
}

export function buildFormResetValues(
  open: boolean | undefined,
  selectedDate: Date | undefined,
  defaultValues: ReturnType<typeof buildDefaultAppointmentValues>,
) {
  if (open && selectedDate != null) {
    return { ...defaultValues, startTime: "", endTime: "" };
  }
  return defaultValues;
}

export function findNextAvailableDoctor(
  currentDoctorId: string | undefined,
  unavailableIds: Set<string>,
  filteredDoctors: { id: string }[],
): string {
  if (!currentDoctorId || !unavailableIds.has(currentDoctorId)) {
    return currentDoctorId ?? "";
  }
  return filteredDoctors[0]?.id ?? "";
}

export function computeAvailabilitySlotsReady(
  open: boolean | undefined,
  selectedDate: Date | undefined,
  watchedDoctorId: string | undefined,
  slotsQuerySuccess: boolean,
  slotsQueryError: boolean,
): boolean {
  return Boolean(
    open && selectedDate && watchedDoctorId && slotsQuerySuccess && !slotsQueryError,
  );
}

export function computeIsResolvingDefaultSlot(
  open: boolean | undefined,
  selectedDate: Date | undefined,
  watchedDoctorId: string | undefined,
  slotsQueryError: boolean,
  slotsQuerySuccess: boolean,
): boolean {
  return Boolean(
    open && selectedDate && watchedDoctorId && !slotsQueryError && !slotsQuerySuccess,
  );
}

export function shouldUpdatePreselectedPatient(
  open: boolean | undefined,
  preselectedPatientId: string | undefined,
  lastPreselectedPatientId: string | undefined,
  patientFieldIsDirty: boolean,
): boolean {
  if (!open) return false;
  if (preselectedPatientId === lastPreselectedPatientId) return false;
  if (!preselectedPatientId) return false;
  return !patientFieldIsDirty;
}

export function buildCurrentUserForAppointment(
  user: { id: string; clinicId?: string | null; role: string } | null | undefined,
): { id: string; clinicId: string; role: string } | undefined {
  if (!user) return undefined;
  return { id: user.id, clinicId: user.clinicId ?? "", role: user.role };
}


