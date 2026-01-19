import type { TierName } from './tier';

/**
 * Onboarding Types
 * Types for clinic onboarding flow
 */

/**
 * Billing Cycle for subscriptions
 */
export type BillingCycle = 'MONTHLY' | 'YEARLY' | 'SEMI_ANNUAL';

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

export interface PaymentData {
  paymentMethod: 'RAZORPAY' | 'STRIPE' | 'MANUAL';
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
  payment?: PaymentData;
}

export type OnboardingStep = 'clinic_info' | 'doctor_info' | 'plan_selection' | 'payment' | 'complete';
