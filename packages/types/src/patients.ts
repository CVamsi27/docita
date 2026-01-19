import { z } from "zod";
import { genderSchema } from "./users";
import { codeStatusSchema } from "./medical";
export const patientTagSchema = z.object({
  id: z.string(),
  tag: z.string(),
  color: z.string(),
});
export type PatientTag = z.infer<typeof patientTagSchema>;

// Isolation Status
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

// Comprehensive Vitals Schema
export const comprehensiveVitalsSchema = z.object({
  systolicBP: z.number().min(0).max(300).optional(),
  diastolicBP: z.number().min(0).max(200).optional(),
  heartRate: z.number().min(0).max(300).optional(),
  temperature: z.number().min(30).max(45).optional(), // Celsius default
  temperatureUnit: z.enum(["C", "F"]).default("C"),
  oxygenSaturation: z.number().min(0).max(100).optional(),
  respiratoryRate: z.number().min(0).max(100).optional(),
  painScore: z.number().min(0).max(10).optional(),
  bloodGlucose: z.number().optional(), // mg/dL
  consciousness: z.enum(["ALERT", "VERBAL", "PAIN", "UNRESPONSIVE"]).optional(),
});
export type ComprehensiveVitals = z.infer<typeof comprehensiveVitalsSchema>;

export const patientSchema = z.object({
  id: z.string().optional(),
  mrn: z.string().optional(), // Medical Record Number
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  preferredName: z.string().optional(),
  pronouns: z.string().optional(),
  dateOfBirth: z.string().or(z.date()),
  gender: genderSchema,
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  medicalHistory: z.array(z.string()).optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  clinicId: z.string().optional(),

  // Hospital-Grade Demographics
  race: z.string().optional(),
  ethnicity: z.string().optional(),
  preferredLanguage: z.string().optional(),
  maritalStatus: z.string().optional(),

  // Hospital Safety
  isolationStatus: isolationStatusSchema.default("NONE"),
  fallRisk: z.boolean().default(false),

  // Insurance Information
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceGroupNumber: z.string().optional(),

  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),

  // Patient Safety - Code Status (DNR/Full Code)
  codeStatus: codeStatusSchema.optional(),
  codeStatusUpdatedAt: z.string().or(z.date()).optional(),
  codeStatusUpdatedBy: z.string().optional(),
  advanceDirectiveUrl: z.string().optional(),

  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  tags: z.array(patientTagSchema).optional(),
  customData: z.record(z.unknown()).optional(),
});
export type Patient = z.infer<typeof patientSchema>;

export const createPatientSchema = patientSchema.extend({
  dateOfBirth: z.string().or(z.date()).refine(
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

// Moved updatePatientSchema down to use extended schema

// ============================================================================
// Structured Medical History Schemas
// ============================================================================

// Medical Condition Types
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

// Condition Status
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

// Condition Severity
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

// Source type for tracking how conditions were added
export const conditionSourceTypeSchema = z.enum([
  "MANUAL",
  "AUTO_SUGGESTED",
  "IMPORTED",
]);
export type ConditionSourceType = z.infer<typeof conditionSourceTypeSchema>;

// Patient Medical Condition Schema
export const patientMedicalConditionSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  conditionName: z.string().min(1, "Condition name is required"),
  icdCode: z.string().optional(),
  conditionType: medicalConditionTypeSchema.default("CHRONIC"),
  status: conditionStatusSchema.default("ACTIVE"),
  severity: conditionSeveritySchema.optional(),
  diagnosedDate: z.string().or(z.date()).optional(),
  resolvedDate: z.string().or(z.date()).optional(),
  diagnosedBy: z.string().optional(),
  notes: z.string().optional(),
  sourceType: conditionSourceTypeSchema.default("MANUAL"),
  sourceAppointmentId: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientMedicalCondition = z.infer<
  typeof patientMedicalConditionSchema
>;

// Allergy Types
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

// Allergy Severity
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

// Patient Allergy Schema
export const patientAllergySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  allergen: z.string().min(1, "Allergen is required"),
  allergyType: allergyTypeSchema.default("DRUG"),
  severity: allergySeveritySchema.default("MODERATE"),
  reaction: z.string().optional(),
  onsetDate: z.string().or(z.date()).optional(),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().or(z.date()).optional(),
  isVerified: z.boolean().default(false),
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientAllergy = z.infer<typeof patientAllergySchema>;

// Family History Schema
export const patientFamilyHistorySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  condition: z.string().min(1, "Condition is required"),
  relationship: z.string().min(1, "Relationship is required"),
  ageAtOnset: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientFamilyHistory = z.infer<typeof patientFamilyHistorySchema>;

// Smoking Status
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

// Alcohol Use Status
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

// Social History Schema
export const patientSocialHistorySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  smokingStatus: smokingStatusSchema.optional(),
  smokingPackYears: z.number().optional(),
  smokingQuitDate: z.string().or(z.date()).optional(),
  alcoholUse: alcoholUseStatusSchema.optional(),
  alcoholFrequency: z.string().optional(),
  substanceUse: z.string().optional(),
  occupation: z.string().optional(),
  occupationalHazards: z.string().optional(),
  exerciseFrequency: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientSocialHistory = z.infer<typeof patientSocialHistorySchema>;

// Surgical History Schema
export const patientSurgicalHistorySchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  procedureName: z.string().min(1, "Procedure name is required"),
  procedureDate: z.string().or(z.date()).optional(),
  hospital: z.string().optional(),
  surgeon: z.string().optional(),
  complications: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type PatientSurgicalHistory = z.infer<
  typeof patientSurgicalHistorySchema
>;

// Extended Patient Schema with structured medical history
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
