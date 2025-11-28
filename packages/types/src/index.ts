import { z } from "zod";
import { PaymentMethod, PaymentMode } from "./payments.js";

// ============================================================================
// Re-export all types from modules
// ============================================================================

// Tier System
export * from "./tier.js";

// App Configuration
export * from "./config.js";

// Import Types
export * from "./imports.js";

// Payment Types
export * from "./payments.js";

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
// Patient Schemas
// ============================================================================

export const genderSchema = z.enum(["MALE", "FEMALE", "OTHER"]);
export type Gender = z.infer<typeof genderSchema>;

export const patientTagSchema = z.object({
  id: z.string(),
  tag: z.string(),
  color: z.string(),
});
export type PatientTag = z.infer<typeof patientTagSchema>;

export const patientSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().or(z.date()),
  gender: genderSchema,
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  medicalHistory: z.array(z.string()).optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  tags: z.array(patientTagSchema).optional(),
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

export const updatePatientSchema = patientSchema.partial();
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
  bloodPressure: z.string().optional(), // e.g. "120/80"
  pulse: z.number().optional(), // bpm
  respiratoryRate: z.number().optional(), // breaths per minute
  temperature: z.number().optional(), // in Celsius
  spo2: z.number().optional(), // percentage
  painScore: z.number().min(0).max(10).optional(), // 0-10 scale
  bloodGlucose: z.number().optional(), // mg/dL
  notes: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type VitalSign = z.infer<typeof vitalSignSchema>;

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

export const invoiceStatusSchema = z.enum([
  "pending",
  "paid",
  "overdue",
  "cancelled",
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

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

export const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "checked-in",
  "cancelled",
  "completed",
  "no-show",
  "in-progress",
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const appointmentTypeSchema = z.enum([
  "consultation",
  "follow-up",
  "check-up",
  "emergency",
  "procedure",
]);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

export const appointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  doctorId: z.string(),
  clinicId: z.string(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: appointmentStatusSchema,
  type: appointmentTypeSchema,

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
    doctorId: true,
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
  logo: z.string().optional(),
  settings: z
    .object({
      description: z.string().optional(),
      openingTime: z.string().optional(),
      closingTime: z.string().optional(),
      workingDays: z.array(z.string()).optional(),
      consultationDuration: z.number().optional(),
    })
    .optional()
    .nullable(),
  // Flattened settings fields for frontend convenience
  description: z.string().optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  consultationDuration: z.number().optional(),
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

export const templateFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "select",
]);
export type TemplateFieldType = z.infer<typeof templateFieldTypeSchema>;

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
});
export type WhatsappAutomation = z.infer<typeof whatsappAutomationSchema>;
