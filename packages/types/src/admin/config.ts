import { z } from "zod";
import {
  genderSchema,
  bloodGroupSchema,
  appointmentTypeSchema,
  specializationSchema,
} from "./index";

export const formOptionsSchema = z.object({
  genders: z.array(z.object({ value: genderSchema, label: z.string() })),
  bloodGroups: z.array(
    z.object({ value: bloodGroupSchema, label: z.string() }),
  ),
  appointmentTypes: z.array(
    z.object({ value: appointmentTypeSchema, label: z.string() }),
  ),
  specializations: z.array(
    z.object({ value: specializationSchema, label: z.string() }),
  ),
});

export const appConstantsSchema = z.object({
  // Define global constants schema here, e.g.
  CURRENCY: z.string(),
  TIMEZONE: z.string(),
  SUPPORT_EMAIL: z.string(),
});

export const patientImportFieldsSchema = z.array(
  z.object({
    key: z.string(),
    label: z.string(),
    required: z.boolean(),
    type: z.string(),
    options: z.array(z.string()).optional(),
  }),
);

export const appConfigSchema = z.object({
  formOptions: formOptionsSchema,
  constants: appConstantsSchema,
  importFields: patientImportFieldsSchema,
  clinicConfig: z.record(z.unknown()).optional(), // Clinic specific overrides
});
