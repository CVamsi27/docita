import { z } from 'zod';

export const medicalConditionSchema = z.object({
  conditionName: z.string(),
  icdCode: z.string().optional(),
  conditionType: z.string().optional(),
  status: z.string(),
  severity: z.string().optional(),
  diagnosedDate: z.union([z.date(), z.string().datetime()]).optional(),
  resolvedDate: z.union([z.date(), z.string().datetime()]).optional(),
  notes: z.string().optional(),
  diagnosedBy: z.string().optional(),
});

export type MedicalConditionInput = z.infer<typeof medicalConditionSchema>;

export const allergySchema = z.object({
  allergen: z.string(),
  allergyType: z.string().optional(),
  severity: z.string().optional(),
  reaction: z.string().optional(),
  notes: z.string().optional(),
  onsetDate: z.union([z.date(), z.string().datetime()]).optional(),
});

export type AllergyInput = z.infer<typeof allergySchema>;

export const familyHistorySchema = z.object({
  relationship: z.string(),
  condition: z.string(),
  ageAtOnset: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export type FamilyHistoryInput = z.infer<typeof familyHistorySchema>;

export const socialHistorySchema = z.object({
  smokingStatus: z.string().optional(),
  smokingPackYears: z.coerce.number().optional(),
  smokingQuitDate: z.union([z.date(), z.string().datetime()]).optional(),
  alcoholUse: z.string().optional(),
  alcoholFrequency: z.string().optional(),
  substanceUse: z.string().optional(),
  occupation: z.string().optional(),
  occupationalHazards: z.string().optional(),
  exerciseFrequency: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
});

export type SocialHistoryInput = z.infer<typeof socialHistorySchema>;

export const surgicalHistorySchema = z.object({
  procedureName: z.string(),
  procedureDate: z.union([z.date(), z.string().datetime()]).optional(),
  hospital: z.string().optional(),
  surgeon: z.string().optional(),
  complications: z.string().optional(),
  notes: z.string().optional(),
});

export type SurgicalHistoryInput = z.infer<typeof surgicalHistorySchema>;
