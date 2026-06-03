import { z } from "zod";
import { clinicTypeSchema, facilityTypeSchema } from "../shared/users";

const emailInputSchema = z.string().trim().optional().or(z.literal(""));

const optionalTextSchema = z.string().trim().optional().or(z.literal(""));

/** Clinic registration step — base fields; apply phone/address refinement in the app. */
export const onboardingClinicDetailsBaseSchema = z.object({
  name: z.string().min(2, "Use at least 2 characters"),
  email: emailInputSchema,
  phone: z.string().trim(),
  address: optionalTextSchema,
  addressLine1: optionalTextSchema,
  addressLine2: optionalTextSchema,
  city: optionalTextSchema,
  state: optionalTextSchema,
  pincode: optionalTextSchema,
  mapsLocation: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  mapsLink: z
    .string()
    .trim()
    .url("Enter a valid Google Maps URL")
    .optional()
    .or(z.literal("")),
  type: clinicTypeSchema,
  facilityLabel: facilityTypeSchema,
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
  legalName: z
    .string()
    .trim()
    .max(160, "Legal name is too long")
    .optional()
    .or(z.literal("")),
});

export type OnboardingClinicDetailsBase = z.infer<
  typeof onboardingClinicDetailsBaseSchema
>;
