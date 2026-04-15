import * as z from "zod";
import { clinicTypeSchema } from "@workspace/types";
import { DEFAULT_CURRENCY } from "@workspace/utils";

export const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Use at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Enter at least 10 digits"),
  address: z.string().min(5, "Enter the clinic address"),
  type: clinicTypeSchema,
  website: z.string().url().optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z0-9]{13}$/,
      "Enter a valid 15-character GSTIN",
    )
    .optional()
    .or(z.literal("")),
});

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
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR";
  name?: string;
}

export interface PlanSelection {
  tier: string;
  billingCycle: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  isCoreTrial?: boolean;
}

export interface ClinicRegistrationData {
  clinicDetails: Partial<ClinicDetails>;
  compliance: Partial<ComplianceSettings>;
  planSelection: PlanSelection;
  paymentDetails: Partial<PaymentDetails>;
  teamMembers: TeamMember[];
}

export const defaultClinicRegistrationData: ClinicRegistrationData = {
  clinicDetails: {},
  compliance: {},
  planSelection: {
    tier: "ESSENTIAL",
    billingCycle: "MONTHLY",
    price: 0,
    currency: DEFAULT_CURRENCY,
    isCoreTrial: true,
  },
  paymentDetails: {},
  teamMembers: [],
};
