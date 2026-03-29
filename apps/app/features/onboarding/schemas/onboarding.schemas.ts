import { z } from "zod";
import { clinicTypeSchema } from "@workspace/types";

export const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Clinic name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Address is required"),
  type: clinicTypeSchema,
  facilityType: z.enum(["CLINIC", "HOSPITAL"]).default("CLINIC"),
});

export const planSelectionSchema = z.object({
  tier: z.enum(["CAPTURE", "CORE", "PLUS", "PRO", "ENTERPRISE"]),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  referralCode: z.string().optional(),
});

export const teamInviteSchema = z.object({
  members: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.enum(["DOCTOR", "RECEPTIONIST", "ADMIN_DOCTOR"]),
        name: z.string().optional(),
      }),
    )
    .default([]),
});

export const complianceSchema = z.object({
  acceptedSLA: z.boolean().refine((val) => val === true, {
    message: "You must accept the Service Level Agreement",
  }),
  acceptedPrivacy: z.boolean().refine((val) => val === true, {
    message: "You must accept the Privacy Policy",
  }),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms of Service",
  }),
});

export const onboardingDataSchema = z.object({
  clinicDetails: clinicDetailsSchema,
  planSelection: planSelectionSchema,
  teamInvites: teamInviteSchema,
  compliance: complianceSchema,
});

export type ClinicDetails = z.infer<typeof clinicDetailsSchema>;
export type PlanSelection = z.infer<typeof planSelectionSchema>;
export type TeamInvites = z.infer<typeof teamInviteSchema>;
export type Compliance = z.infer<typeof complianceSchema>;
export type OnboardingData = z.infer<typeof onboardingDataSchema>;
