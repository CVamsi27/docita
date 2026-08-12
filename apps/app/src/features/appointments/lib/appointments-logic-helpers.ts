import {
  addDays,
  endOfMonth,
  formatClinicPickerDayIsoFromSelection,
  formatUtcInstantAsClinicPickerIso,
  startOfMonth,
  subDays,
} from "@workspace/utils";
import type { AppointmentListItem } from "@workspace/data-access";
import { VISIBLE_APPOINTMENT_STATUS_QUERY } from "@workspace/types";

export function computeMonthRangeQueryOptions(
  calendarMonth: Date,
  clinicTz: string,
  scopedDoctorId?: string,
) {
  const rangeStart = subDays(startOfMonth(calendarMonth), 7);
  const rangeEnd = addDays(endOfMonth(calendarMonth), 7);
  return {
    startDate: formatClinicPickerDayIsoFromSelection(rangeStart, clinicTz),
    endDate: formatClinicPickerDayIsoFromSelection(rangeEnd, clinicTz),
    ...(scopedDoctorId ? { doctorId: scopedDoctorId } : {}),
    status: VISIBLE_APPOINTMENT_STATUS_QUERY,
    limit: 500,
  };
}

export function computeAppointmentCountsByDay(
  items: AppointmentListItem[] | undefined,
  clinicTz: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const apt of items ?? []) {
    const key = formatUtcInstantAsClinicPickerIso(apt.startTime, clinicTz);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function deduplicateAppointments(
  appointments: AppointmentListItem[],
): AppointmentListItem[] {
  const seen = new Set<string>();
  return appointments.filter((apt) => {
    if (!apt.id || seen.has(apt.id)) return false;
    seen.add(apt.id);
    return true;
  });
}

export function filterAndSortAppointments(
  appointments: AppointmentListItem[],
): AppointmentListItem[] {
  return [...appointments]
    .filter((apt) => apt.status !== "cancelled")
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
}

export function computeDayQueryOptions(
  date: string,
  search: string,
  scopedDoctorId?: string,
) {
  return {
    date,
    ...(scopedDoctorId ? { doctorId: scopedDoctorId } : {}),
    search,
    status: VISIBLE_APPOINTMENT_STATUS_QUERY,
    limit: 100,
  };
}
