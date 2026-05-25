import { z } from "zod";

export const requiredStringSchema = (fieldName: string) =>
  z.string().min(1, `Enter ${fieldName.toLowerCase()}.`);

export const phoneSchema = z
  .string()
  .min(1, "Enter a phone number")
  .min(10, "Enter at least 10 digits")
  .regex(/^\+?[\d\s-()]+$/, "Enter a valid phone number");

export const emailSchema = z
  .string()
  .min(1, "Enter an email address")
  .email("Please enter a valid email address");
