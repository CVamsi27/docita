import * as z from "zod";
import { clinicTypeSchema } from "@workspace/types";
import { DEFAULT_CURRENCY } from "@workspace/utils";

export const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Clinic name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address is required"),
  type: clinicTypeSchema,
  website: z.string().url().optional().or(z.literal("")),
  gstin: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z0-9]{13}$/,
      "GSTIN must be a valid 15 character GST registration number",
    )
    .optional()
    .or(z.literal("")),
});

export const complianceSchema = z.object({
  acceptedSLA: z
    .boolean()
    .refine((val) => val === true, "You must accept the SLA"),
  acceptedPrivacyPolicy: z
    .boolean()
    .refine((val) => val === true, "You must accept the Privacy Policy"),
  acceptedDataProcessing: z
    .boolean()
    .refine(
      (val) => val === true,
      "You must accept the Data Processing Agreement",
    ),
  enableWhatsApp: z.boolean(),
  requireConsent: z.boolean(),
  slaSignatureSessionId: z
    .string()
    .min(1, "SLA signature upload is required"),
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
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN_DOCTOR";
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
    tier: "CORE",
    billingCycle: "MONTHLY",
    price: 0,
    currency: DEFAULT_CURRENCY,
  },
  paymentDetails: {},
  teamMembers: [],
};
