import * as z from "zod";
import { clinicTypeSchema } from "@workspace/types";

export const clinicDetailsSchema = z.object({
  name: z.string().min(2, "Clinic name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address is required"),
  type: clinicTypeSchema,
  website: z.string().url().optional().or(z.literal("")),
});

export const adminAccountSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  phoneNumber: z.string().min(10, "Phone number is required"),
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
});

export type ClinicDetails = z.infer<typeof clinicDetailsSchema>;
export type AdminAccount = z.infer<typeof adminAccountSchema>;
export type ComplianceSettings = z.infer<typeof complianceSchema>;

export const defaultComplianceValues: ComplianceSettings = {
  acceptedSLA: false,
  acceptedPrivacyPolicy: false,
  acceptedDataProcessing: false,
  enableWhatsApp: false,
  requireConsent: true,
};

export interface PaymentDetails {
  cardNumber: string;
  autoPay: boolean;
  addons: {
    intelligence: boolean;
  };
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
}

export interface ClinicRegistrationData {
  clinicDetails: Partial<ClinicDetails>;
  adminAccount: Partial<AdminAccount>;
  compliance: Partial<ComplianceSettings>;
  planSelection: PlanSelection;
  paymentDetails: Partial<PaymentDetails>;
  teamMembers: TeamMember[];
}

export const defaultClinicRegistrationData: ClinicRegistrationData = {
  clinicDetails: {},
  adminAccount: {},
  compliance: {},
  planSelection: {
    tier: "CORE",
    billingCycle: "MONTHLY",
    price: 0,
    currency: "₹",
  },
  paymentDetails: {},
  teamMembers: [],
};
