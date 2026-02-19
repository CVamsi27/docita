import { z } from "zod";
import { clinicTypeSchema } from "@workspace/types";

/**
 * Onboarding step schemas - Single Source of Truth
 * Each step has its own schema for validation
 */

// Step 1: Clinic Details
export const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Clinic name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Address is required"),
  type: clinicTypeSchema,
  facilityType: z.enum(["CLINIC", "HOSPITAL"]).default("CLINIC"),
});

// Step 2: Admin Account
export const adminAccountSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Step 3: Plan Selection
export const planSelectionSchema = z.object({
  tier: z.enum(["CAPTURE", "CORE", "PLUS", "PRO", "ENTERPRISE"]),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  addons: z.object({
    intelligence: z.boolean(),
  }).default({ intelligence: false }),
  referralCode: z.string().optional(),
});

// Step 4: Team Invites
export const teamInviteSchema = z.object({
  members: z.array(z.object({
    email: z.string().email(),
    role: z.enum(["DOCTOR", "RECEPTIONIST", "ADMIN_DOCTOR"]),
    name: z.string().optional(),
  })).default([]),
});

// Step 5: Compliance
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

// Combined onboarding data
export const onboardingDataSchema = z.object({
  clinicDetails: clinicDetailsSchema,
  adminAccount: adminAccountSchema,
  planSelection: planSelectionSchema,
  teamInvites: teamInviteSchema,
  compliance: complianceSchema,
});

// Export types
export type ClinicDetails = z.infer<typeof clinicDetailsSchema>;
export type AdminAccount = z.infer<typeof adminAccountSchema>;
export type PlanSelection = z.infer<typeof planSelectionSchema>;
export type TeamInvites = z.infer<typeof teamInviteSchema>;
export type Compliance = z.infer<typeof complianceSchema>;
export type OnboardingData = z.infer<typeof onboardingDataSchema>;
