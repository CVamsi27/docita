import type { AppointmentListItem } from "@workspace/data-access";
import type {
  PatientPortalSnapshot,
  PatientPrescriptionStatus,
} from "@/features/patient-portal/types/patient-portal-types";
import { mapAppointmentStatus } from "@/features/patient-portal/lib/map-portal-records";
import { toPortalIsoString } from "./patient-portal-date";

type AppointmentWithPrescription = AppointmentListItem & {
  prescription: NonNullable<AppointmentListItem["prescription"]> & {
    id: string;
  };
};

export function buildActivePortalPrescriptions(
  items: AppointmentListItem[],
): PatientPortalSnapshot["activePrescriptions"] {
  return items.filter(hasPrescription).map(toActivePrescription);
}

function hasPrescription(
  item: AppointmentListItem,
): item is AppointmentWithPrescription {
  return Boolean(item.prescription?.id);
}

function toActivePrescription(
  item: AppointmentWithPrescription,
): PatientPortalSnapshot["activePrescriptions"][number] {
  return {
    id: item.prescription.id,
    title: item.prescription.medications[0]?.name || "Prescription",
    prescribedBy: item.doctor?.name ?? "",
    issuedAt: toPortalIsoString(item.prescription.createdAt),
    status: prescriptionStatusFromAppointment(item),
  };
}

function prescriptionStatusFromAppointment(
  item: AppointmentListItem,
): PatientPrescriptionStatus {
  return mapAppointmentStatus(item.status) === "COMPLETED"
    ? "COMPLETED"
    : "ACTIVE";
}
