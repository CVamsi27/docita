import { z } from 'zod';

export const medicalConditionTypeSchema = z.enum([
  'CHRONIC',
  'ACUTE',
  'CONGENITAL',
  'INFECTIOUS',
  'AUTOIMMUNE',
  'PSYCHIATRIC',
  'OTHER',
]);

export const conditionStatusSchema = z.enum([
  'ACTIVE',
  'MANAGED',
  'RESOLVED',
  'IN_REMISSION',
]);

export const conditionSeveritySchema = z.enum([
  'MILD',
  'MODERATE',
  'SEVERE',
  'CRITICAL',
]);

export const createMedicalConditionSchema = z.object({
  conditionName: z.string(),
  icdCode: z.string().optional(),
  conditionType: medicalConditionTypeSchema.optional(),
  status: conditionStatusSchema.optional(),
  severity: conditionSeveritySchema.optional(),
  diagnosedDate: z.string().optional(),
  resolvedDate: z.string().optional(),
  notes: z.string().optional(),
  diagnosedBy: z.string().optional(),
});

export type CreateMedicalConditionDto = z.infer<
  typeof createMedicalConditionSchema
>;

export const allergyTypeSchema = z.enum([
  'DRUG',
  'FOOD',
  'ENVIRONMENTAL',
  'LATEX',
  'INSECT',
  'CONTRAST',
  'OTHER',
]);

export const allergySeveritySchema = z.enum([
  'MILD',
  'MODERATE',
  'SEVERE',
  'LIFE_THREATENING',
]);

export const createAllergySchema = z.object({
  allergen: z.string(),
  allergyType: allergyTypeSchema.optional(),
  severity: allergySeveritySchema.optional(),
  reaction: z.string().optional(),
  notes: z.string().optional(),
  onsetDate: z.string().optional(),
});

export type CreateAllergyDto = z.infer<typeof createAllergySchema>;

export const createFamilyHistorySchema = z.object({
  relationship: z.string(),
  condition: z.string(),
  ageAtOnset: z.number().optional(),
  notes: z.string().optional(),
});

export type CreateFamilyHistoryDto = z.infer<typeof createFamilyHistorySchema>;

export const smokingStatusSchema = z.enum([
  'NEVER',
  'FORMER',
  'CURRENT',
  'UNKNOWN',
]);

export const alcoholUseStatusSchema = z.enum([
  'NONE',
  'OCCASIONAL',
  'MODERATE',
  'HEAVY',
  'UNKNOWN',
]);

export const createSocialHistorySchema = z.object({
  smokingStatus: smokingStatusSchema.optional(),
  smokingPackYears: z.number().optional(),
  smokingQuitDate: z.string().optional(),
  alcoholUse: alcoholUseStatusSchema.optional(),
  alcoholFrequency: z.string().optional(),
  substanceUse: z.string().optional(),
  occupation: z.string().optional(),
  occupationalHazards: z.string().optional(),
  exerciseFrequency: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateSocialHistoryDto = z.infer<typeof createSocialHistorySchema>;

export const createSurgicalHistorySchema = z.object({
  procedureName: z.string(),
  procedureDate: z.string().optional(),
  hospital: z.string().optional(),
  surgeon: z.string().optional(),
  complications: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateSurgicalHistoryDto = z.infer<
  typeof createSurgicalHistorySchema
>;
