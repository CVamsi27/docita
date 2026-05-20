import { z } from "zod";
import { clinicTypeSchema } from "../shared/users";

/** Legacy multi-step onboarding wizard (simpler clinic details shape). */
export const onboardingClinicDetailsSchema = z.object({
  name: z.string().min(2, "Enter the facility name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().regex(/^\+\d{8,15}$/, "Enter a valid phone number"),
  address: z.string().min(5, "Enter the facility address"),
  type: clinicTypeSchema,
  facilityType: z.enum(["CLINIC", "HOSPITAL"]).default("CLINIC"),
});

export const onboardingPlanSelectionSchema = z.object({
  tier: z.enum(["CAPTURE", "CORE", "PLUS", "PRO", "ENTERPRISE"]),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  referralCode: z.string().optional(),
});

export const onboardingTeamInviteSchema = z.object({
  members: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.enum([
          "DOCTOR",
          "NURSE",
          "RECEPTIONIST",
          "ADMIN",
          "ADMIN_DOCTOR",
        ]),
        name: z.string().optional(),
      }),
    )
    .default([]),
});

export const onboardingLegalComplianceSchema = z.object({
  acceptedSLA: z.boolean().refine((val) => val === true, {
    message: "Please accept the service agreement",
  }),
  acceptedPrivacy: z.boolean().refine((val) => val === true, {
    message: "Please accept the privacy policy",
  }),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: "Please accept the terms of service",
  }),
});

export const onboardingDataSchema = z.object({
  clinicDetails: onboardingClinicDetailsSchema,
  planSelection: onboardingPlanSelectionSchema,
  teamInvites: onboardingTeamInviteSchema,
  compliance: onboardingLegalComplianceSchema,
});

export type OnboardingClinicDetails = z.infer<
  typeof onboardingClinicDetailsSchema
>;
export type OnboardingPlanSelection = z.infer<
  typeof onboardingPlanSelectionSchema
>;
export type OnboardingTeamInvites = z.infer<typeof onboardingTeamInviteSchema>;
export type OnboardingLegalCompliance = z.infer<
  typeof onboardingLegalComplianceSchema
>;
export type OnboardingData = z.infer<typeof onboardingDataSchema>;

/** @deprecated Use onboardingClinicDetailsSchema */
export const clinicDetailsSchema = onboardingClinicDetailsSchema.describe(
  "Legacy onboarding clinic details",
);

/** @deprecated Use onboardingPlanSelectionSchema */
export const planSelectionSchema = onboardingPlanSelectionSchema.describe(
  "Legacy onboarding plan selection",
);

/** @deprecated Use onboardingTeamInviteSchema */
export const teamInviteSchema = onboardingTeamInviteSchema.describe(
  "Legacy onboarding team invite",
);

/** @deprecated Use onboardingLegalComplianceSchema */
export const complianceSchema = onboardingLegalComplianceSchema.describe(
  "Legacy onboarding compliance",
);
