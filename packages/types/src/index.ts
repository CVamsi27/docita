import { z } from "zod";
import { PaymentMethod, PaymentMode } from "./payments";

// ============================================================================
// Re-export all types from modules
// ============================================================================

// Tier System
export * from "./tier";

// App Configuration

// Import Types

// Payment Types
export * from "./payments";

// Medical Validation
export * from "./medical-validation";

// Contraindication Checking
export * from "./contraindication-checker";

// Procedure Codes (CDT & CPT)
export * from "./procedure-codes";

// Document Types (including X-rays)
export * from "./document-types";

// Team Member Types
export * from "./members";

// API Response Types, Error Codes, and Routes
export * from "./api-response";

// ============================================================================
// User & Auth Schemas
// ============================================================================

export const userRoleSchema = z.enum([
  "DOCTOR",
  "RECEPTIONIST",
  "ADMIN",
  "SUPER_ADMIN",
  "ADMIN_DOCTOR",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

// Gender
export const genderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "INTERSEX",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
]);
export type Gender = z.infer<typeof genderSchema>;

// Blood Group
export const bloodGroupSchema = z.enum([
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
]);
export type BloodGroup = z.infer<typeof bloodGroupSchema>;

// Appointment Status
export const appointmentStatusSchema = z.enum([
  "scheduled", "confirmed", "checked-in", "in-progress", "completed", "cancelled", "no-show"
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

// Appointment Type
export const appointmentTypeSchema = z.enum([
  "consultation", "follow-up", "check-up", "emergency", "procedure"
]);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

// Weekday
export const weekdaySchema = z.enum([
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
]);
export type Weekday = z.infer<typeof weekdaySchema>;

// Invoice Status
export const invoiceStatusSchema = z.enum([
  "pending", "paid", "overdue", "cancelled"
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

// Payment Status
export const paymentStatusSchema = z.enum([
  "created", "pending", "paid", "failed", "expired", "cancelled"
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Custom Field & Template Field Types
export const customFieldTypeSchema = z.enum([
  "text", "number", "select", "date", "checkbox", "textarea"
]);
export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;

export const templateFieldTypeSchema = z.enum([
  "text", "number", "select", "checkbox", "textarea"
]);
export type TemplateFieldType = z.infer<typeof templateFieldTypeSchema>;

// WhatsApp Message Type
export const whatsappMessageTypeSchema = z.enum([
  "reminder", "receipt", "payment-link", "general"
]);
export type WhatsappMessageType = z.infer<typeof whatsappMessageTypeSchema>;

// Currency
export const currencySchema = z.enum([
  "INR", "USD", "GBP", "EUR", "AUD", "CAD", "SGD", "AED", "ZAR"
]);
export type Currency = z.infer<typeof currencySchema>;

// Facility Type
export const facilityTypeSchema = z.enum(["CLINIC", "HOSPITAL"]);
export type FacilityTypeType = z.infer<typeof facilityTypeSchema>;
export enum FacilityType {
  CLINIC = "CLINIC",
  HOSPITAL = "HOSPITAL",
}

// Medical Specializations
export const specializationSchema = z.enum([
  "GENERAL_PRACTICE",
  "DENTAL",
  "CARDIOLOGY",
  "PEDIATRICS",
  "OPHTHALMOLOGY",
  "DERMATOLOGY",
  "ORTHOPEDICS",
  "NEUROLOGY",
  "GYNECOLOGY",
  "ENT",
  "PSYCHIATRY",
  "UROLOGY",
  "PULMONOLOGY",
  "GASTROENTEROLOGY",
  "ONCOLOGY",
  "NEPHROLOGY",
  "ENDOCRINOLOGY",
  "RHEUMATOLOGY",
  "RADIOLOGY",
  "PATHOLOGY",
  "ANESTHESIOLOGY",
  "EMERGENCY_MEDICINE",
  "FAMILY_MEDICINE",
  "INTERNAL_MEDICINE",
  "PLASTIC_SURGERY",
  "GENERAL_SURGERY",
  "OTHER",
]);
export type Specialization = z.infer<typeof specializationSchema>;

// Hospital Role - What role the doctor plays in the hospital
export const hospitalRoleSchema = z.enum([
  "CONSULTANT",
  "SENIOR_CONSULTANT",
  "JUNIOR_DOCTOR",
  "RESIDENT",
  "INTERN",
  "VISITING_DOCTOR",
  "HEAD_OF_DEPARTMENT",
  "MEDICAL_DIRECTOR",
  "SURGEON",
  "CHIEF_SURGEON",
  "ATTENDING_PHYSICIAN",
  "FELLOW",
]);
export type HospitalRole = z.infer<typeof hospitalRoleSchema>;

// Specialization display labels
export const SPECIALIZATION_LABELS: Record<Specialization, string> = {
  GENERAL_PRACTICE: "General Practice",
  DENTAL: "Dental / Dentistry",
  CARDIOLOGY: "Cardiology",
  PEDIATRICS: "Pediatrics",
  OPHTHALMOLOGY: "Ophthalmology",
  DERMATOLOGY: "Dermatology",
  ORTHOPEDICS: "Orthopedics",
  NEUROLOGY: "Neurology",
  GYNECOLOGY: "Gynecology & Obstetrics",
  ENT: "ENT (Ear, Nose, Throat)",
  PSYCHIATRY: "Psychiatry",
  UROLOGY: "Urology",
  PULMONOLOGY: "Pulmonology",
  GASTROENTEROLOGY: "Gastroenterology",
  ONCOLOGY: "Oncology",
  NEPHROLOGY: "Nephrology",
  ENDOCRINOLOGY: "Endocrinology",
  RHEUMATOLOGY: "Rheumatology",
  RADIOLOGY: "Radiology",
  PATHOLOGY: "Pathology",
  ANESTHESIOLOGY: "Anesthesiology",
  EMERGENCY_MEDICINE: "Emergency Medicine",
  FAMILY_MEDICINE: "Family Medicine",
  INTERNAL_MEDICINE: "Internal Medicine",
  PLASTIC_SURGERY: "Plastic Surgery",
  GENERAL_SURGERY: "General Surgery",
  OTHER: "Other",
};

// Hospital Role display labels
export const HOSPITAL_ROLE_LABELS: Record<HospitalRole, string> = {
  CONSULTANT: "Consultant",
  SENIOR_CONSULTANT: "Senior Consultant",
  JUNIOR_DOCTOR: "Junior Doctor",
  RESIDENT: "Resident",
  INTERN: "Intern",
  VISITING_DOCTOR: "Visiting Doctor",
  HEAD_OF_DEPARTMENT: "Head of Department",
  MEDICAL_DIRECTOR: "Medical Director",
  SURGEON: "Surgeon",
  CHIEF_SURGEON: "Chief Surgeon",
  ATTENDING_PHYSICIAN: "Attending Physician",
  FELLOW: "Fellow",
};

// Clinic Type Configuration
export const clinicTypeSchema = z.enum([
  "GENERAL",
  "DENTAL",
  "PEDIATRIC",
  "ORTHOPEDIC",
  "CARDIOLOGY",
  "DERMATOLOGY",
  "ENT",
  "GYNECOLOGY",
  "OPHTHALMOLOGY",
  "PSYCHIATRY",
  "SPECIALTY",
]);

export type ClinicType = z.infer<typeof clinicTypeSchema>;

export const CLINIC_TYPE_LABELS: Record<ClinicType, string> = {
  GENERAL: "General Medicine",
  DENTAL: "Dental Clinic",
  PEDIATRIC: "Pediatric Care",
  ORTHOPEDIC: "Orthopedic Center",
  CARDIOLOGY: "Cardiology Center",
  DERMATOLOGY: "Dermatology Clinic",
  ENT: "ENT Specialist",
  GYNECOLOGY: "Gynecology Clinic",
  OPHTHALMOLOGY: "Eye Care Center",
  PSYCHIATRY: "Mental Health Clinic",
  SPECIALTY: "Specialty Clinic",
};

// Feature matrix defining available consultation features per clinic type
export interface ClinicTypeFeatures {
  // Core consultation features
  chiefComplaint: boolean;
  history: boolean;
  examination: boolean;
  vitals: boolean;
  diagnosis: boolean;
  treatment: boolean;
  investigations: boolean;
  prescriptions: boolean;
  procedures: boolean;
  followUp: boolean;

  // Specialty-specific features
  dentalChart?: boolean; // DENTAL: Tooth chart and oral cavity mapping
  growthChart?: boolean; // PEDIATRIC: Height/weight percentile tracking
  ophthalmologyExam?: boolean; // OPHTHALMOLOGY: Refraction, visual acuity, IOP, fundoscopy
  cardiologyExam?: boolean; // CARDIOLOGY: ECG, Echo, Stress test documentation
  gynecologyExam?: boolean; // GYNECOLOGY: GTPAL, LMP/EDD calculator, antenatal record
  dermatologyExam?: boolean; // DERMATOLOGY: Lesion tracking, body map, Fitzpatrick scale
  mentalStatusExam?: boolean; // PSYCHIATRY: Mental state assessment
  psychiatryExam?: boolean; // PSYCHIATRY: Psychiatry mental status examination
  visionTest?: boolean; // OPHTHALMOLOGY: Visual acuity and eye tests
  ecgMonitoring?: boolean; // CARDIOLOGY: ECG and cardiac monitoring
  imagingReview?: boolean; // ORTHOPEDIC, ENT: X-ray/MRI review interface
  skinLesionTracking?: boolean; // DERMATOLOGY: Photo documentation of lesions
  prenatalCare?: boolean; // GYNECOLOGY: Pregnancy tracking and prenatal visits

  // Workflow customizations
  requiresSpecialtyNotes?: boolean; // Flag for specialty-specific documentation
  allowsMinorProcedures?: boolean; // For clinics that perform procedures
  multiVisitTracking?: boolean; // For conditions requiring follow-up series

  // Display preferences
  description?: string; // Human-readable description of clinic type
  recommendedDuration?: number; // Suggested appointment duration in minutes
}

export const CLINIC_TYPE_FEATURES: Record<ClinicType, ClinicTypeFeatures> = {
  GENERAL: {
    chiefComplaint: true,
    history: true,
    examination: true,
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true,
    prescriptions: true,
    procedures: true,
    followUp: true,
    requiresSpecialtyNotes: false,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Full-featured general practice with all consultation features enabled. Suitable for family medicine, internal medicine, and general practitioners.",
    recommendedDuration: 15,
  },
  DENTAL: {
    chiefComplaint: true,
    history: false, // Simplified workflow - dental doesn't need detailed medical history in every visit
    examination: false, // Dental uses specialized oral examination via dental chart
    vitals: true, // Basic vitals like BP for sedation/extraction cases
    diagnosis: true,
    treatment: true,
    investigations: true, // X-rays, OPG, CBCT
    prescriptions: true,
    procedures: true, // Fillings, extractions, RCT, etc.
    followUp: true,
    dentalChart: true, // Interactive tooth chart for documentation
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // For RCT, orthodontics, etc.
    description:
      "Streamlined dental workflow with tooth charting. Optimized for oral health, dental procedures, and treatment planning.",
    recommendedDuration: 30,
  },
  PEDIATRIC: {
    chiefComplaint: true,
    history: true,
    examination: true,
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true,
    prescriptions: true,
    procedures: true, // Immunizations, minor procedures
    followUp: true,
    growthChart: true, // Height, weight, BMI percentiles tracking
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // Well-child visits, vaccination schedules
    description:
      "Pediatric care with growth tracking and developmental milestones. Includes immunization management and age-appropriate dosing.",
    recommendedDuration: 20,
  },
  ORTHOPEDIC: {
    chiefComplaint: true,
    history: true,
    examination: true, // Musculoskeletal examination
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true, // X-rays, MRI, CT scans
    prescriptions: true,
    procedures: true, // Joint injections, casting, minor procedures
    followUp: true,
    imagingReview: true, // Built-in imaging review interface
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // Post-op follow-ups, physiotherapy tracking
    description:
      "Orthopedic care with imaging review capabilities. Optimized for musculoskeletal conditions, fractures, and joint disorders.",
    recommendedDuration: 20,
  },
  CARDIOLOGY: {
    chiefComplaint: true,
    history: true, // Detailed cardiac history crucial
    examination: true, // Cardiovascular examination
    vitals: true, // BP, HR, O2 saturation critical
    diagnosis: true,
    treatment: true,
    investigations: true, // ECG, Echo, Stress tests, Angiography
    prescriptions: true,
    procedures: true, // Pacemaker checks, cardioversion, etc.
    followUp: true,
    ecgMonitoring: true, // ECG documentation and trending
    cardiologyExam: true, // Dedicated cardiology examination forms
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // Chronic heart disease management
    description:
      "Cardiology practice with ECG monitoring and cardiac vital tracking. Designed for heart disease management and cardiac procedures.",
    recommendedDuration: 30,
  },
  DERMATOLOGY: {
    chiefComplaint: true,
    history: true,
    examination: true, // Skin examination
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true, // Biopsy, patch testing
    prescriptions: true,
    procedures: true, // Biopsies, excisions, cryotherapy
    followUp: true,
    dermatologyExam: true, // Lesion tracking, body map, Fitzpatrick scale
    skinLesionTracking: true, // Photo documentation with before/after
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // Acne treatment, psoriasis management
    description:
      "Dermatology clinic with photo documentation for skin lesions. Optimized for skin conditions and cosmetic procedures.",
    recommendedDuration: 15,
  },
  ENT: {
    chiefComplaint: true,
    history: true,
    examination: true, // ENT-specific examination
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true, // Audiometry, endoscopy, imaging
    prescriptions: true,
    procedures: true, // Foreign body removal, cauterization, etc.
    followUp: true,
    imagingReview: true, // CT/MRI for sinuses, neck
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // Chronic sinusitis, hearing loss management
    description:
      "ENT specialist practice with imaging review. Designed for ear, nose, throat conditions and related procedures.",
    recommendedDuration: 20,
  },
  GYNECOLOGY: {
    chiefComplaint: true,
    history: true, // Menstrual, obstetric, sexual history
    examination: true, // Gynecological examination
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true, // Ultrasound, Pap smear, hormone tests
    prescriptions: true,
    procedures: true, // IUD insertion, colposcopy, etc.
    followUp: true,
    gynecologyExam: true, // GTPAL, LMP/EDD calculator, antenatal record
    prenatalCare: true, // Pregnancy tracking and prenatal visits
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // Prenatal care, fertility treatment
    description:
      "Gynecology and obstetrics practice with prenatal care tracking. Optimized for women's health and pregnancy management.",
    recommendedDuration: 20,
  },
  OPHTHALMOLOGY: {
    chiefComplaint: true,
    history: true, // Ocular and systemic history
    examination: true, // Eye examination
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true, // OCT, fundus photography, visual fields
    prescriptions: true,
    procedures: true, // Laser procedures, injections
    followUp: true,
    visionTest: true, // Visual acuity, refraction, color vision tests
    ophthalmologyExam: true, // Dedicated ophthalmology examination form
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true, // Glaucoma, cataract follow-ups
    description:
      "Eye care center with vision testing and ocular imaging. Designed for comprehensive eye examinations and treatments.",
    recommendedDuration: 25,
  },
  PSYCHIATRY: {
    chiefComplaint: true,
    history: true, // Psychiatric and social history crucial
    examination: true, // Mental status examination
    vitals: true, // Some medications require monitoring
    diagnosis: true,
    treatment: true, // Therapy notes, treatment plans
    investigations: true, // Psychological assessments, lab work for medications
    prescriptions: true, // Psychiatric medications
    procedures: false, // No physical procedures in psychiatry
    followUp: true,
    mentalStatusExam: true, // Structured mental status assessment
    psychiatryExam: true, // Specialized mental status exam with risk assessment
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: false,
    multiVisitTracking: true, // Therapy sessions, medication management
    description:
      "Mental health clinic with mental status examination tools. Optimized for psychiatric consultations and therapy tracking.",
    recommendedDuration: 45,
  },
  SPECIALTY: {
    chiefComplaint: true,
    history: true,
    examination: true,
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true,
    prescriptions: true,
    procedures: true,
    followUp: true,
    requiresSpecialtyNotes: false,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Flexible specialty clinic configuration with all features enabled. Suitable for any medical specialty not covered by specific types.",
    recommendedDuration: 20,
  },
};

// Doctor Education Schema
export const doctorEducationSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string(),
  degree: z.string().min(1, "Degree is required"),
  fieldOfStudy: z.string().optional(),
  institution: z.string().min(1, "Institution is required"),
  location: z.string().optional(),
  startYear: z.number().optional(),
  endYear: z.number().optional(),
  isOngoing: z.boolean().default(false),
  grade: z.string().optional(),
  thesis: z.string().optional(),
  order: z.number().default(0),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type DoctorEducation = z.infer<typeof doctorEducationSchema>;

// Doctor Certification Schema
export const doctorCertificationSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string(),
  name: z.string().min(1, "Certification name is required"),
  issuingBody: z.string().min(1, "Issuing body is required"),
  issueDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()).optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type DoctorCertification = z.infer<typeof doctorCertificationSchema>;

// Doctor Additional Specialization Schema
export const doctorSpecializationSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string(),
  specialization: specializationSchema,
  isPrimary: z.boolean().default(false),
  certificationId: z.string().optional(),
  yearsOfPractice: z.number().optional(),
  createdAt: z.string().or(z.date()).optional(),
});
export type DoctorSpecializationEntry = z.infer<
  typeof doctorSpecializationSchema
>;

// ============================================================================
// Doctor Availability Schemas
// ============================================================================

export const dayOfWeekSchema = z.enum([
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  SUNDAY: "Sunday",
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
};

// Day index for sorting (0 = Sunday, 6 = Saturday)
export const DAY_OF_WEEK_INDEX: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const doctorScheduleSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string(),
  clinicId: z.string(),
  dayOfWeek: dayOfWeekSchema,
  startTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM",
    ),
  endTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM",
    ),
  slotDuration: z.number().min(5).max(120).default(30),
  isActive: z.boolean().default(true),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  doctor: z.object({ id: z.string(), name: z.string() }).optional(),
});
export type DoctorSchedule = z.infer<typeof doctorScheduleSchema>;

export const createDoctorScheduleSchema = doctorScheduleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  doctor: true,
});
export type CreateDoctorScheduleInput = z.infer<
  typeof createDoctorScheduleSchema
>;

export const updateDoctorScheduleSchema = createDoctorScheduleSchema.partial();
export type UpdateDoctorScheduleInput = z.infer<
  typeof updateDoctorScheduleSchema
>;

export const doctorTimeOffSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string(),
  clinicId: z.string().optional().nullable(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  reason: z.string().optional(),
  isFullDay: z.boolean().default(true),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  doctor: z.object({ id: z.string(), name: z.string() }).optional(),
});
export type DoctorTimeOff = z.infer<typeof doctorTimeOffSchema>;

export const createDoctorTimeOffSchema = doctorTimeOffSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  doctor: true,
});
export type CreateDoctorTimeOffInput = z.infer<
  typeof createDoctorTimeOffSchema
>;

// Available time slot for scheduling
export const availableSlotSchema = z.object({
  time: z.string(), // Start time of the slot in HH:MM format
  endTime: z.string(), // End time of the slot in HH:MM format
  doctorId: z.string(),
  doctorName: z.string(),
  isAvailable: z.boolean().default(true),
});
export type AvailableSlot = z.infer<typeof availableSlotSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  clinicId: z.string().optional(),

  // Doctor Profile Fields
  specialization: specializationSchema.optional(),
  hospitalRole: hospitalRoleSchema.optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().or(z.date()).optional(),
  signatureUrl: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(),
  phoneNumber: z.string().optional(),

  // Relations (optional, populated on demand)
  educationHistory: z.array(doctorEducationSchema).optional(),
  certifications: z.array(doctorCertificationSchema).optional(),
  additionalSpecializations: z.array(doctorSpecializationSchema).optional(),
  schedules: z.array(doctorScheduleSchema).optional(),

  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type User = z.infer<typeof userSchema>;

// ============================================================================
// genderSchema consolidated at top

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  INTERSEX: "Intersex",
  NON_BINARY: "Non-Binary",
  PREFER_NOT_TO_SAY: "Prefer Not to Say",
};

// ============================================================================
// Hospital-Grade Medical Enums
// ============================================================================

// Code Status - Critical patient safety information (DNR/Full Code)
export const codeStatusSchema = z.enum([
  "FULL_CODE",
  "DNR",
  "DNI",
  "DNR_DNI",
  "COMFORT_CARE",
]);
export type CodeStatus = z.infer<typeof codeStatusSchema>;

export const CODE_STATUS_LABELS: Record<CodeStatus, string> = {
  FULL_CODE: "Full Code",
  DNR: "DNR (Do Not Resuscitate)",
  DNI: "DNI (Do Not Intubate)",
  DNR_DNI: "DNR/DNI",
  COMFORT_CARE: "Comfort Care Only",
};

// Blood Pressure Position - Clinical context for BP readings
export const bpPositionSchema = z.enum([
  "SITTING",
  "STANDING",
  "LYING",
  "UNKNOWN",
]);
export type BpPosition = z.infer<typeof bpPositionSchema>;

export const BP_POSITION_LABELS: Record<BpPosition, string> = {
  SITTING: "Sitting",
  STANDING: "Standing",
  LYING: "Lying/Supine",
  UNKNOWN: "Unknown",
};

// Oxygen Delivery Method
export const oxygenDeliverySchema = z.enum([
  "ROOM_AIR",
  "NASAL_CANNULA",
  "SIMPLE_MASK",
  "NON_REBREATHER",
  "VENTURI_MASK",
  "HIGH_FLOW",
  "CPAP",
  "BIPAP",
  "VENTILATOR",
  "OTHER",
]);
export type OxygenDelivery = z.infer<typeof oxygenDeliverySchema>;

export const OXYGEN_DELIVERY_LABELS: Record<OxygenDelivery, string> = {
  ROOM_AIR: "Room Air",
  NASAL_CANNULA: "Nasal Cannula",
  SIMPLE_MASK: "Simple Mask",
  NON_REBREATHER: "Non-Rebreather Mask",
  VENTURI_MASK: "Venturi Mask",
  HIGH_FLOW: "High-Flow Nasal Cannula",
  CPAP: "CPAP",
  BIPAP: "BiPAP",
  VENTILATOR: "Mechanical Ventilator",
  OTHER: "Other",
};

// Dosage Form - Pharmaceutical dosage forms
export const dosageFormSchema = z.enum([
  "TABLET",
  "CAPSULE",
  "SOLUTION",
  "SUSPENSION",
  "INJECTION",
  "CREAM",
  "OINTMENT",
  "GEL",
  "PATCH",
  "INHALER",
  "NEBULIZER",
  "SUPPOSITORY",
  "DROPS",
  "SPRAY",
  "POWDER",
  "LOZENGE",
  "FILM",
  "OTHER",
]);
export type DosageForm = z.infer<typeof dosageFormSchema>;

export const DOSAGE_FORM_LABELS: Record<DosageForm, string> = {
  TABLET: "Tablet",
  CAPSULE: "Capsule",
  SOLUTION: "Solution",
  SUSPENSION: "Suspension",
  INJECTION: "Injection",
  CREAM: "Cream",
  OINTMENT: "Ointment",
  GEL: "Gel",
  PATCH: "Patch",
  INHALER: "Inhaler",
  NEBULIZER: "Nebulizer Solution",
  SUPPOSITORY: "Suppository",
  DROPS: "Drops",
  SPRAY: "Spray",
  POWDER: "Powder",
  LOZENGE: "Lozenge",
  FILM: "Film",
  OTHER: "Other",
};

// Standardized Frequency Codes (SIG codes)
export const sigCodeSchema = z.enum([
  "QD",
  "BID",
  "TID",
  "QID",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "QHS",
  "QAM",
  "QPM",
  "QOD",
  "QWK",
  "PRN",
  "STAT",
  "AC",
  "PC",
  "OTHER",
]);
export type SigCode = z.infer<typeof sigCodeSchema>;

export const SIG_CODE_LABELS: Record<SigCode, string> = {
  QD: "Once Daily",
  BID: "Twice Daily",
  TID: "Three Times Daily",
  QID: "Four Times Daily",
  Q4H: "Every 4 Hours",
  Q6H: "Every 6 Hours",
  Q8H: "Every 8 Hours",
  Q12H: "Every 12 Hours",
  QHS: "At Bedtime",
  QAM: "Every Morning",
  QPM: "Every Evening",
  QOD: "Every Other Day",
  QWK: "Once Weekly",
  PRN: "As Needed",
  STAT: "Immediately",
  AC: "Before Meals",
  PC: "After Meals",
  OTHER: "Other",
};

// Consent Types
export const consentTypeSchema = z.enum([
  "TREATMENT",
  "PROCEDURE",
  "SURGERY",
  "ANESTHESIA",
  "HIPAA_RELEASE",
  "RESEARCH",
  "PHOTO_VIDEO",
  "TELEHEALTH",
  "MINOR_GUARDIAN",
  "BLOOD_TRANSFUSION",
  "VACCINATION",
]);
export type ConsentType = z.infer<typeof consentTypeSchema>;

export const CONSENT_TYPE_LABELS: Record<ConsentType, string> = {
  TREATMENT: "General Treatment",
  PROCEDURE: "Procedure Consent",
  SURGERY: "Surgical Consent",
  ANESTHESIA: "Anesthesia Consent",
  HIPAA_RELEASE: "HIPAA Information Release",
  RESEARCH: "Research Participation",
  PHOTO_VIDEO: "Photo/Video Consent",
  TELEHEALTH: "Telemedicine Consent",
  MINOR_GUARDIAN: "Guardian Consent for Minor",
  BLOOD_TRANSFUSION: "Blood Transfusion Consent",
  VACCINATION: "Vaccination Consent",
};

// Consent Status
export const consentStatusSchema = z.enum([
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
  "PENDING",
]);
export type ConsentStatus = z.infer<typeof consentStatusSchema>;

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  ACTIVE: "Active",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
  PENDING: "Pending Signature",
};

// Immunization Route
export const immunizationRouteSchema = z.enum([
  "IM",
  "SC",
  "ID",
  "PO",
  "IN",
  "OTHER",
]);
export type ImmunizationRoute = z.infer<typeof immunizationRouteSchema>;

export const IMMUNIZATION_ROUTE_LABELS: Record<ImmunizationRoute, string> = {
  IM: "Intramuscular",
  SC: "Subcutaneous",
  ID: "Intradermal",
  PO: "Oral",
  IN: "Intranasal",
  OTHER: "Other",
};

// Immunization Site
export const immunizationSiteSchema = z.enum([
  "LEFT_ARM",
  "RIGHT_ARM",
  "LEFT_THIGH",
  "RIGHT_THIGH",
  "LEFT_DELTOID",
  "RIGHT_DELTOID",
  "OTHER",
]);
export type ImmunizationSite = z.infer<typeof immunizationSiteSchema>;

export const IMMUNIZATION_SITE_LABELS: Record<ImmunizationSite, string> = {
  LEFT_ARM: "Left Arm",
  RIGHT_ARM: "Right Arm",
  LEFT_THIGH: "Left Thigh",
  RIGHT_THIGH: "Right Thigh",
  LEFT_DELTOID: "Left Deltoid",
  RIGHT_DELTOID: "Right Deltoid",
  OTHER: "Other",
};

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
  customData: z.record(z.any()).optional(),
});
export type Patient = z.infer<typeof patientSchema>;

export const createPatientSchema = patientSchema.extend({
  dateOfBirth: z.string().refine(
    (val: string) => {
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

// ============================================================================
// Vital Signs Schemas
// ============================================================================

export const vitalSignSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  height: z.number().optional(), // in cm
  weight: z.number().optional(), // in kg
  bmi: z.number().optional(), // calculated BMI

  // Structured Blood Pressure (hospital-grade)
  systolicBP: z
    .number()
    .min(60, "Systolic BP must be at least 60 mmHg")
    .max(300, "Systolic BP cannot exceed 300 mmHg")
    .optional(),
  diastolicBP: z
    .number()
    .min(30, "Diastolic BP must be at least 30 mmHg")
    .max(200, "Diastolic BP cannot exceed 200 mmHg")
    .optional(),
  bpPosition: bpPositionSchema.optional(), // Position during measurement
  bloodPressure: z.string().optional(), // Legacy field: "120/80" format

  pulse: z.number().optional(), // bpm
  respiratoryRate: z.number().optional(), // breaths per minute
  temperature: z.number().optional(), // in Celsius

  // SpO2 with delivery method
  spo2: z.number().optional(), // percentage
  oxygenDelivery: oxygenDeliverySchema.optional(), // How O2 is delivered
  oxygenFlowRate: z.number().optional(), // L/min if on supplemental O2

  painScore: z.number().min(0).max(10).optional(), // 0-10 scale
  bloodGlucose: z.number().optional(), // mg/dL
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type VitalSign = z.infer<typeof vitalSignSchema>;

// Vital Signs validation refinement for BP consistency
export const vitalSignSchemaRefined = vitalSignSchema.refine(
  (data) => {
    if (data.systolicBP && data.diastolicBP) {
      return data.systolicBP > data.diastolicBP;
    }
    return true;
  },
  {
    message: "Systolic BP must be greater than diastolic BP",
    path: ["systolicBP"],
  },
);

// ============================================================================
// Clinical Examination Schemas (SOAP Format)
// ============================================================================

// General Physical Examination findings
export const generalExaminationSchema = z.object({
  // Consciousness
  gcs: z.number().min(3).max(15).optional(), // Glasgow Coma Scale
  consciousness: z.enum(["CONSCIOUS", "DROWSY", "STUPOR", "COMA"]).optional(),
  orientation: z.enum(["ORIENTED", "DISORIENTED", "CONFUSED"]).optional(),

  // General Signs
  pallor: z.boolean().optional(),
  icterus: z.boolean().optional(), // Jaundice
  cyanosis: z.boolean().optional(),
  clubbing: z.boolean().optional(),
  lymphadenopathy: z.boolean().optional(),
  edema: z.boolean().optional(),

  // Notes for each
  pallorNotes: z.string().optional(),
  icterusNotes: z.string().optional(),
  cyanosisNotes: z.string().optional(),
  clubbingNotes: z.string().optional(),
  lymphadenopathyNotes: z.string().optional(),
  edemaLocation: z.string().optional(), // e.g., "bilateral pedal edema"

  // Nutritional Status
  nutritionStatus: z
    .enum(["WELL_NOURISHED", "MALNOURISHED", "OBESE", "UNDERWEIGHT"])
    .optional(),
  hydrationStatus: z
    .enum(["WELL_HYDRATED", "DEHYDRATED", "OVERHYDRATED"])
    .optional(),

  // Additional notes
  generalNotes: z.string().optional(),
});
export type GeneralExamination = z.infer<typeof generalExaminationSchema>;

// Systemic Examination findings
export const systemicExaminationSchema = z.object({
  // Cardiovascular System (CVS)
  cvs: z
    .object({
      heartRate: z.number().optional(),
      rhythm: z
        .enum(["REGULAR", "IRREGULAR", "IRREGULARLY_IRREGULAR"])
        .optional(),
      heartSounds: z.string().optional(), // e.g., "S1 S2 heard, no murmurs"
      jvp: z.string().optional(), // Jugular Venous Pressure
      peripheralPulses: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Respiratory System (RS)
  rs: z
    .object({
      respiratoryRate: z.number().optional(),
      breathSounds: z.string().optional(), // e.g., "Bilateral vesicular breath sounds"
      additionalSounds: z.string().optional(), // Crackles, wheezes, rhonchi
      chestMovement: z.enum(["NORMAL", "REDUCED", "ASYMMETRIC"]).optional(),
      percussion: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Per Abdomen (P/A)
  pa: z
    .object({
      shape: z.enum(["FLAT", "DISTENDED", "SCAPHOID", "NORMAL"]).optional(),
      tenderness: z.boolean().optional(),
      tendernessLocation: z.string().optional(),
      organomegaly: z.string().optional(), // Hepatomegaly, splenomegaly
      bowelSounds: z
        .enum(["NORMAL", "HYPERACTIVE", "HYPOACTIVE", "ABSENT"])
        .optional(),
      ascites: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Central Nervous System (CNS)
  cns: z
    .object({
      consciousness: z
        .enum(["CONSCIOUS", "DROWSY", "STUPOR", "COMA"])
        .optional(),
      cranialNerves: z.string().optional(),
      motorFunction: z.string().optional(),
      sensoryFunction: z.string().optional(),
      reflexes: z.string().optional(),
      coordination: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Musculoskeletal System (MSS)
  mss: z
    .object({
      gait: z
        .enum(["NORMAL", "ANTALGIC", "ATAXIC", "SPASTIC", "OTHER"])
        .optional(),
      jointExamination: z.string().optional(),
      muscleStrength: z.string().optional(),
      deformities: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Skin / Integumentary
  skin: z
    .object({
      color: z.string().optional(),
      texture: z.string().optional(),
      lesions: z.string().optional(),
      rashes: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),

  // Local Examination (for specific complaints)
  localExamination: z.string().optional(),

  // Additional systemic examination notes
  additionalNotes: z.string().optional(),
});
export type SystemicExamination = z.infer<typeof systemicExaminationSchema>;

// Clinical Investigations ordered
export const clinicalInvestigationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  category: z.enum(["LABORATORY", "IMAGING", "SPECIAL", "OTHER"]).optional(),
  status: z.enum(["ORDERED", "PENDING", "COMPLETED", "CANCELLED"]).optional(),
  result: z.string().optional(),
  normalRange: z.string().optional(),
  notes: z.string().optional(),
  orderedAt: z.string().or(z.date()).optional(),
  completedAt: z.string().or(z.date()).optional(),
});
export type ClinicalInvestigation = z.infer<typeof clinicalInvestigationSchema>;

// Full Clinical Note in SOAP format
export const clinicalNoteSchema = z.object({
  // Subjective
  chiefComplaint: z.string().optional(),
  treatmentHistory: z.string().optional(), // Previous treatments attempted for the current condition
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  socialHistory: z.string().optional(),
  reviewOfSystems: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),

  // Objective
  vitalSigns: vitalSignSchema.optional(),
  generalExamination: generalExaminationSchema.optional(),
  systemicExamination: systemicExaminationSchema.optional(),

  // Specialty-specific data
  dentalChart: z.any().optional(), // DentalChartData - using any for now to avoid circular deps
  growthData: z.any().optional(), // GrowthChartData - pediatric growth tracking
  ophthalmologyExam: z.any().optional(), // OphthalmologyExamData - ophthalmology examination
  cardiologyExam: z.any().optional(), // CardiologyExamData - cardiology examination
  gynecologyExam: z.any().optional(), // GynecologyExamData - gynecology/obstetrics examination
  dermatologyExam: z.any().optional(), // DermatologyExamData - dermatology examination
  psychiatryExam: z.any().optional(), // PsychiatryExamData - psychiatry mental status examination

  // Assessment
  provisionalDiagnosis: z.string().optional(),
  differentialDiagnosis: z.string().optional(),
  clinicalImpression: z.string().optional(),

  // Plan
  investigations: z.array(clinicalInvestigationSchema).optional(),
  finalDiagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  prescriptions: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
        route: z.string().default("PO"),
      }),
    )
    .optional(),
  followUpPlan: z.string().optional(),
  patientEducation: z.string().optional(),
});
export type ClinicalNote = z.infer<typeof clinicalNoteSchema>;

// ============================================================================
// Dental Chart Schema
// ============================================================================

export const toothConditionSchema = z.enum([
  "HEALTHY",
  "CARIES",
  "FILLED",
  "MISSING",
  "CROWN",
  "ROOT_CANAL",
  "IMPLANT",
  "BRIDGE",
  "EXTRACTED",
  "IMPACTED",
]);
export type ToothCondition = z.infer<typeof toothConditionSchema>;

export const toothSurfaceSchema = z.enum(["M", "O", "D", "L", "B", "ALL"]);
export type ToothSurface = z.infer<typeof toothSurfaceSchema>;

export const toothEntrySchema = z.object({
  toothNumber: z.number(),
  condition: toothConditionSchema,
  surface: toothSurfaceSchema.optional(),
  notes: z.string().optional(),
  proposedTreatment: z.string().optional(),
});
export type ToothEntry = z.infer<typeof toothEntrySchema>;

export const dentalChartSchema = z.object({
  dentitionType: z.enum(["ADULT", "PRIMARY", "MIXED"]),
  numberingSystem: z.enum(["FDI", "UNIVERSAL"]),
  teeth: z.array(toothEntrySchema),
  generalNotes: z.string().optional(),
});
export type DentalChartData = z.infer<typeof dentalChartSchema>;

// ============================================================================
// Growth Chart Schemas (for Pediatric)
// ============================================================================

export const growthMeasurementSchema = z.object({
  id: z.string().optional(),
  date: z.string(), // ISO date string
  ageMonths: z.number(), // Age in months at measurement
  weight: z.number().optional(), // kg
  height: z.number().optional(), // cm
  headCircumference: z.number().optional(), // cm (for 0-36 months)
  bmi: z.number().optional(), // Calculated
  notes: z.string().optional(),
});
export type GrowthMeasurement = z.infer<typeof growthMeasurementSchema>;

export const growthChartDataSchema = z.object({
  patientGender: z.enum(["MALE", "FEMALE"]),
  measurements: z.array(growthMeasurementSchema),
  generalNotes: z.string().optional(),
});
export type GrowthChartData = z.infer<typeof growthChartDataSchema>;

// ============================================================================
// Ophthalmology Exam Schemas
// ============================================================================

export const refractionEyeDataSchema = z.object({
  sphere: z.number().optional(), // Diopters
  cylinder: z.number().optional(), // Diopters
  axis: z.number().min(0).max(180).optional(), // Degrees
  add: z.number().optional(), // Addition for near vision
  prism: z.string().optional(), // Prism correction
});
export type RefractionEyeData = z.infer<typeof refractionEyeDataSchema>;

export const refractionDataSchema = z.object({
  od: refractionEyeDataSchema.optional(), // Oculus Dexter (Right Eye)
  os: refractionEyeDataSchema.optional(), // Oculus Sinister (Left Eye)
  pupillaryDistance: z.number().optional(), // PD in mm
  notes: z.string().optional(),
});
export type RefractionData = z.infer<typeof refractionDataSchema>;

export const visualAcuityEyeDataSchema = z.object({
  uncorrected: z.string().optional(), // e.g., "20/40"
  corrected: z.string().optional(), // e.g., "20/20"
  pinhole: z.string().optional(),
});
export type VisualAcuityEyeData = z.infer<typeof visualAcuityEyeDataSchema>;

export const visualAcuityBothEyesDataSchema = z.object({
  uncorrected: z.string().optional(),
  corrected: z.string().optional(),
});

export const visualAcuityDataSchema = z.object({
  od: visualAcuityEyeDataSchema.optional(), // Right Eye
  os: visualAcuityEyeDataSchema.optional(), // Left Eye
  ou: visualAcuityBothEyesDataSchema.optional(), // Both Eyes
  notes: z.string().optional(),
});
export type VisualAcuityData = z.infer<typeof visualAcuityDataSchema>;

export const iopDataSchema = z.object({
  od: z.number().optional(), // mmHg
  os: z.number().optional(), // mmHg
  method: z.enum(["NCT", "Applanation", "iCare", "Other"]).optional(),
  time: z.string().optional(),
  notes: z.string().optional(),
});
export type IOPData = z.infer<typeof iopDataSchema>;

export const ophthalmologyExamDataSchema = z.object({
  visualAcuity: visualAcuityDataSchema.optional(),
  refraction: refractionDataSchema.optional(),
  iop: iopDataSchema.optional(),
  anteriorSegment: z
    .object({
      od: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  posteriorSegment: z
    .object({
      od: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  diagnosis: z.string().optional(),
  plan: z.string().optional(),
  generalNotes: z.string().optional(),
});
export type OphthalmologyExamData = z.infer<typeof ophthalmologyExamDataSchema>;

// ============================================================================
// Cardiology Exam Schemas
// ============================================================================

export const ecgDataSchema = z.object({
  heartRate: z.number().optional(), // bpm
  rhythm: z
    .enum([
      "Sinus",
      "Atrial Fibrillation",
      "Atrial Flutter",
      "SVT",
      "Ventricular Tachycardia",
      "Other",
    ])
    .optional(),
  prInterval: z.number().optional(), // ms
  qrsDuration: z.number().optional(), // ms
  qtInterval: z.number().optional(), // ms
  qtcInterval: z.number().optional(), // ms (corrected QT)
  axis: z
    .enum([
      "Normal",
      "Left Axis Deviation",
      "Right Axis Deviation",
      "Extreme Axis Deviation",
    ])
    .optional(),
  interpretation: z.string().optional(),
  findings: z.string().optional(),
  imageUrl: z.string().optional(),
  performedAt: z.string().optional(),
});
export type ECGData = z.infer<typeof ecgDataSchema>;

export const echoDataSchema = z.object({
  lvef: z.number().optional(), // %
  lviddDiastole: z.number().optional(), // mm
  lvisdSystole: z.number().optional(), // mm
  septumThickness: z.number().optional(), // mm
  posteriorWallThickness: z.number().optional(), // mm
  lvMass: z.number().optional(), // grams
  mitralValve: z.string().optional(),
  aorticValve: z.string().optional(),
  tricuspidValve: z.string().optional(),
  pulmonicValve: z.string().optional(),
  leftAtriumSize: z.number().optional(), // mm
  aorticRoot: z.number().optional(), // mm
  rightVentricle: z.string().optional(),
  pericardium: z.string().optional(),
  dopplerFindings: z.string().optional(),
  interpretation: z.string().optional(),
  imageUrl: z.string().optional(),
  performedAt: z.string().optional(),
});
export type EchoData = z.infer<typeof echoDataSchema>;

export const stressTestDataSchema = z.object({
  testType: z
    .enum(["Treadmill", "Pharmacological", "Stress Echo", "Nuclear"])
    .optional(),
  protocol: z.string().optional(),
  maxHeartRate: z.number().optional(), // bpm
  targetHeartRate: z.number().optional(), // bpm
  duration: z.number().optional(), // minutes
  mets: z.number().optional(),
  stSegmentChanges: z.boolean().optional(),
  symptoms: z.string().optional(),
  bloodPressureResponse: z.string().optional(),
  conclusion: z.string().optional(),
  performedAt: z.string().optional(),
});
export type StressTestData = z.infer<typeof stressTestDataSchema>;

export const cardiologyExamDataSchema = z.object({
  ecg: ecgDataSchema.optional(),
  echo: echoDataSchema.optional(),
  stressTest: stressTestDataSchema.optional(),
  clinicalAssessment: z.string().optional(),
  riskFactors: z.string().optional(),
  medications: z.string().optional(),
  plan: z.string().optional(),
  generalNotes: z.string().optional(),
});
export type CardiologyExamData = z.infer<typeof cardiologyExamDataSchema>;

// ============================================================================
// Gynecology/Obstetrics Examination Schemas
// ============================================================================

// Menstrual History
export const menstrualHistoryDataSchema = z.object({
  lmp: z.string().optional(), // Last Menstrual Period (ISO date)
  cycleLength: z.number().optional(), // Days
  cycleDuration: z.number().optional(), // Days of bleeding
  regularity: z.enum(["regular", "irregular"]).optional(),
  flow: z.enum(["scanty", "normal", "heavy"]).optional(),
  dysmenorrhea: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  notes: z.string().optional(),
});
export type MenstrualHistoryData = z.infer<typeof menstrualHistoryDataSchema>;

// Obstetric History (GTPAL)
export const obstetricHistoryDataSchema = z.object({
  gravida: z.number().optional(), // Total pregnancies
  term: z.number().optional(), // Full-term deliveries (≥37 weeks)
  preterm: z.number().optional(), // Preterm deliveries (<37 weeks)
  abortions: z.number().optional(), // Spontaneous + induced abortions
  living: z.number().optional(), // Living children
  edd: z.string().optional(), // Expected Date of Delivery (ISO date)
  gestationalAge: z.string().optional(), // e.g., "28w 3d"
  previousPregnancyNotes: z.string().optional(),
});
export type ObstetricHistoryData = z.infer<typeof obstetricHistoryDataSchema>;

// Antenatal Record
export const antenatalRecordDataSchema = z.object({
  fundalHeight: z.number().optional(), // cm
  fetalHeartRate: z.number().optional(), // bpm
  presentation: z
    .enum(["cephalic", "breech", "transverse", "oblique"])
    .optional(),
  engagement: z
    .enum(["not-engaged", "1/5", "2/5", "3/5", "4/5", "5/5"])
    .optional(),
  liquorVolume: z
    .enum(["normal", "oligohydramnios", "polyhydramnios"])
    .optional(),
  placentalLocation: z.string().optional(),
  movements: z.enum(["normal", "reduced", "excessive"]).optional(),
  cervicalDilation: z.number().optional(), // cm
  cervicalEffacement: z.number().optional(), // %
  notes: z.string().optional(),
});
export type AntenatalRecordData = z.infer<typeof antenatalRecordDataSchema>;

// Complete Gynecology Examination Data
export const gynecologyExamDataSchema = z.object({
  menstrualHistory: menstrualHistoryDataSchema.optional(),
  obstetricHistory: obstetricHistoryDataSchema.optional(),
  antenatalRecord: antenatalRecordDataSchema.optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});
export type GynecologyExamData = z.infer<typeof gynecologyExamDataSchema>;

// ============================================================================
// Dermatology Examination Schemas
// ============================================================================

// Skin Assessment
export const skinAssessmentDataSchema = z.object({
  fitzpatrickType: z.enum(["I", "II", "III", "IV", "V", "VI"]).optional(),
  skinType: z
    .enum(["normal", "dry", "oily", "combination", "sensitive"])
    .optional(),
  generalCondition: z.string().optional(),
  notes: z.string().optional(),
});
export type SkinAssessmentData = z.infer<typeof skinAssessmentDataSchema>;

// Lesion Data
export const lesionDataSchema = z.object({
  id: z.string(),
  location: z.string(),
  bodyRegion: z.string().optional(),
  size: z.number().optional(), // mm
  shape: z.enum(["round", "oval", "irregular", "linear", "annular"]).optional(),
  color: z.string().optional(),
  border: z
    .enum(["well-defined", "ill-defined", "irregular", "raised"])
    .optional(),
  surface: z
    .enum(["smooth", "rough", "scaly", "crusted", "ulcerated", "vesicular"])
    .optional(),
  elevation: z.enum(["flat", "raised", "depressed"]).optional(),
  consistency: z.enum(["soft", "firm", "hard", "fluctuant"]).optional(),
  tenderness: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  description: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  followUp: z.string().optional(),
});
export type LesionData = z.infer<typeof lesionDataSchema>;

// Complete Dermatology Examination Data
export const dermatologyExamDataSchema = z.object({
  skinAssessment: skinAssessmentDataSchema.optional(),
  lesions: z.array(lesionDataSchema).optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});
export type DermatologyExamData = z.infer<typeof dermatologyExamDataSchema>;

// ============================================================================
// Psychiatry Examination Schemas
// ============================================================================

// Mental Status Examination Schema
export const mseDataSchema = z.object({
  // Appearance & Behavior
  appearance: z.string().optional(),
  behavior: z.string().optional(),
  eyeContact: z.string().optional(),
  psychomotorActivity: z.string().optional(),

  // Speech
  speech: z.string().optional(),
  speechRate: z.enum(["normal", "slow", "rapid", "pressured"]).optional(),
  speechVolume: z.enum(["normal", "soft", "loud"]).optional(),

  // Mood & Affect
  mood: z.string().optional(),
  affect: z.string().optional(),
  affectType: z
    .enum(["full", "restricted", "blunted", "flat", "labile"])
    .optional(),
  affectCongruence: z.enum(["congruent", "incongruent"]).optional(),

  // Thought
  thoughtProcess: z.string().optional(),
  thoughtProcessType: z
    .enum([
      "linear",
      "circumstantial",
      "tangential",
      "loose",
      "flight-of-ideas",
      "perseveration",
    ])
    .optional(),
  thoughtContent: z.string().optional(),
  delusions: z.boolean().optional(),
  delusionType: z.string().optional(),
  obsessions: z.boolean().optional(),
  compulsions: z.boolean().optional(),
  suicidalIdeation: z.boolean().optional(),
  homicidalIdeation: z.boolean().optional(),

  // Perception
  hallucinations: z.boolean().optional(),
  hallucinationType: z.string().optional(),
  hallucinationDescription: z.string().optional(),
  illusions: z.boolean().optional(),
  depersonalization: z.boolean().optional(),
  derealization: z.boolean().optional(),

  // Cognition
  consciousness: z
    .enum(["alert", "drowsy", "obtunded", "stuporous", "comatose"])
    .optional(),
  orientation: z.string().optional(),
  orientedTo: z.array(z.string()).optional(),
  attention: z.string().optional(),
  concentration: z.string().optional(),
  memory: z.string().optional(),
  memoryImmediate: z.string().optional(),
  memoryRecent: z.string().optional(),
  memoryRemote: z.string().optional(),

  // Insight & Judgment
  insight: z.enum(["good", "fair", "poor", "absent"]).optional(),
  insightDescription: z.string().optional(),
  judgment: z.enum(["good", "fair", "poor", "impaired"]).optional(),
  judgmentDescription: z.string().optional(),

  // Additional Notes
  notes: z.string().optional(),
});

// Risk Assessment Schema
export const riskAssessmentDataSchema = z.object({
  // Suicide Risk
  suicideRisk: z.enum(["low", "moderate", "high", "imminent"]).optional(),
  suicidalThoughts: z.boolean().optional(),
  suicidalPlan: z.boolean().optional(),
  suicidalIntent: z.boolean().optional(),
  suicidalMeans: z.boolean().optional(),
  previousAttempts: z.boolean().optional(),
  previousAttemptsDetails: z.string().optional(),
  protectiveFactors: z.string().optional(),

  // Homicide Risk
  homicideRisk: z.enum(["low", "moderate", "high", "imminent"]).optional(),
  homicidalThoughts: z.boolean().optional(),
  homicidalPlan: z.boolean().optional(),
  homicidalIntent: z.boolean().optional(),
  homicidalMeans: z.boolean().optional(),
  identifiedTarget: z.boolean().optional(),
  targetDetails: z.string().optional(),

  // Risk Management
  riskManagement: z.string().optional(),
  safetyPlan: z.string().optional(),
});

// Screening Scales Schema
export const screeningScalesDataSchema = z.object({
  // PHQ-9 (Depression)
  phq9Score: z.number().min(0).max(27).optional(),
  phq9Severity: z
    .enum(["minimal", "mild", "moderate", "moderately-severe", "severe"])
    .optional(),

  // GAD-7 (Anxiety)
  gad7Score: z.number().min(0).max(21).optional(),
  gad7Severity: z.enum(["minimal", "mild", "moderate", "severe"]).optional(),

  // YMRS (Mania)
  ymrsScore: z.number().min(0).max(60).optional(),

  // Other scales
  otherScales: z.string().optional(),
});

// Psychiatry Exam Data Schema (Combines all sub-schemas)
export const psychiatryExamDataSchema = z.object({
  mse: mseDataSchema.optional(),
  riskAssessment: riskAssessmentDataSchema.optional(),
  screeningScales: screeningScalesDataSchema.optional(),
  clinicalAssessment: z.string().optional(),
  plan: z.string().optional(),
});

export type MSEData = z.infer<typeof mseDataSchema>;
export type RiskAssessmentData = z.infer<typeof riskAssessmentDataSchema>;
export type ScreeningScalesData = z.infer<typeof screeningScalesDataSchema>;
export type PsychiatryExamData = z.infer<typeof psychiatryExamDataSchema>;

// ============================================================================
// Medication & Prescription Schemas
// ============================================================================

// Route of Administration Options (sorted by most common usage)
export const ROUTE_OPTIONS = [
  { value: "PO", label: "PO - Oral", description: "By mouth" },
  { value: "IV", label: "IV - Intravenous", description: "Into vein" },
  { value: "IM", label: "IM - Intramuscular", description: "Into muscle" },
  { value: "SC", label: "SC - Subcutaneous", description: "Under skin" },
  { value: "TOP", label: "TOP - Topical", description: "On skin" },
  { value: "INH", label: "INH - Inhalation", description: "Breathed in" },
  { value: "SL", label: "SL - Sublingual", description: "Under tongue" },
  { value: "NAS", label: "NAS - Nasal", description: "Into nose" },
  { value: "OPH", label: "OPH - Ophthalmic", description: "Into eye" },
  { value: "OT", label: "OT - Otic", description: "Into ear" },
  { value: "PR", label: "PR - Rectal", description: "Into rectum" },
  { value: "TD", label: "TD - Transdermal", description: "Skin patch" },
  { value: "BUC", label: "BUC - Buccal", description: "In cheek" },
  { value: "PV", label: "PV - Vaginal", description: "Into vagina" },
  { value: "NEB", label: "NEB - Nebulized", description: "Via nebulizer" },
] as const;

export type RouteOfAdministration = (typeof ROUTE_OPTIONS)[number]["value"];

// Route labels for display
export const ROUTE_LABELS: Record<RouteOfAdministration, string> = {
  PO: "Oral",
  IV: "Intravenous",
  IM: "Intramuscular",
  SC: "Subcutaneous",
  TOP: "Topical",
  INH: "Inhalation",
  SL: "Sublingual",
  NAS: "Nasal",
  OPH: "Ophthalmic",
  OT: "Otic",
  PR: "Rectal",
  TD: "Transdermal",
  BUC: "Buccal",
  PV: "Vaginal",
  NEB: "Nebulized",
};

export const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  route: z.string().default("PO"),

  // Hospital-Grade Drug Identification
  ndcCode: z.string().optional(), // National Drug Code
  rxNormCui: z.string().optional(), // RxNorm Concept Unique Identifier
  dosageForm: dosageFormSchema.optional(),
  strengthValue: z.number().optional(),
  strengthUnit: z.string().optional(), // e.g., "mg", "mL"

  // Prescription details
  quantity: z.number().optional(),
  refillsAllowed: z.number().min(0).max(11).optional(), // 0-11 refills
  dispenseAsWritten: z.boolean().optional(), // DAW flag
  sigCode: sigCodeSchema.optional(), // Standard sig code

  // Date tracking
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),

  // PRN (as needed) medications
  isPRN: z.boolean().optional(),
  prnInstructions: z.string().optional(), // e.g., "Take for pain"
});
export type Medication = z.infer<typeof medicationSchema>;

export const prescriptionSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  patientId: z.string(),
  doctorId: z.string().optional(),
  medications: z.array(medicationSchema),
  notes: z.string().optional(),
  instructions: z.string().optional(),
  diagnosis: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  patient: patientSchema.optional(),
  doctor: z.object({ name: z.string() }).optional(),
  // Doctor context snapshot for audit trail (Phase 5)
  doctorName: z.string().optional(),
  doctorEmail: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorRole: z.string().optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
});
export type Prescription = z.infer<typeof prescriptionSchema>;

export const createPrescriptionSchema = prescriptionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  patient: true,
  doctor: true,
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const prescriptionTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  user: userSchema.optional(),
  medications: z.array(medicationSchema),
  instructions: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type PrescriptionTemplate = z.infer<typeof prescriptionTemplateSchema>;

// ============================================================================
// Invoice Schemas
// ============================================================================

// invoiceStatusSchema consolidated at top

// PaymentMethod and PaymentMode are imported from payments.ts via export *

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0),
});
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type LineItem = InvoiceItem;

export const invoiceSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  patientId: z.string(),
  clinicId: z.string().optional(),
  items: z.array(invoiceItemSchema),
  notes: z.string().optional(),
  total: z.number(),
  totalAmount: z.number().optional(),
  status: invoiceStatusSchema,
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  patient: patientSchema.optional(),
  appointment: z.object({ doctor: z.object({ name: z.string() }) }).optional(),
  // Doctor context snapshot for audit trail (Phase 5)
  doctorName: z.string().optional(),
  doctorEmail: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorSpecialization: z.string().optional(),
  doctorRole: z.string().optional(),
  doctorRegistrationNumber: z.string().optional(),
  doctorLicenseNumber: z.string().optional(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceSchema = invoiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  patient: true,
  appointment: true,
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ============================================================================
// Appointment Schemas
// ============================================================================

// appointment schemas consolidated at top

export const appointmentPrioritySchema = z.enum([
  "ROUTINE",
  "URGENT",
  "EMERGENCY",
]);
export type AppointmentPriority = z.infer<typeof appointmentPrioritySchema>;

export const APPOINTMENT_PRIORITY_LABELS: Record<AppointmentPriority, string> =
{
  ROUTINE: "Routine",
  URGENT: "Urgent",
  EMERGENCY: "Emergency",
};

export const APPOINTMENT_PRIORITY_COLORS: Record<AppointmentPriority, string> =
{
  ROUTINE: "bg-blue-100 text-blue-800 border-blue-300",
  URGENT: "bg-orange-100 text-orange-800 border-orange-300",
  EMERGENCY: "bg-red-100 text-red-800 border-red-300",
};

export const appointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  clinicId: z.string().min(1, "Clinic is required"),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: appointmentStatusSchema,
  type: appointmentTypeSchema,
  priority: appointmentPrioritySchema.default("ROUTINE").optional(),

  // Consultation Notes - Doctor's notes saved per consultation
  consultationNotes: z.string().optional(), // Clinical notes and observations from this consultation

  // Legacy fields (kept for backward compatibility)
  notes: z.string().optional(),
  observations: z.string().optional(),

  // Clinical Documentation - SOAP Format
  // Subjective
  chiefComplaint: z.string().optional(), // Primary reason for visit
  historyOfPresentIllness: z.string().optional(), // Detailed history of current illness (HPI)
  pastMedicalHistory: z.string().optional(), // Past medical, surgical, family history
  reviewOfSystems: z.string().optional(), // Systematic review of body systems

  // Objective
  generalExamination: generalExaminationSchema.optional(), // General physical examination
  systemicExamination: systemicExaminationSchema.optional(), // System-wise examination

  // Assessment
  provisionalDiagnosis: z.string().optional(), // Initial diagnosis before investigations
  differentialDiagnosis: z.string().optional(), // Other possible diagnoses
  clinicalImpression: z.string().optional(), // Doctor's overall clinical impression

  // Plan
  investigations: z.array(clinicalInvestigationSchema).optional(), // Ordered investigations
  finalDiagnosis: z.string().optional(), // Confirmed diagnosis after investigations
  treatmentPlan: z.string().optional(), // Treatment approach
  followUpPlan: z.string().optional(), // Follow-up instructions

  // Timestamps
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),

  // Relations
  patient: patientSchema.optional(),
  doctor: z.object({ name: z.string() }).optional(),
  vitalSign: vitalSignSchema.optional(),
  prescription: prescriptionSchema.optional(),
  invoice: invoiceSchema.optional(),
  diagnoses: z
    .array(
      z.object({
        id: z.string(),
        icdCodeId: z.string(),
        icdCode: z.any().optional(),
        notes: z.string().optional(),
        isPrimary: z.boolean(),
        createdAt: z.string().or(z.date()),
      }),
    )
    .optional(),
  procedures: z
    .array(
      z.object({
        id: z.string(),
        cptCodeId: z.string(),
        cptCode: z.any().optional(),
        notes: z.string().optional(),
        createdAt: z.string().or(z.date()),
        updatedAt: z.string().or(z.date()),
      }),
    )
    .optional(),
});
export type Appointment = z.infer<typeof appointmentSchema>;

export const createAppointmentSchema = appointmentSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    patient: true,
    doctor: true,
    vitalSign: true,
    prescription: true,
    invoice: true,
    diagnoses: true,
    procedures: true,
    // Omit clinical documentation fields for initial creation
    chiefComplaint: true,
    historyOfPresentIllness: true,
    pastMedicalHistory: true,
    reviewOfSystems: true,
    generalExamination: true,
    systemicExamination: true,
    provisionalDiagnosis: true,
    differentialDiagnosis: true,
    clinicalImpression: true,
    investigations: true,
    finalDiagnosis: true,
    treatmentPlan: true,
    followUpPlan: true,
  })
  .extend({
    startTime: z.string(),
    endTime: z.string(),
  });
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = appointmentSchema.partial();
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

// Schema for updating clinical documentation during consultation
export const updateClinicalNoteSchema = z.object({
  // Subjective
  chiefComplaint: z.string().optional(),
  historyOfPresentIllness: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  reviewOfSystems: z.string().optional(),

  // Objective
  generalExamination: generalExaminationSchema.optional(),
  systemicExamination: systemicExaminationSchema.optional(),

  // Assessment
  provisionalDiagnosis: z.string().optional(),
  differentialDiagnosis: z.string().optional(),
  clinicalImpression: z.string().optional(),

  // Plan
  investigations: z.array(clinicalInvestigationSchema).optional(),
  finalDiagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpPlan: z.string().optional(),

  // Legacy support
  notes: z.string().optional(),
  observations: z.string().optional(),
});
export type UpdateClinicalNoteInput = z.infer<typeof updateClinicalNoteSchema>;

// ============================================================================
// Document Schemas
// ============================================================================

export const documentSchema = z.object({
  id: z.string(),
  patientId: z.string().optional(),
  name: z.string(),
  fileName: z.string().optional(),
  type: z.string(),
  url: z.string(),
  uploadedAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  patient: z
    .object({
      name: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    })
    .optional(),
});
export type Document = z.infer<typeof documentSchema>;

// ============================================================================
// Clinic Schemas
// ============================================================================

export const clinicTierSchema = z.enum([
  "CAPTURE",
  "CORE",
  "PLUS",
  "PRO",
  "ENTERPRISE",
]);
export type ClinicTier = z.infer<typeof clinicTierSchema>;

export const clinicSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  phone: z.string().optional(), // Legacy field name in database
  email: z.string().email().optional(),
  website: z.string().optional(),
  tier: clinicTierSchema,
  type: clinicTypeSchema.default("GENERAL"),
  logo: z.string().optional(),
  settings: z
    .object({
      description: z.string().optional(),
      openingTime: z.string().optional(),
      closingTime: z.string().optional(),
      workingDays: z.array(z.string()).optional(),
      consultationDuration: z.number().optional(),
      reminderBefore: z.string().optional(),
      reminderUnit: z.string().optional(),
    })
    .optional()
    .nullable(),
  // Flattened settings fields for frontend convenience
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().optional(),
  reminderBefore: z.string().optional(),
  reminderUnit: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Clinic = z.infer<typeof clinicSchema>;

// ============================================================================
// Doctor Schemas
// ============================================================================

export const doctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),

  // Specialization & Role
  specialization: specializationSchema.optional(),
  hospitalRole: hospitalRoleSchema.optional(),

  // Qualifications & Credentials
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().or(z.date()).optional(),

  // Profile
  signatureUrl: z.string().optional(),
  profilePhotoUrl: z.string().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(),

  // Relations
  clinicId: z.string().optional(),
  educationHistory: z.array(doctorEducationSchema).optional(),
  certifications: z.array(doctorCertificationSchema).optional(),
  additionalSpecializations: z.array(doctorSpecializationSchema).optional(),

  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type Doctor = z.infer<typeof doctorSchema>;

// Create/Update Doctor Profile Input
export const createDoctorProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  specialization: specializationSchema.optional(),
  hospitalRole: hospitalRoleSchema.optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(),
});
export type CreateDoctorProfileInput = z.infer<
  typeof createDoctorProfileSchema
>;

export const updateDoctorProfileSchema = createDoctorProfileSchema.partial();
export type UpdateDoctorProfileInput = z.infer<
  typeof updateDoctorProfileSchema
>;

// Create Education Input
export const createEducationSchema = doctorEducationSchema.omit({
  id: true,
  doctorId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateEducationInput = z.infer<typeof createEducationSchema>;

// Create Certification Input
export const createCertificationSchema = doctorCertificationSchema.omit({
  id: true,
  doctorId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateCertificationInput = z.infer<
  typeof createCertificationSchema
>;

// ============================================================================
// Analytics Schemas
// ============================================================================

export const analyticsOverviewSchema = z.object({
  totalPatients: z.number(),
  newPatientsThisMonth: z.number(),
  patientGrowth: z.number(),
  totalAppointments: z.number(),
  appointmentsThisMonth: z.number(),
  totalRevenue: z.number(),
  revenueThisMonth: z.number(),
  revenueGrowth: z.number(),
});
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

export const diseaseTrendSchema = z.object({
  disease: z.string(),
  count: z.number(),
  percentage: z.number(),
});
export type DiseaseTrend = z.infer<typeof diseaseTrendSchema>;

export const revenueByCPTSchema = z.object({
  cptCode: z.string(),
  description: z.string(),
  count: z.number(),
  revenue: z.number(),
});
export type RevenueByCPT = z.infer<typeof revenueByCPTSchema>;

export const complianceMetricSchema = z.object({
  metric: z.string(),
  value: z.number(),
  status: z.string(),
});
export type ComplianceMetric = z.infer<typeof complianceMetricSchema>;

// ============================================================================
// Medical Coding Schemas
// ============================================================================

export const icdCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  description: z.string(),
  category: z.string().optional(),
  version: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type IcdCode = z.infer<typeof icdCodeSchema>;

export const cptCodeSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  description: z.string(),
  category: z.string().optional(),
  price: z.number().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type CptCode = z.infer<typeof cptCodeSchema>;

export const icdFavoriteSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  userId: z.string().optional(),
  icdCodeId: z.string().optional(),
  icdCode: icdCodeSchema.optional(),
  createdAt: z.string().or(z.date()).optional(),
});
export type IcdFavorite = z.infer<typeof icdFavoriteSchema>;

export const cptFavoriteSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  userId: z.string().optional(),
  cptCodeId: z.string().optional(),
  cptCode: cptCodeSchema.optional(),
  createdAt: z.string().or(z.date()).optional(),
});
export type CptFavorite = z.infer<typeof cptFavoriteSchema>;

export const diagnosisSchema = z.object({
  id: z.string(),
  icdCodeId: z.string(),
  icdCode: icdCodeSchema,
  notes: z.string().optional(),
  isPrimary: z.boolean(),
  createdAt: z.string().or(z.date()),
});
export type Diagnosis = z.infer<typeof diagnosisSchema>;

export const procedureSchema = z.object({
  id: z.string(),
  cptCodeId: z.string(),
  cptCode: cptCodeSchema,
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Procedure = z.infer<typeof procedureSchema>;

export const doctorFavoriteCodeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  icdCodeId: z.string().optional(),
  icdCode: icdCodeSchema.optional(),
  cptCodeId: z.string().optional(),
  cptCode: cptCodeSchema.optional(),
  createdAt: z.string().or(z.date()),
});
export type DoctorFavoriteCode = z.infer<typeof doctorFavoriteCodeSchema>;

// ============================================================================
// Template Schemas
// ============================================================================

// templateFieldTypeSchema consolidated at top

export const templateFieldSchema = z.object({
  label: z.string(),
  type: templateFieldTypeSchema,
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});
export type TemplateField = z.infer<typeof templateFieldSchema>;

export const clinicalTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  speciality: z.string(),
  fields: z.array(templateFieldSchema),
  defaultObservations: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type ClinicalTemplate = z.infer<typeof clinicalTemplateSchema>;

// ============================================================================
// API Response Schemas
// ============================================================================

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    data: z.array(dataSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// Dashboard Schemas
// ============================================================================

export const dashboardStatsSchema = z.object({
  totalPatients: z.number(),
  totalDoctors: z.number().optional(),
  newPatientsThisMonth: z.number().optional(),
  todayAppointments: z.number(),
  activePrescriptions: z.number(),
  pendingReports: z.number(),
  storageUsed: z.number().optional(),
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const recentActivitySchema = z.object({
  id: z.string(),
  type: z.enum(["appointment", "prescription", "invoice"]),
  description: z.string(),
  timestamp: z.string().or(z.date()),
});
export type RecentActivity = z.infer<typeof recentActivitySchema>;

// ============================================================================
// Form Data Types
// ============================================================================

export interface PatientFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
}

export interface AppointmentFormData {
  patientId: string;
  type: string;
  scheduledAt: string;
  notes?: string;
}

export interface PrescriptionFormData {
  medications: Medication[];
  instructions?: string;
}

export interface InvoiceFormData {
  items: InvoiceItem[];
  paymentMethod?: PaymentMethod;
}

// ============================================================================
// Custom Field Schemas
// ============================================================================

export const customFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "select", "date", "checkbox", "textarea"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  order: z.number().default(0),
  clinicId: z.string(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type CustomField = z.infer<typeof customFieldSchema>;

// ============================================================================
// Reminder Schemas
// ============================================================================

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  smsEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  reminderTime: z.number(), // hours before appointment
  message: z.string().optional(),
});
export type ReminderSettings = z.infer<typeof reminderSettingsSchema>;

// ============================================================================
// WhatsApp Automation Schemas
// ============================================================================

export const whatsappAutomationSchema = z.object({
  enabled: z.boolean(),
  appointmentReminders: z.boolean(),
  paymentReceipts: z.boolean(),
  followUpReminders: z.boolean(),
  birthdayWishes: z.boolean(),
  customMessages: z.boolean(),
  prescriptionSent: z.boolean(),
  invoiceSent: z.boolean(),
});
export type WhatsappAutomation = z.infer<typeof whatsappAutomationSchema>;

// ============================================================================
// IPD / Bed Management Schemas (Hospital Only)
// ============================================================================

export const wardSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Ward name is required"),
  type: z.string(),
  description: z.string().nullable().optional(),
  floorNumber: z.string().nullable().optional(),
  clinicId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Ward = z.infer<typeof wardSchema>;

export const roomSchema = z.object({
  id: z.string(),
  wardId: z.string(),
  roomNumber: z.string().min(1, "Room number is required"),
  type: z.string().nullable().optional(),
  charges: z.number().min(0, "Charges cannot be negative"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Room = z.infer<typeof roomSchema>;

export const bedStatusSchema = z.enum([
  "AVAILABLE",
  "OCCUPIED",
  "MAINTENANCE",
  "CLEANING",
  "RESERVED",
]);
export type BedStatus = z.infer<typeof bedStatusSchema>;

export const bedSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  bedNumber: z.string().min(1, "Bed number is required"),
  status: bedStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Bed = z.infer<typeof bedSchema>;

export const admissionStatusSchema = z.enum([
  "ADMITTED",
  "DISCHARGED",
  "TRANSFERRED",
]);
export type AdmissionStatus = z.infer<typeof admissionStatusSchema>;

export const admissionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  bedId: z.string(),
  admittedAt: z.date(),
  dischargedAt: z.date().nullable().optional(),
  status: admissionStatusSchema,
  reason: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  admittingDoctorId: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Admission = z.infer<typeof admissionSchema>;

// ============================================================================
// Lab Test Schemas
// ============================================================================

export const labTestSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  category: z.string().optional(),
  price: z.number(),
  description: z.string().optional(),
  tat: z.string().optional(), // Turn around time
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type LabTest = z.infer<typeof labTestSchema>;

export const labTestOrderSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  doctorId: z.string().optional(), // kept for compatibility
  orderedBy: z.string().optional(),
  labTestId: z.string(),
  appointmentId: z.string().optional(),
  status: z.enum(["pending", "in-progress", "completed", "cancelled"]),
  priority: z.enum(["normal", "urgent"]).default("normal"),
  notes: z.string().optional(),
  result: z.union([z.string(), z.record(z.unknown())]).optional(), // Supports both string and JSON
  resultUrl: z.string().optional(),
  collectedAt: z.string().or(z.date()).optional(),
  completedAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
  // Relations
  patient: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phoneNumber: z.string().optional(),
  }).optional(),
  doctor: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  labTest: labTestSchema.optional(),
});
export type LabTestOrder = z.infer<typeof labTestOrderSchema>;

// ============================================================================
// Inventory Schemas
// ============================================================================

export const inventoryItemSchema = z.object({
  id: z.string(),
  clinicId: z.string().optional(),
  name: z.string(),
  active: z.boolean().default(true),
  category: z.string(),
  sku: z.string().optional(),
  quantity: z.number(),
  minQuantity: z.number(),
  unit: z.string(),
  price: z.number().optional(), // Helper accessor
  purchasePrice: z.number().optional(),
  sellingPrice: z.number().optional(),
  supplier: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()).optional(),
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
