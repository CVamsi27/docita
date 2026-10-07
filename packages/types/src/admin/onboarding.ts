import { z } from "zod";
import type { TierName } from "../billing/tier";
import { authUserSchema } from "../contracts/auth";
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

/**
 * Response of `POST /onboarding/:id/complete`.
 *
 * This describes what the service actually returns: a discriminated outcome
 * where only the success branch carries credentials. `OnboardingResult` on the
 * API side is derived from this schema, and the SPA parses with it, so the
 * shape exists in exactly one place.
 *
 * The DTO wrapper in `onboarding-response.dto.ts` previously declared
 * `{accessToken, clinicId, userId, email, name, role}` — a flat shape the
 * service never produced. `SafeZodSerializerInterceptor` therefore logged a
 * `SafeZodSerializer` mismatch warning on **every successful clinic
 * registration** and passed the original response through untouched, which is
 * exactly what its own doc calls a rollout signal that needed fixing.
 */
export const onboardingCompletionResponseSchema = z.object({
  success: z.boolean(),
  clinicId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  message: z.string(),
  errors: z.array(z.string()).optional(),
  /** Present only on success; the SPA stores it via `appSession.setToken`. */
  access_token: z.string().optional(),
  user: authUserSchema.optional(),
});
export type OnboardingCompletionResponse = z.infer<
  typeof onboardingCompletionResponseSchema
>;

export type BillingCycle = "MONTHLY" | "YEARLY" | "SEMI_ANNUAL";

export interface ClinicInfoData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  gstin?: string;
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
  currency?: string;
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
