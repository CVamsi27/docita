import { z } from "zod";

// allow-no-base-schema: owner=prescriptions reason=ui-defaults-json-projection review=2026-09-30
export const prescriptionDefaultsFormSchema = z.object({
  defaultInstructions: z.string().max(8000),
  defaultFooterText: z.string().max(8000),
  includeClinicHeader: z.boolean(),
  includeDoctorSignature: z.boolean(),
  includeQRCode: z.boolean(),
});

export type PrescriptionDefaultsFormValues = z.infer<
  typeof prescriptionDefaultsFormSchema
>;
