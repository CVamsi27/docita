import { z } from "zod";

/** Clinic registration compliance step (SLA, privacy, DPDP, WhatsApp). */
export const onboardingComplianceFormSchema = z.object({
  acceptedSLA: z
    .boolean()
    .refine((val) => val === true, "Please accept the service agreement"),
  acceptedPrivacyPolicy: z
    .boolean()
    .refine((val) => val === true, "Please accept the privacy policy"),
  acceptedDataProcessing: z
    .boolean()
    .refine(
      (val) => val === true,
      "Please accept the data processing agreement",
    ),
  enableWhatsApp: z.boolean(),
  requireConsent: z.boolean(),
  slaSignatureSessionId: z
    .string()
    .min(1, "Upload the signed service agreement"),
});

export type OnboardingComplianceFormValues = z.infer<
  typeof onboardingComplianceFormSchema
>;
