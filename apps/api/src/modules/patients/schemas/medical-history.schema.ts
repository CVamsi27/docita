import { z } from 'zod';
import {
  MedicalConditionType,
  ConditionStatus,
  ConditionSeverity,
  AllergySeverity,
  AllergyType,
  SmokingStatus,
  AlcoholUseStatus,
} from '@workspace/db';

// Medical Condition
export const MedicalConditionSchema = z.object({
  conditionName: z.string().min(1),
  icdCode: z.string().optional(),
  conditionType: z
    .nativeEnum(MedicalConditionType)
    .default(MedicalConditionType.CHRONIC),
  status: z.nativeEnum(ConditionStatus).default(ConditionStatus.ACTIVE),
  severity: z.nativeEnum(ConditionSeverity).optional(),
  diagnosedDate: z.string().optional(), // ISO Date string
  resolvedDate: z.string().optional(), // ISO Date string
  notes: z.string().optional(),
  diagnosedBy: z.string().optional(),
});

// Allergy
export const AllergySchema = z.object({
  allergen: z.string().min(1),
  allergyType: z.nativeEnum(AllergyType).default(AllergyType.OTHER),
  severity: z.nativeEnum(AllergySeverity).default(AllergySeverity.MODERATE),
  reaction: z.string().optional(),
  notes: z.string().optional(),
  onsetDate: z.string().optional(), // ISO Date string
});

// Family History
export const FamilyHistorySchema = z.object({
  relationship: z.string().min(1),
  condition: z.string().min(1),
  ageAtOnset: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// Social History
export const SocialHistorySchema = z.object({
  smokingStatus: z.nativeEnum(SmokingStatus).optional(),
  smokingPackYears: z.number().min(0).optional(),
  smokingQuitDate: z.string().optional(), // ISO Date string
  alcoholUse: z.nativeEnum(AlcoholUseStatus).optional(),
  alcoholFrequency: z.string().optional(),
  substanceUse: z.string().optional(),
  occupation: z.string().optional(),
  occupationalHazards: z.string().optional(),
  exerciseFrequency: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
});

// Surgical History
export const SurgicalHistorySchema = z.object({
  procedureName: z.string().min(1),
  procedureDate: z.string().optional(), // ISO Date string
  hospital: z.string().optional(),
  surgeon: z.string().optional(),
  complications: z.string().optional(),
  notes: z.string().optional(),
});

export type MedicalConditionInput = z.input<typeof MedicalConditionSchema>;
export type AllergyInput = z.input<typeof AllergySchema>;
export type FamilyHistoryInput = z.input<typeof FamilyHistorySchema>;
export type SocialHistoryInput = z.input<typeof SocialHistorySchema>;
export type SurgicalHistoryInput = z.input<typeof SurgicalHistorySchema>;
