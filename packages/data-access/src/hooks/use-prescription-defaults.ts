import { useAPIMutation } from "../core/use-api-mutation";
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
    ["clinic", "prescription-defaults"],
    "/clinic/prescription-defaults",
  );

export const useUpdatePrescriptionDefaults = () =>
  useAPIMutation<{ success: boolean }, Partial<PrescriptionDefaults>>(
    "/clinic/prescription-defaults",
    "PUT",
  );
