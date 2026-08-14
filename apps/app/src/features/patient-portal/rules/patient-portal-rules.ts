import type {
  PatientAppointmentStatus,
  PatientInvoiceStatus,
  PatientPortalSnapshot,
  PatientPrescriptionStatus,
} from "@/features/patient-portal/types/patient-portal-types";

export function getAppointmentStatusLabel(
  status: PatientAppointmentStatus,
): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmed";
    case "PENDING":
      return "Pending";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

export function getPrescriptionStatusLabel(
  status: PatientPrescriptionStatus,
): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

export function getInvoiceStatusLabel(status: PatientInvoiceStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "PAID":
      return "Paid";
    case "OVERDUE":
      return "Overdue";
    default:
      return status;
  }
}

export function summarizePortalSnapshot(snapshot: PatientPortalSnapshot) {
  return {
    appointmentCount: snapshot.upcomingAppointments.length,
    prescriptionCount: snapshot.activePrescriptions.length,
    outstandingInvoiceCount: snapshot.outstandingInvoices.length,
  };
}
