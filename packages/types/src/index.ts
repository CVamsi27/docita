import { z } from "zod";
import { PaymentMethod, PaymentMode } from "./payments";

// ============================================================================
// Re-export all types from modules
// ============================================================================

// Tier System
export * from "./tier";

// App Configuration
export * from "./config";

// Import Types
export * from "./imports";

// Payment Types
export * from "./payments";

// ============================================================================
// User & Auth Schemas
// ============================================================================

export const userRoleSchema = z.enum(["DOCTOR", "RECEPTIONIST", "ADMIN", "SUPER_ADMIN", "ADMIN_DOCTOR"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  clinicId: z.string().optional(),
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
  dateOfBirth: z.string().refine((val: string) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, {
    message: "Date of birth must be in the past",
  }),
});
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = patientSchema.partial();
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

// ============================================================================
// Vital Signs Schemas
// ============================================================================

export const vitalSignSchema = z.object({
  height: z.number().optional(),
  weight: z.number().optional(),
  bloodPressure: z.string().optional(),
  pulse: z.number().optional(),
  temperature: z.number().optional(),
  spo2: z.number().optional(),
});
export type VitalSign = z.infer<typeof vitalSignSchema>;

// ============================================================================
// Medication & Prescription Schemas
// ============================================================================

export const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
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

export const invoiceStatusSchema = z.enum(["pending", "paid", "overdue", "cancelled"]);
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

export const appointmentStatusSchema = z.enum(["scheduled", "confirmed", "cancelled", "completed", "no-show", "in-progress"]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const appointmentTypeSchema = z.enum(["consultation", "follow-up", "check-up", "emergency", "procedure"]);
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
  notes: z.string().optional(),
  observations: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  patient: patientSchema.optional(),
  doctor: z.object({ name: z.string() }).optional(),
  vitalSign: vitalSignSchema.optional(),
  prescription: prescriptionSchema.optional(),
  invoice: invoiceSchema.optional(),
});
export type Appointment = z.infer<typeof appointmentSchema>;

export const createAppointmentSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  doctorId: true,
  patient: true,
  doctor: true,
  vitalSign: true,
  prescription: true,
  invoice: true,
}).extend({
  startTime: z.string(),
  endTime: z.string(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = appointmentSchema.partial();
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

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
  patient: z.object({ 
    name: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }).optional(),
});
export type Document = z.infer<typeof documentSchema>;

// ============================================================================
// Clinic Schemas
// ============================================================================

export const clinicTierSchema = z.enum(["FREE", "STARTER", "PROFESSIONAL", "ENTERPRISE", "CAPTURE", "CORE", "PLUS", "PRO"]);
export type ClinicTier = z.infer<typeof clinicTierSchema>;

export const clinicSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  tier: clinicTierSchema,
  logo: z.string().optional(),
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
  specialty: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  signature: z.string().optional(),
  clinicId: z.string().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type Doctor = z.infer<typeof doctorSchema>;

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

export const templateFieldTypeSchema = z.enum(["text", "textarea", "number", "select"]);
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

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
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
  type: z.enum(['text', 'number', 'select', 'date', 'checkbox', 'textarea']),
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
