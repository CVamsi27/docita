import { useAPIMutation } from "../core/use-api-mutation";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIQuery } from "../core/use-api-query";

export interface PrescriptionDefaults {
  defaultInstructions: string;
  defaultFooterText: string;
  includeClinicHeader: boolean;
  includeDoctorSignature: boolean;
  includeQRCode: boolean;
}

export const usePrescriptionDefaults = () =>
  useAPIQuery<PrescriptionDefaults>(
    queryKeys.clinic.prescriptionDefaults(),
    "/clinic/prescription-defaults",
  );

export const useUpdatePrescriptionDefaults = () =>
  useAPIMutation<{ success: boolean }, Partial<PrescriptionDefaults>>(
    "/clinic/prescription-defaults",
    "PUT",
  );
