import * as z from "zod";
import {
  phoneSchema,
  requiredStringSchema,
} from "@/features/_shared/schemas/common.schemas";

export const clinicSettingsSchema = z.object({
  name: requiredStringSchema("Facility Name"),
  address: requiredStringSchema("Address"),
  phone: phoneSchema,
  gstin: z.union([z.string().trim(), z.literal("")]).optional(),
  legalName: z
    .union([z.string().trim().max(160), z.literal("")])
    .optional(),
  facilityLabel: z.enum(["CLINIC", "HOSPITAL"]).optional(),
  mapsLink: z
    .union([
      z.string().trim().url({ message: "Enter a valid Google Maps URL" }),
      z.literal(""),
    ])
    .optional(),
});

export type ClinicSettingsFormValues = z.infer<typeof clinicSettingsSchema>;
