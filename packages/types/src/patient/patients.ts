import { z } from "zod";
import { genderSchema } from "../shared/users";
import { codeStatusSchema } from "../clinical/medical";
import { stripHtmlTags } from "../api/sanitization";
export const patientTagSchema = z.object({
  id: z.string(),
  tag: z.string(),
  color: z.string(),
});
export type PatientTag = z.infer<typeof patientTagSchema>;

export const isolationStatusSchema = z.enum([
  "NONE",
  "CONTACT",
  "DROPLET",
  "AIRBORNE",
  "CONTACT_Droplet",
  "PROTECTIVE",
]);
export type IsolationStatus = z.infer<typeof isolationStatusSchema>;

export const ISOLATION_STATUS_LABELS: Record<IsolationStatus, string> = {
  NONE: "Standard Precautions",
  CONTACT: "Contact Isolation",
  DROPLET: "Droplet Isolation",
  AIRBORNE: "Airborne Isolation",
  CONTACT_Droplet: "Contact & Droplet",
  PROTECTIVE: "Protective (Neutropenic)",
};

export const comprehensiveVitalsSchema = z.object({
  systolicBP: z.number().min(0).max(300).optional(),
  diastolicBP: z.number().min(0).max(200).optional(),
  heartRate: z.number().min(0).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(), 
  temperatureUnit: z.enum(["C", "F"]).default("C"),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  respiratoryRate: z.number().min(0).max(100).optional(),
  painScore: z.number().min(0).max(10).optional(),
  bloodGlucose: z.number().optional(), 
  consciousness: z.enum(["ALERT", "VERBAL", "PAIN", "UNRESPONSIVE"]).optional(),
});
export type ComprehensiveVitals = z.infer<typeof comprehensiveVitalsSchema>;

export const patientSchema = z.object({
  id: z.string().optional(),
  mrn: z.string().max(50).nullable().optional(), 
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  preferredName: z.string().max(100).nullable().optional(),
  pronouns: z.string().max(50).nullable().optional(),
  dateOfBirth: z.string().or(z.date()),
  gender: genderSchema,
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20),
  email: z.string().email().max(255).nullable().optional().or(z.literal("")),
  address: z.string().max(500).nullable().optional().transform(stripHtmlTags),
  medicalHistory: z.array(z.string().max(255)).optional(),
  bloodGroup: z.string().max(10).nullable().optional(),
  allergies: z
    .string()
    .max(1000)
    .nullable()
    .optional()
    .transform(stripHtmlTags),
  clinicId: z.string().optional(),

  race: z.string().max(50).optional(),
  ethnicity: z.string().max(50).optional(),
  preferredLanguage: z.string().max(50).optional(),
  maritalStatus: z.string().max(50).optional(),

  isolationStatus: isolationStatusSchema.default("NONE"),
  fallRisk: z.boolean().default(false),

  insuranceProvider: z.string().max(100).optional(),
  insurancePolicyNumber: z.string().max(100).optional(),
  insuranceGroupNumber: z.string().max(100).optional(),

  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  emergencyContactRelation: z.string().max(50).optional(),

  codeStatus: codeStatusSchema.optional(),
  codeStatusUpdatedAt: z.string().or(z.date()).optional(),
  codeStatusUpdatedBy: z.string().optional(),
  advanceDirectiveUrl: z.string().optional(),

  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  tags: z.array(patientTagSchema).optional(),
  customData: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});
export type Patient = z.infer<typeof patientSchema>;

export const createPatientSchema = patientSchema.extend({
  dateOfBirth: z
    .string()
    .or(z.date())
    .refine(
      (val: string | Date) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date < new Date();
      },
      {
        message: "Date of birth must be in the past",
      },
    ),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const medicalConditionTypeSchema = z.enum([
  "CHRONIC",
  "ACUTE",
  "CONGENITAL",
  "INFECTIOUS",
  "AUTOIMMUNE",
  "PSYCHIATRIC",
  "OTHER",
]);
export type MedicalConditionType = z.infer<typeof medicalConditionTypeSchema>;

export const MEDICAL_CONDITION_TYPE_LABELS: Record<
  MedicalConditionType,
  string
> = {
  CHRONIC: "Chronic Condition",
  ACUTE: "Acute Condition",
  CONGENITAL: "Congenital",
  INFECTIOUS: "Infectious Disease",
  AUTOIMMUNE: "Autoimmune",
  PSYCHIATRIC: "Psychiatric/Mental Health",
  OTHER: "Other",
};

export const conditionStatusSchema = z.enum([
  "ACTIVE",
  "MANAGED",
  "RESOLVED",
  "IN_REMISSION",
]);
export type ConditionStatus = z.infer<typeof conditionStatusSchema>;

export const CONDITION_STATUS_LABELS: Record<ConditionStatus, string> = {
  ACTIVE: "Active",
  MANAGED: "Managed",
  RESOLVED: "Resolved",
  IN_REMISSION: "In Remission",
};

export const CONDITION_STATUS_COLORS: Record<ConditionStatus, string> = {
  ACTIVE: "destructive",
  MANAGED: "secondary",
  RESOLVED: "outline",
  IN_REMISSION: "default",
};

export const conditionSeveritySchema = z.enum([
  "MILD",
  "MODERATE",
  "SEVERE",
  "CRITICAL",
]);
export type ConditionSeverity = z.infer<typeof conditionSeveritySchema>;

export const CONDITION_SEVERITY_LABELS: Record<ConditionSeverity, string> = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
  CRITICAL: "Critical",
};

export const CONDITION_SEVERITY_COLORS: Record<ConditionSeverity, string> = {
  MILD: "bg-green-100 text-green-800 border-green-300",
  MODERATE: "bg-yellow-100 text-yellow-800 border-yellow-300",
  SEVERE: "bg-orange-100 text-orange-800 border-orange-300",
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
};

export const conditionSourceTypeSchema = z.enum([
  "MANUAL",
  "AUTO_SUGGESTED",
  "IMPORTED",
]);
export type ConditionSourceType = z.infer<typeof conditionSourceTypeSchema>;

export const patientMedicalConditionSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  conditionName: z.string().min(1, "Condition name is required").max(255),
  icdCode: z.string().max(20).optional(),
  conditionType: medicalConditionTypeSchema.default("CHRONIC"),
  status: conditionStatusSchema.default("ACTIVE"),
  severity: conditionSeveritySchema.optional(),
  diagnosedDate: z.string().or(z.date()).optional(),
  resolvedDate: z.string().or(z.date()).optional(),
  diagnosedBy: z.string().max(100).optional().transform(stripHtmlTags),
  notes: z.string().max(2000).optional().transform(stripHtmlTags),
  sourceType: conditionSourceTypeSchema.default("MANUAL"),
  sourceAppointmentId: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientMedicalCondition = z.infer<
  typeof patientMedicalConditionSchema
>;

export const allergyTypeSchema = z.enum([
  "DRUG",
  "FOOD",
  "ENVIRONMENTAL",
  "LATEX",
  "INSECT",
  "CONTRAST",
  "OTHER",
]);
export type AllergyType = z.infer<typeof allergyTypeSchema>;

export const ALLERGY_TYPE_LABELS: Record<AllergyType, string> = {
  DRUG: "Drug/Medication",
  FOOD: "Food",
  ENVIRONMENTAL: "Environmental",
  LATEX: "Latex",
  INSECT: "Insect Sting/Bite",
  CONTRAST: "Contrast Dye",
  OTHER: "Other",
};

export const allergySeveritySchema = z.enum([
  "MILD",
  "MODERATE",
  "SEVERE",
  "LIFE_THREATENING",
]);
export type AllergySeverity = z.infer<typeof allergySeveritySchema>;

export const ALLERGY_SEVERITY_LABELS: Record<AllergySeverity, string> = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
  LIFE_THREATENING: "Life-Threatening",
};

export const ALLERGY_SEVERITY_COLORS: Record<AllergySeverity, string> = {
  MILD: "bg-yellow-100 text-yellow-800 border-yellow-300",
  MODERATE: "bg-orange-100 text-orange-800 border-orange-300",
  SEVERE: "bg-red-100 text-red-800 border-red-300",
  LIFE_THREATENING: "bg-red-200 text-red-900 border-red-500 animate-pulse",
};

export const patientAllergySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  allergen: z
    .string()
    .min(1, "Allergen is required")
    .max(255)
    .transform(stripHtmlTags),
  allergyType: allergyTypeSchema.default("DRUG"),
  severity: allergySeveritySchema.default("MODERATE"),
  reaction: z.string().max(500).optional().transform(stripHtmlTags),
  onsetDate: z.string().or(z.date()).optional(),
  verifiedBy: z.string().max(100).optional().transform(stripHtmlTags),
  verifiedAt: z.string().or(z.date()).optional(),
  isVerified: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientAllergy = z.infer<typeof patientAllergySchema>;

export const patientFamilyHistorySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  condition: z.string().min(1, "Condition is required").max(255),
  relationship: z
    .string()
    .min(1, "Relationship is required")
    .max(100)
    .transform(stripHtmlTags),
  ageAtOnset: z.number().optional(),
  notes: z.string().max(2000).optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientFamilyHistory = z.infer<typeof patientFamilyHistorySchema>;

export const smokingStatusSchema = z.enum([
  "NEVER",
  "FORMER",
  "CURRENT",
  "UNKNOWN",
]);
export type SmokingStatus = z.infer<typeof smokingStatusSchema>;

export const SMOKING_STATUS_LABELS: Record<SmokingStatus, string> = {
  NEVER: "Never Smoked",
  FORMER: "Former Smoker",
  CURRENT: "Current Smoker",
  UNKNOWN: "Unknown",
};

export const alcoholUseStatusSchema = z.enum([
  "NONE",
  "OCCASIONAL",
  "MODERATE",
  "HEAVY",
  "UNKNOWN",
]);
export type AlcoholUseStatus = z.infer<typeof alcoholUseStatusSchema>;

export const ALCOHOL_USE_STATUS_LABELS: Record<AlcoholUseStatus, string> = {
  NONE: "None",
  OCCASIONAL: "Occasional",
  MODERATE: "Moderate",
  HEAVY: "Heavy",
  UNKNOWN: "Unknown",
};

export const patientSocialHistorySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  smokingStatus: smokingStatusSchema.optional(),
  smokingPackYears: z.number().optional(),
  smokingQuitDate: z.string().or(z.date()).optional(),
  alcoholUse: alcoholUseStatusSchema.optional(),
  alcoholFrequency: z.string().max(100).optional().transform(stripHtmlTags),
  substanceUse: z.string().max(255).optional().transform(stripHtmlTags),
  occupation: z.string().max(100).optional().transform(stripHtmlTags),
  occupationalHazards: z.string().max(255).optional().transform(stripHtmlTags),
  exerciseFrequency: z.string().max(100).optional().transform(stripHtmlTags),
  dietaryRestrictions: z.string().max(255).optional().transform(stripHtmlTags),
  notes: z.string().max(2000).optional().transform(stripHtmlTags),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientSocialHistory = z.infer<typeof patientSocialHistorySchema>;

export const patientSurgicalHistorySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  procedureName: z.string().min(1, "Procedure name is required").max(255),
  procedureDate: z.string().or(z.date()).optional(),
  hospital: z.string().max(255).optional(),
  surgeon: z.string().max(100).optional(),
  complications: z.string().max(1000).optional().transform(stripHtmlTags),
  notes: z.string().max(2000).optional().transform(stripHtmlTags),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientSurgicalHistory = z.infer<
  typeof patientSurgicalHistorySchema
>;

export const patientWithMedicalHistorySchema = patientSchema.extend({
  medicalConditions: z.array(patientMedicalConditionSchema).optional(),
  patientAllergies: z.array(patientAllergySchema).optional(),
  familyHistory: z.array(patientFamilyHistorySchema).optional(),
  socialHistory: patientSocialHistorySchema.optional(),
  surgicalHistory: z.array(patientSurgicalHistorySchema).optional(),
});
export type PatientWithMedicalHistory = z.infer<
  typeof patientWithMedicalHistorySchema
>;

export const updatePatientSchema = patientWithMedicalHistorySchema.partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
