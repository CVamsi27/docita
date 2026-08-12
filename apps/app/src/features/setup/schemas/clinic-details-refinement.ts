import { z } from "zod";
import {
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumber,
  type Country,
} from "react-phone-number-input";
import { resolveLibPhoneCountryFromCode } from "@/lib/phone/libphone-country.boundary";
import { onboardingClinicDetailsBaseSchema } from "@workspace/types";

/** Applies locale-aware phone and required address refinements for clinic onboarding. */
export const clinicDetailsSchema =
  onboardingClinicDetailsBaseSchema.superRefine((data, ctx) => {
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

    const country: Country = resolveLibPhoneCountryFromCode(data.countryCode);
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

    const lat = data.mapsLocation?.lat;
    const lng = data.mapsLocation?.lng;
    const hasMapPin = typeof lat === "number" && typeof lng === "number";
    if (!hasMapPin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mapsLocation"],
        message: "Pin the clinic on the map to continue",
      });
    }
  });
