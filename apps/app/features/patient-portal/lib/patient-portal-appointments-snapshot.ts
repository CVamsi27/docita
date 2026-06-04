import type { AppointmentListItem } from "@workspace/data-access";
import type { PatientPortalSnapshot } from "@/features/patient-portal/types/patient-portal-types";
import { mapAppointmentStatus } from "@/features/patient-portal/lib/map-portal-records";
import { toPortalIsoString } from "./patient-portal-date";

export function buildUpcomingPortalAppointments(
  items: AppointmentListItem[],
  now: number,
): PatientPortalSnapshot["upcomingAppointments"] {
  return items
    .filter((item) => isUpcomingBookableAppointment(item, now))
    .sort(compareAppointmentStartTime)
    .slice(0, 10)
    .map(toUpcomingPortalAppointment);
}

function toUpcomingPortalAppointment(
  item: AppointmentListItem,
): PatientPortalSnapshot["upcomingAppointments"][number] {
  return {
    id: item.id,
    doctorName: item.doctor?.name ?? "",
    clinicName: item.clinicName ?? item.clinic?.name ?? "",
    scheduledAt: toPortalIsoString(item.startTime),
    status: mapAppointmentStatus(item.status),
  };
}

function isUpcomingBookableAppointment(
  item: AppointmentListItem,
  now: number,
): boolean {
  const scheduledAt = new Date(item.startTime).getTime();
  return (
    Number.isFinite(scheduledAt) &&
    scheduledAt >= now &&
    !isInactiveStatus(item.status)
  );
}

function isInactiveStatus(status: string | undefined): boolean {
  const normalized = (status || "").toLowerCase();
  return normalized === "cancelled" || normalized === "no-show";
}

function compareAppointmentStartTime(
  first: AppointmentListItem,
  second: AppointmentListItem,
): number {
  return (
    new Date(first.startTime).getTime() - new Date(second.startTime).getTime()
  );
}
