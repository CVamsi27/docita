import { z } from "zod";
import { dayOfWeekSchema, onboardingClinicDetailsBaseSchema } from "@workspace/types";
import { complianceSchema } from "@/features/onboarding/components/types";

const sessionTeamMemberSchema = z.object({
  email: z.string(),
  role: z.enum(["DOCTOR", "NURSE", "RECEPTIONIST", "ADMIN", "ADMIN_DOCTOR"]),
  name: z.string().optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
});

const sessionClinicWeeklyHourSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string(),
  endTime: z.string(),
  slotDuration: z.number(),
  isActive: z.boolean(),
});

const sessionPlanSelectionSchema = z.object({
  tier: z.string(),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  price: z.number(),
  currency: z.string(),
  isCoreTrial: z.boolean().optional(),
});

const sessionPaymentDetailsSchema = z.object({
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  cardNumber: z.string().optional(),
  cardLast4: z.string().optional(),
  autoPay: z.boolean().optional(),
  skipPayment: z.boolean().optional(),
});

export const clinicRegistrationSessionSchema = z.object({
  clinicDetails: onboardingClinicDetailsBaseSchema.partial(),
  compliance: complianceSchema.partial(),
  planSelection: sessionPlanSelectionSchema,
  paymentDetails: sessionPaymentDetailsSchema,
  teamMembers: z.array(sessionTeamMemberSchema),
  clinicWeeklyHours: z.array(sessionClinicWeeklyHourSchema),
});
