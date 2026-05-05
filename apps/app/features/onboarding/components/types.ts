import * as z from "zod";
import { clinicTypeSchema, type DayOfWeek } from "@workspace/types";
import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_CURRENCY,
  normalizeCountryCode,
} from "@workspace/utils";
import {
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";

const emailInputSchema = z.string().trim().optional().or(z.literal(""));

const optionalTextSchema = z.string().trim().optional().or(z.literal(""));

const clinicDetailsBaseSchema = z.object({
  name: z.string().min(2, "Use at least 2 characters"),
  email: emailInputSchema,
  phone: z.string().trim(),
  address: optionalTextSchema,
  addressLine1: optionalTextSchema,
  addressLine2: optionalTextSchema,
  city: optionalTextSchema,
  state: optionalTextSchema,
  pincode: optionalTextSchema,
  type: clinicTypeSchema,
  facilityLabel: z.enum(["CLINIC", "HOSPITAL"]),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Choose a valid country")
    .optional(),
  website: z.string().url().optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z0-9]{13}$/, "Enter a valid 15-character GSTIN")
    .optional()
    .or(z.literal("")),
});

export const clinicDetailsSchema = clinicDetailsBaseSchema.superRefine(
  (data, ctx) => {
    const email = data.email?.trim() ?? "";
    if (email) {
      const emailResult = z.string().email().safeParse(email);
      if (!emailResult.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Please enter a valid email address",
        });
      }
    }

    const phone = data.phone.trim();
    if (!phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Enter your phone number",
      });
      return;
    }

    const country = (normalizeCountryCode(data.countryCode) ??
      DEFAULT_COUNTRY_CODE) as Country;
    const isValidForCountry = isPossiblePhoneNumber(phone, country);
    const parsed = parsePhoneNumber(phone, country);
    const expectedCallingCode = getCountryCallingCode(country);
    const matchesSelectedCountry =
      parsed?.countryCallingCode === expectedCallingCode;

    if (!isValidForCountry || !matchesSelectedCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: `Enter a valid phone number for ${country}`,
      });
    }

    const addressLine1 = data.addressLine1?.trim() ?? "";
    if (!addressLine1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["addressLine1"],
        message: "Enter address line 1",
      });
    }

    const city = data.city?.trim() ?? "";
    if (!city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "Enter the city",
      });
    }

    const state = data.state?.trim() ?? "";
    if (!state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "Enter the state or province",
      });
    }
  },
);

export const complianceSchema = z.object({
  acceptedSLA: z
    .boolean()
    .refine((val) => val === true, "Please accept the service agreement"),
  acceptedPrivacyPolicy: z
    .boolean()
    .refine((val) => val === true, "Please accept the privacy policy"),
  acceptedDataProcessing: z
    .boolean()
    .refine(
      (val) => val === true,
      "Please accept the data processing agreement",
    ),
  enableWhatsApp: z.boolean(),
  requireConsent: z.boolean(),
  slaSignatureSessionId: z
    .string()
    .min(1, "Upload the signed service agreement"),
});

export type ClinicDetails = z.infer<typeof clinicDetailsSchema>;
export type ComplianceSettings = z.infer<typeof complianceSchema>;

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
  /** Mirrors API `planSelection.workspaceProfile`. */
  workspaceProfile?: "FULL_CLINICAL" | "FRONT_DESK";
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
    workspaceProfile: "FULL_CLINICAL",
  },
  paymentDetails: {},
  teamMembers: [],
  clinicWeeklyHours: buildDefaultClinicWeeklyHours(),
};
