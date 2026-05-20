import { z } from "zod";
import { createPatientRequestSchema } from "../contracts/patients";

/** Clinician add-patient dialog: requires DOB and DPDP consent attestation. */
export const patientCreateFormSchema = createPatientRequestSchema.superRefine(
  (val, ctx) => {
    if (!val.dateOfBirth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateOfBirth"],
        message: "Date of birth is required",
      });
    }
    if (val.dpdpConsent?.accepted !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dpdpConsent", "accepted"],
        message:
          "Confirm DPDP consent has been obtained from the patient before saving",
      });
    }
  },
);

export type PatientCreateFormValues = z.infer<typeof patientCreateFormSchema>;
