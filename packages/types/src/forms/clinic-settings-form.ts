import { z } from "zod";
import { phoneSchema, requiredStringSchema } from "./common";
import { facilityTypeSchema } from "../shared/users";

// allow-no-base-schema: owner=clinic-settings reason=settings-json-projection review=2026-09-30
export const clinicSettingsFormSchema = z.object({
  name: requiredStringSchema("Facility Name"),
  address: requiredStringSchema("Address"),
  phone: phoneSchema,
  gstin: z.union([z.string().trim(), z.literal("")]).optional(),
  legalName: z
    .union([z.string().trim().max(160), z.literal("")])
    .optional(),
  facilityLabel: facilityTypeSchema.optional(),
  mapsLink: z
    .union([
      z.string().trim().url({ message: "Enter a valid Google Maps URL" }),
      z.literal(""),
    ])
    .optional(),
});

export type ClinicSettingsFormValues = z.infer<typeof clinicSettingsFormSchema>;
