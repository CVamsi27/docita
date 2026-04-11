import { z } from "zod";
import {
  patientAllergySchema,
  patientFamilyHistorySchema,
  patientMedicalConditionSchema,
  patientSocialHistorySchema,
  patientSurgicalHistorySchema,
} from "./patients";

export const createMedicalConditionSchema = patientMedicalConditionSchema.omit({
  id: true,
  patientId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateMedicalConditionInput = z.infer<
  typeof createMedicalConditionSchema
>;

export const updateMedicalConditionSchema = createMedicalConditionSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Update at least one field before saving.",
  });
export type UpdateMedicalConditionInput = z.infer<
  typeof updateMedicalConditionSchema
>;

export const createPatientAllergySchema = patientAllergySchema.omit({
  id: true,
  patientId: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
  verifiedBy: true,
  isVerified: true,
});
export type CreatePatientAllergyInput = z.infer<typeof createPatientAllergySchema>;

export const updatePatientAllergySchema = createPatientAllergySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Update at least one field before saving.",
  });
export type UpdatePatientAllergyInput = z.infer<typeof updatePatientAllergySchema>;

export const createPatientFamilyHistorySchema = patientFamilyHistorySchema.omit({
  id: true,
  patientId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePatientFamilyHistoryInput = z.infer<
  typeof createPatientFamilyHistorySchema
>;

export const updatePatientFamilyHistorySchema = createPatientFamilyHistorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Update at least one field before saving.",
  });
export type UpdatePatientFamilyHistoryInput = z.infer<
  typeof updatePatientFamilyHistorySchema
>;

export const createPatientSocialHistorySchema = patientSocialHistorySchema.omit({
  id: true,
  patientId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreatePatientSocialHistoryInput = z.infer<
  typeof createPatientSocialHistorySchema
>;

export const createPatientSurgicalHistorySchema =
  patientSurgicalHistorySchema.omit({
    id: true,
    patientId: true,
    createdAt: true,
    updatedAt: true,
  });
export type CreatePatientSurgicalHistoryInput = z.infer<
  typeof createPatientSurgicalHistorySchema
>;

export const updatePatientSurgicalHistorySchema =
  createPatientSurgicalHistorySchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "Update at least one field before saving.",
    },
  );
export type UpdatePatientSurgicalHistoryInput = z.infer<
  typeof updatePatientSurgicalHistorySchema
>;
