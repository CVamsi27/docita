import { z } from "zod";

export const requiredStringSchema = (fieldName: string) =>
  z.string().min(1, `Enter ${fieldName.toLowerCase()}.`);

export const emailSchema = z
  .string()
  .min(1, "Enter an email address.")
  .email("Please enter a valid email address");

export const phoneSchema = z
  .string()
  .min(1, "Enter a phone number.")
  .min(10, "Enter at least 10 digits.")
  .regex(/^\+?[\d\s-()]+$/, "Enter a valid phone number.");

export const addressSchema = z.object({
  street: z.string().min(1, "Enter the street address."),
  city: z.string().min(1, "Enter the city."),
  state: z.string().min(1, "Enter the state or province."),
  zipCode: z.string().min(1, "Enter the ZIP or postal code."),
  country: z.string().min(1, "Enter the country."),
});

export const patientBasicInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, "Enter the first name.")
    .min(2, "Use at least 2 characters."),
  lastName: z
    .string()
    .min(1, "Enter the last name.")
    .min(2, "Use at least 2 characters."),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.date().optional(),
});
