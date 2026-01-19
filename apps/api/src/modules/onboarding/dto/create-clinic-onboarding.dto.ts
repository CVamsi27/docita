import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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

export enum ClinicTier {
  CAPTURE = 'CAPTURE',
  CORE = 'CORE',
  PLUS = 'PLUS',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export const clinicTierSchema = z.nativeEnum(ClinicTier);

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export const billingCycleSchema = z.nativeEnum(BillingCycle);

export enum ClinicType {
  GENERAL = 'GENERAL',
  DENTAL = 'DENTAL',
  PEDIATRIC = 'PEDIATRIC',
  ORTHOPEDIC = 'ORTHOPEDIC',
  CARDIOLOGY = 'CARDIOLOGY',
  DERMATOLOGY = 'DERMATOLOGY',
  ENT = 'ENT',
  GYNECOLOGY = 'GYNECOLOGY',
  OPHTHALMOLOGY = 'OPHTHALMOLOGY',
  PSYCHIATRY = 'PSYCHIATRY',
  SPECIALTY = 'SPECIALTY',
}

export const clinicTypeSchema = z.nativeEnum(ClinicType);

// Step 1: Clinic Details
export const clinicDetailsSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string(), // We'll keep it simple or use a phone regex if needed
  address: z.string().min(10).max(500),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  type: clinicTypeSchema.optional(),
  website: z.string().url().optional().or(z.literal('')),
  mrnPrefix: z.string().max(20).optional(),
  dataResidency: z.string().optional(),
  timezone: z.string().optional(),
});

export class ClinicDetailsDto extends createZodDto(clinicDetailsSchema) {}

// Step 2: Admin Account
export const adminAccountSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  phoneNumber: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  specialization: z.string().optional(),
});

export class AdminAccountDto extends createZodDto(adminAccountSchema) {}

// Step 3: Plan Selection
export const planSelectionSchema = z.object({
  tier: clinicTierSchema,
  billingCycle: billingCycleSchema,
  referralCode: z.string().optional(),
  whatsappAddon: z.boolean().optional(),
  intelligenceAddon: z.boolean().optional(),
});

export class PlanSelectionDto extends createZodDto(planSelectionSchema) {}

// Step 4: Payment Details
export const paymentDetailsSchema = z.object({
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  skipPayment: z.boolean().optional(),
});

export class PaymentDetailsDto extends createZodDto(paymentDetailsSchema) {}

// Step 5: SLA Agreement
export const slaAgreementSchema = z.object({
  acceptedSLA: z.boolean(),
  slaVersion: z.string(),
  acceptedBy: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  acceptedDataProcessingTerms: z.boolean(),
  acceptedPrivacyPolicy: z.boolean(),
});

export class SLAAgreementDto extends createZodDto(slaAgreementSchema) {}

// Step 6: Consent Management
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

// Step 7: Staff Setup
export const staffMemberSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['DOCTOR', 'RECEPTIONIST']),
  phoneNumber: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  specialization: z.string().optional(),
});

export const staffSetupSchema = z.object({
  staffMembers: z.array(staffMemberSchema).optional(),
});

export class StaffSetupDto extends createZodDto(staffSetupSchema) {}

// Complete Onboarding DTO
export const completeOnboardingSchema = z.object({
  clinicDetails: clinicDetailsSchema,
  adminAccount: adminAccountSchema,
  planSelection: planSelectionSchema,
  paymentDetails: paymentDetailsSchema.optional(),
  slaAgreement: slaAgreementSchema,
  consentManagement: consentManagementSchema,
  staffSetup: staffSetupSchema.optional(),
});

export class CompleteOnboardingDto extends createZodDto(
  completeOnboardingSchema,
) {}

// Progress Tracking DTO
export const onboardingProgressSchema = z.object({
  onboardingId: z.string(),
  currentStep: onboardingStepSchema,
  completedSteps: z.array(onboardingStepSchema).optional(),
  data: completeOnboardingSchema.partial().optional(),
});

export class OnboardingProgressDto extends createZodDto(
  onboardingProgressSchema,
) {}
