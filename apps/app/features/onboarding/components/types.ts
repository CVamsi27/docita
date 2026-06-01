import { z } from "zod";
import type { DayOfWeek, PlanMode } from "@workspace/types";
import {
  onboardingComplianceFormSchema,
  type OnboardingComplianceFormValues,
} from "@workspace/types";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { clinicDetailsSchema } from "@/features/onboarding/schemas/clinic-details-refinement";

export { clinicDetailsSchema };
export const complianceSchema = onboardingComplianceFormSchema;

export type ClinicDetails = z.infer<typeof clinicDetailsSchema>;
export type ComplianceSettings = OnboardingComplianceFormValues;

export const defaultComplianceValues: ComplianceSettings = {
  acceptedSLA: false,
  acceptedPrivacyPolicy: false,
  acceptedDataProcessing: false,
  enableWhatsApp: false,
  requireConsent: true,
  slaSignatureSessionId: "",
};

export interface PaymentDetails {
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  cardNumber?: string;
  cardLast4?: string;
  autoPay?: boolean;
  skipPayment?: boolean;
}

export interface TeamMember {
  email: string;
  role: "DOCTOR" | "NURSE" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  name?: string;
  password?: string;
  phoneNumber?: string;
  specialization?: string;
  qualification?: string;
  registrationNumber?: string;
}

export interface PlanSelection {
  tier: string;
  billingCycle: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  isCoreTrial?: boolean;
  /** Full / Front Desk / Core plan mode chosen on the plan step. */
  planMode?: PlanMode;
}

/** One row per weekday for default clinic visit windows (matches onboarding API). */
export interface ClinicWeeklyHourRow {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

const DEFAULT_CLINIC_WEEKLY_ORDER: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function buildDefaultClinicWeeklyHours(): ClinicWeeklyHourRow[] {
  const weekend = new Set<DayOfWeek>(["SATURDAY", "SUNDAY"]);
  return DEFAULT_CLINIC_WEEKLY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 30,
    isActive: !weekend.has(dayOfWeek),
  }));
}

export interface ClinicRegistrationData {
  clinicDetails: Partial<ClinicDetails>;
  compliance: Partial<ComplianceSettings>;
  planSelection: PlanSelection;
  paymentDetails: Partial<PaymentDetails>;
  teamMembers: TeamMember[];
  clinicWeeklyHours: ClinicWeeklyHourRow[];
}

export const defaultClinicRegistrationData: ClinicRegistrationData = {
  clinicDetails: {},
  compliance: {},
  planSelection: {
    tier: "ESSENTIAL",
    billingCycle: "MONTHLY",
    price: 0,
    currency: DEFAULT_CURRENCY,
    isCoreTrial: false,
  },
  paymentDetails: {},
  teamMembers: [],
  clinicWeeklyHours: buildDefaultClinicWeeklyHours(),
};
