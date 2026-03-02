import { z } from "zod";
import type { TierName } from "../billing/tier";
import { clinicSchema } from "../shared/clinics";
import { userSchema } from "../shared/users";

export const onboardingStepSchema = z.enum([
  "clinic-details",
  "owner-details",
  "documents",
  "subscription",
  "review",
]);
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const onboardingSessionSchema = z.object({
  id: z.string(),
  currentStep: onboardingStepSchema,
  clinicDetails: clinicSchema.partial().optional(),
  ownerDetails: userSchema.partial().optional(),
  isCompleted: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const onboardingInitResponseSchema = z.object({
  onboardingId: z.string(),
  step: onboardingStepSchema,
});

export type BillingCycle = "MONTHLY" | "YEARLY" | "SEMI_ANNUAL";

export interface ClinicInfoData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  type?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
}

export interface DoctorInfoData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
}

export interface PlanSelectionData {
  tier: TierName;
  billingCycle: BillingCycle;
  addOns?: string[];
}

export interface OnboardingPaymentData {
  paymentMethod?: "RAZORPAY" | "STRIPE" | "MANUAL";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount?: number;
  currency?: string;
}

export interface OnboardingStepData {
  clinicInfo?: ClinicInfoData;
  doctorInfo?: DoctorInfoData;
  planSelection?: PlanSelectionData;
  payment?: OnboardingPaymentData;
}

export type OnboardingStepType =
  | "clinic_info"
  | "doctor_info"
  | "plan_selection"
  | "payment"
  | "complete";

export type PaymentData = OnboardingPaymentData;
