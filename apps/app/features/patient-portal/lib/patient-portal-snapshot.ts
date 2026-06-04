import type { AppointmentListItem } from "@workspace/data-access";
import type { PatientPortalSnapshot } from "@/features/patient-portal/types/patient-portal-types";
import { buildUpcomingPortalAppointments } from "./patient-portal-appointments-snapshot";
import { buildOutstandingPortalInvoices } from "./patient-portal-invoices-snapshot";
import { buildActivePortalPrescriptions } from "./patient-portal-prescriptions-snapshot";

export function buildPatientPortalSnapshot(
  appointments: AppointmentListItem[] | undefined,
  hasPatientId: boolean,
  now: number,
): PatientPortalSnapshot {
  if (!hasPatientId) return emptyPortalSnapshot();
  const items = getUsableAppointments(appointments);
  return {
    upcomingAppointments: buildUpcomingPortalAppointments(items, now),
    activePrescriptions: buildActivePortalPrescriptions(items),
    outstandingInvoices: buildOutstandingPortalInvoices(items),
  };
}

function emptyPortalSnapshot(): PatientPortalSnapshot {
  return {
    upcomingAppointments: [],
    activePrescriptions: [],
    outstandingInvoices: [],
  };
}

function getUsableAppointments(
  appointments: AppointmentListItem[] | undefined,
): AppointmentListItem[] {
  return (appointments || []).filter((item) =>
    Boolean(item.id && item.startTime),
  );
}
