import { z } from "zod";

export const userRoleSchema = z.enum([
  "DOCTOR",
  "RECEPTIONIST",
  "ADMIN",
  "INTERNAL",
  "ADMIN_DOCTOR",
  "PATIENT",
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const genderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "INTERSEX",
  "NON_BINARY",
  "PREFER_NOT_TO_SAY",
]);
export type Gender = z.infer<typeof genderSchema>;

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  INTERSEX: "Intersex",
  NON_BINARY: "Non-Binary",
  PREFER_NOT_TO_SAY: "Prefer Not to Say",
};

export const bloodGroupSchema = z.enum([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]);
export type BloodGroup = z.infer<typeof bloodGroupSchema>;

export const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "checked-in",
  "in-progress",
  "completed",
  "cancelled",
  "no-show",
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const appointmentTypeSchema = z.enum([
  "consultation",
  "follow-up",
  "check-up",
  "emergency",
  "procedure",
  "other",
]);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

export const weekdaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);
export type Weekday = z.infer<typeof weekdaySchema>;

export const invoiceStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "PARTIALLY_PAID",
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const paymentStatusSchema = z.enum([
  "created",
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const customFieldTypeSchema = z.enum([
  "text",
  "number",
  "select",
  "date",
  "checkbox",
  "textarea",
]);
export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;

export const templateFieldTypeSchema = z.enum([
  "text",
  "number",
  "select",
  "checkbox",
  "textarea",
]);
export type TemplateFieldType = z.infer<typeof templateFieldTypeSchema>;

export const whatsappMessageTypeSchema = z.enum([
  "reminder",
  "receipt",
  "payment-link",
  "general",
]);
export type WhatsappMessageType = z.infer<typeof whatsappMessageTypeSchema>;

export const currencySchema = z.enum([
  "INR",
  "USD",
  "GBP",
  "EUR",
  "AUD",
  "CAD",
  "SGD",
  "AED",
  "ZAR",
]);
export type Currency = z.infer<typeof currencySchema>;

export const facilityTypeSchema = z.enum(["CLINIC", "HOSPITAL"]);
export type FacilityTypeType = z.infer<typeof facilityTypeSchema>;
export enum FacilityType {
  CLINIC = "CLINIC",
  HOSPITAL = "HOSPITAL",
}

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
  GENERAL: "General Clinic",
  DENTAL: "Dental Clinic",
  PEDIATRIC: "Pediatric Clinic",
  ORTHOPEDIC: "Orthopedic Clinic",
  CARDIOLOGY: "Cardiology Clinic",
  DERMATOLOGY: "Dermatology Clinic",
  ENT: "ENT Clinic",
  GYNECOLOGY: "Gynecology Clinic",
  OPHTHALMOLOGY: "Ophthalmology Clinic",
  PSYCHIATRY: "Psychiatry Clinic",
  SPECIALTY: "Others",
};

export const CLINIC_TYPE_OPTIONS = clinicTypeSchema.options.map((value) => ({
  value,
  label: CLINIC_TYPE_LABELS[value],
}));

export interface ClinicTypeFeatures {
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
  dentalChart?: boolean;
  growthChart?: boolean;
  ophthalmologyExam?: boolean;
  cardiologyExam?: boolean;
  gynecologyExam?: boolean;
  dermatologyExam?: boolean;
  mentalStatusExam?: boolean;
  psychiatryExam?: boolean;
  visionTest?: boolean;
  ecgMonitoring?: boolean;
  imagingReview?: boolean;
  skinLesionTracking?: boolean;
  prenatalCare?: boolean;
  requiresSpecialtyNotes?: boolean;
  allowsMinorProcedures?: boolean;
  multiVisitTracking?: boolean;
  description?: string;
  recommendedDuration?: number;
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
    history: false,
    examination: false,
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true,
    prescriptions: true,
    procedures: true,
    followUp: true,
    dentalChart: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
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
    procedures: true,
    followUp: true,
    growthChart: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Pediatric care with growth tracking and developmental milestones. Includes immunization management and age-appropriate dosing.",
    recommendedDuration: 20,
  },
  ORTHOPEDIC: {
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
    imagingReview: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Orthopedic care with imaging review capabilities. Optimized for musculoskeletal conditions, fractures, and joint disorders.",
    recommendedDuration: 20,
  },
  CARDIOLOGY: {
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
    ecgMonitoring: true,
    cardiologyExam: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Cardiology practice with ECG monitoring and cardiac vital tracking. Designed for heart disease management and cardiac procedures.",
    recommendedDuration: 30,
  },
  DERMATOLOGY: {
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
    dermatologyExam: true,
    skinLesionTracking: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Dermatology clinic with photo documentation for skin lesions. Optimized for skin conditions and cosmetic procedures.",
    recommendedDuration: 15,
  },
  ENT: {
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
    imagingReview: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "ENT specialist practice with imaging review. Designed for ear, nose, throat conditions and related procedures.",
    recommendedDuration: 20,
  },
  GYNECOLOGY: {
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
    gynecologyExam: true,
    prenatalCare: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Gynecology and obstetrics practice with prenatal care tracking. Optimized for women's health and pregnancy management.",
    recommendedDuration: 20,
  },
  OPHTHALMOLOGY: {
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
    visionTest: true,
    ophthalmologyExam: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: true,
    multiVisitTracking: true,
    description:
      "Eye care center with vision testing and ocular imaging. Designed for comprehensive eye examinations and treatments.",
    recommendedDuration: 25,
  },
  PSYCHIATRY: {
    chiefComplaint: true,
    history: true,
    examination: true,
    vitals: true,
    diagnosis: true,
    treatment: true,
    investigations: true,
    prescriptions: true,
    procedures: false,
    followUp: true,
    mentalStatusExam: true,
    psychiatryExam: true,
    requiresSpecialtyNotes: true,
    allowsMinorProcedures: false,
    multiVisitTracking: true,
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

export const doctorEducationSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string(),
  degree: z.string().min(1, "Enter the degree."),
  fieldOfStudy: z.string().optional(),
  institution: z.string().min(1, "Enter the institution name."),
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

export const doctorCertificationSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string(),
  name: z.string().min(1, "Enter the certification name."),
  issuingBody: z.string().min(1, "Enter the issuing organization."),
  issueDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()).optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type DoctorCertification = z.infer<typeof doctorCertificationSchema>;

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
      "Enter a valid time, like 09:00.",
    ),
  endTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Enter a valid time, like 09:00.",
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

export const availableSlotSchema = z.object({
  time: z.string(),
  endTime: z.string(),
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

  specialization: specializationSchema.optional(),
  hospitalRole: hospitalRoleSchema.optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().or(z.date()).optional(),
  signatureUrl: z.string().optional(),
  signatureStoredUrl: z.string().nullable().optional(),
  signatureUploadedAt: z.string().or(z.date()).optional(),
  verificationStatus: z
    .enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED", "FAILED"])
    .optional(),
  verificationSource: z.string().optional(),
  verificationRef: z.string().optional(),
  verificationReason: z.string().optional(),
  verificationData: z.unknown().optional(),
  verificationCheckedAt: z.string().or(z.date()).optional(),
  profilePhotoUrl: z.string().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(),
  phoneNumber: z.string().optional(),

  educationHistory: z.array(doctorEducationSchema).optional(),
  certifications: z.array(doctorCertificationSchema).optional(),
  additionalSpecializations: z.array(doctorSpecializationSchema).optional(),
  schedules: z.array(doctorScheduleSchema).optional(),

  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type User = z.infer<typeof userSchema>;
export type Doctor = User;
