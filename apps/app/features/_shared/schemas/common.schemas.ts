import { z } from "zod";

export const requiredStringSchema = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`);

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address");

export const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")

  .regex(/^\+?[\d\s-()]+$/, "Invalid phone number format");

export const addressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State/Province is required"),
  zipCode: z.string().min(1, "ZIP/Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

export const patientBasicInfoSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: emailSchema.optional().or(z.literal("")),
  phone: phoneSchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.date().optional(),
});

