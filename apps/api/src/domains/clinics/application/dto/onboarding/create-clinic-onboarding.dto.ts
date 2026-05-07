import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ClinicTier } from '@workspace/db';
import {
  clinicTypeSchema as importedClinicTypeSchema,
  dayOfWeekSchema,
  workspaceProfileSchema,
} from '@workspace/types';
export { ClinicTier };
export const clinicTierSchema = z.nativeEnum(ClinicTier);
export enum OnboardingStep {
  CLINIC_DETAILS = 'CLINIC_DETAILS',
  ADMIN_ACCOUNT = 'ADMIN_ACCOUNT',
  PLAN_SELECTION = 'PLAN_SELECTION',
  PAYMENT_DETAILS = 'PAYMENT_DETAILS',
  SLA_AGREEMENT = 'SLA_AGREEMENT',
  CONSENT_MANAGEMENT = 'CONSENT_MANAGEMENT',
  STAFF_SETUP = 'STAFF_SETUP',
  COMPLETED = 'COMPLETED',
}
export const onboardingStepSchema = z.nativeEnum(OnboardingStep);
export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}
export const billingCycleSchema = z.nativeEnum(BillingCycle);
export type { ClinicType } from '@workspace/types';
export const clinicTypeSchema = importedClinicTypeSchema;
export const clinicDetailsSchema = z.object({
  name: z
    .string({ required_error: 'Clinic name is required' })
    .min(2, 'Clinic name must be at least 2 characters')
    .max(100, 'Clinic name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  phone: z.string({ required_error: 'Phone number is required' }),
  address: z
    .string({ required_error: 'Address is required' })
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address cannot exceed 500 characters'),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'countryCode must be a 2-letter ISO code')
    .optional(),
  facilityLabel: z.enum(['CLINIC', 'HOSPITAL']).optional(),
  type: clinicTypeSchema.optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  mrnPrefix: z.string().max(20).optional(),
  dataResidency: z.string().optional(),
  timezone: z.string().optional(),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z0-9]{13}$/, 'Invalid GSTIN')
    .optional()
    .or(z.literal('')),
  legalName: z.string().trim().max(160).optional().or(z.literal('')),
  mapsLocation: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  mapsLink: z
    .string()
    .trim()
    .url('Invalid Google Maps link')
    .or(z.literal(''))
    .optional(),
});
export class ClinicDetailsDto extends createZodDto(clinicDetailsSchema) {}
export const adminAccountSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(['ADMIN', 'ADMIN_DOCTOR']).optional(),
  phoneNumber: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  specialization: z.string().optional(),
});
export class AdminAccountDto extends createZodDto(adminAccountSchema) {}
export const planSelectionSchema = z.object({
  tier: clinicTierSchema,
  billingCycle: billingCycleSchema,
  referralCode: z.string().optional(),
  whatsappAddon: z.boolean().optional(),
  intelligenceAddon: z.boolean().optional(),
  currency: z.string().optional(),
  workspaceProfile: workspaceProfileSchema.optional(),
});
export class PlanSelectionDto extends createZodDto(planSelectionSchema) {}
export const paymentDetailsSchema = z.object({
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  cardLast4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  autoPay: z.boolean().optional(),
  addons: z
    .object({
      whatsapp: z.boolean().optional(),
      intelligence: z.boolean().optional(),
    })
    .optional(),
  whatsappBusinessNumber: z.string().optional(),
  skipPayment: z.boolean().optional(),
});
export class PaymentDetailsDto extends createZodDto(paymentDetailsSchema) {}
export const slaAgreementSchema = z.object({
  acceptedSLA: z.boolean(),
  slaVersion: z.string(),
  acceptedBy: z.string(),
  signatureSessionId: z.string().min(1, 'Signature upload is required'),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  acceptedDataProcessingTerms: z.boolean(),
  acceptedPrivacyPolicy: z.boolean(),
});
export class SLAAgreementDto extends createZodDto(slaAgreementSchema) {}
export const consentManagementSchema = z.object({
  enableWhatsAppCommunication: z.boolean(),
  enableMarketingCommunications: z.boolean(),
  whatsappBusinessNumber: z.string().optional(),
  dataProcessingPurposes: z.array(z.string()),
  patientConsentRequiredBeforeWhatsApp: z.boolean(),
  logAllConsentChanges: z.boolean(),
});
export class ConsentManagementDto extends createZodDto(
  consentManagementSchema,
) {}
export const staffMemberSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'ADMIN', 'ADMIN_DOCTOR']),
  phoneNumber: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  specialization: z.string().optional(),
});
export const staffSetupSchema = z.object({
  staffMembers: z.array(staffMemberSchema).optional(),
});
export class StaffSetupDto extends createZodDto(staffSetupSchema) {}

const clinicWeeklyTimeRe = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const clinicWeeklyHourInputSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  startTime: z
    .string()
    .regex(clinicWeeklyTimeRe, 'Use HH:mm, for example 09:00'),
  endTime: z.string().regex(clinicWeeklyTimeRe, 'Use HH:mm, for example 17:00'),
  slotDuration: z.number().int().min(5).max(120),
  isActive: z.boolean(),
});

export const clinicWeeklyHoursSchema = z
  .array(clinicWeeklyHourInputSchema)
  .length(7)
  .superRefine((rows, ctx) => {
    const keys = new Set(rows.map((r) => r.dayOfWeek));
    if (keys.size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Include exactly one row for each day of the week',
      });
    }
    if (!rows.some((r) => r.isActive)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Turn on at least one day with visit hours',
      });
    }
    for (const r of rows) {
      if (r.isActive && r.startTime >= r.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [rows.indexOf(r), 'endTime'],
          message: 'End time must be after start time',
        });
      }
    }
  });

export class ClinicWeeklyHoursDto extends createZodDto(
  clinicWeeklyHoursSchema,
) {}

export const completeOnboardingSchema = z.object({
  clinicDetails: clinicDetailsSchema,
  adminAccount: adminAccountSchema,
  planSelection: planSelectionSchema,
  paymentDetails: paymentDetailsSchema.optional(),
  slaAgreement: slaAgreementSchema,
  consentManagement: consentManagementSchema,
  staffSetup: staffSetupSchema.optional(),
  /** Default location visit windows; doctors inherit these until they set their own. */
  clinicWeeklyHours: clinicWeeklyHoursSchema.optional(),
});
export class CompleteOnboardingDto extends createZodDto(
  completeOnboardingSchema,
) {}
export const onboardingProgressSchema = z.object({
  onboardingId: z.string(),
  currentStep: onboardingStepSchema,
  completedSteps: z.array(onboardingStepSchema).optional(),
  data: completeOnboardingSchema.partial().optional(),
});
export class OnboardingProgressDto extends createZodDto(
  onboardingProgressSchema,
) {}

export const onboardingCheckoutSchema = z.object({
  tier: clinicTierSchema,
  billingCycle: billingCycleSchema,
  currency: z.string().optional(),
  gstin: z.string().optional(),
  customerEmail: z.string().email(),
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().optional(),
});

export class OnboardingCheckoutDto extends createZodDto(
  onboardingCheckoutSchema,
) {}

export const onboardingCheckoutResponseSchema = z.object({
  orderId: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  razorpayKeyId: z.string(),
});

export class OnboardingCheckoutResponseDto extends createZodDto(
  onboardingCheckoutResponseSchema,
) {}
