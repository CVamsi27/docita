/**
 * Shared API Request/Response Validation Schemas
 * Used across all API endpoints for consistent validation
 */

import { z } from 'zod';

// Common validators
export const IdSchema = z.string().uuid('Invalid ID format');
export const EmailSchema = z.string().email('Invalid email address');
export const PhoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-()]{10,}$/, 'Invalid phone number');
export const URLSchema = z.string().url('Invalid URL');
export const DateTimeSchema = z.coerce.date();
export const PositiveIntSchema = z.number().int().positive();
export const NonNegativeIntSchema = z.number().int().nonnegative();

// Common pagination
export const PaginationSchema = z.object({
  page: NonNegativeIntSchema.default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// Common responses
export const ErrorResponseSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  errors: z.record(z.array(z.string())).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Patient API
export const CreatePatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: EmailSchema.optional(),
  phoneNumber: PhoneSchema.optional(),
  dateOfBirth: DateTimeSchema.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export type CreatePatient = z.infer<typeof CreatePatientSchema>;

export const UpdatePatientSchema = CreatePatientSchema.partial();
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;

// Appointment API
export const CreateAppointmentSchema = z.object({
  patientId: IdSchema,
  doctorId: IdSchema,
  appointmentDateTime: DateTimeSchema,
  reason: z.string().min(1).max(500),
  status: z
    .enum([
      'SCHEDULED',
      'CONFIRMED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ])
    .default('SCHEDULED'),
  notes: z.string().optional(),
  type: z.enum(['IN_PERSON', 'TELEHEALTH']).default('IN_PERSON'),
  duration: PositiveIntSchema.default(30),
});

export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial();
export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;

// Prescription API
export const PrescriptionItemSchema = z.object({
  medicineId: IdSchema,
  medicineName: z.string(),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string(),
  instructions: z.string().optional(),
  quantity: PositiveIntSchema.optional(),
});

export const CreatePrescriptionSchema = z.object({
  appointmentId: IdSchema,
  patientId: IdSchema,
  doctorId: IdSchema,
  items: z.array(PrescriptionItemSchema).min(1),
  notes: z.string().optional(),
  followUpDate: DateTimeSchema.optional(),
});

export type CreatePrescription = z.infer<typeof CreatePrescriptionSchema>;

// Invoice API
export const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: PositiveIntSchema,
  unitPrice: NonNegativeIntSchema,
  amount: NonNegativeIntSchema,
});

export const CreateInvoiceSchema = z.object({
  patientId: IdSchema,
  appointmentId: IdSchema.optional(),
  items: z.array(InvoiceItemSchema).min(1),
  taxRate: z.number().min(0).max(100).optional(),
  discount: NonNegativeIntSchema.optional(),
  notes: z.string().optional(),
  dueDate: DateTimeSchema.optional(),
});

export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>;

// Clinic API
export const CreateClinicSchema = z.object({
  name: z.string().min(1).max(200),
  email: EmailSchema,
  phone: PhoneSchema,
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string(),
  country: z.string(),
  clinicType: z.enum(['GENERAL', 'DENTAL', 'CARDIOLOGY', 'PEDIATRIC']),
  licenseNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
});

export type CreateClinic = z.infer<typeof CreateClinicSchema>;

export const UpdateClinicSchema = CreateClinicSchema.partial();
export type UpdateClinic = z.infer<typeof UpdateClinicSchema>;

// Lab Test API
export const CreateLabTestSchema = z.object({
  patientId: IdSchema,
  appointmentId: IdSchema.optional(),
  testName: z.string().min(1),
  category: z.string().min(1),
  instructions: z.string().optional(),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
});

export type CreateLabTest = z.infer<typeof CreateLabTestSchema>;

// User/Auth API
export const SignUpSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  clinicId: IdSchema,
});

export type SignUp = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: EmailSchema,
  password: z.string(),
});

export type SignIn = z.infer<typeof SignInSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
});

export type ChangePassword = z.infer<typeof ChangePasswordSchema>;

// Query schemas
export const ListPatientsQuerySchema = PaginationSchema.extend({
  search: z.string().optional(),
  clinicId: IdSchema.optional(),
});

export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>;

export const ListAppointmentsQuerySchema = PaginationSchema.extend({
  doctorId: IdSchema.optional(),
  patientId: IdSchema.optional(),
  status: z.string().optional(),
  startDate: DateTimeSchema.optional(),
  endDate: DateTimeSchema.optional(),
  clinicId: IdSchema.optional(),
});

export type ListAppointmentsQuery = z.infer<
  typeof ListAppointmentsQuerySchema
>;

// Export all schemas as a namespace
export const API_SCHEMAS = {
  common: {
    Id: IdSchema,
    Email: EmailSchema,
    Phone: PhoneSchema,
    URL: URLSchema,
    DateTime: DateTimeSchema,
    PositiveInt: PositiveIntSchema,
    NonNegativeInt: NonNegativeIntSchema,
    Pagination: PaginationSchema,
    ErrorResponse: ErrorResponseSchema,
  },
  patient: {
    Create: CreatePatientSchema,
    Update: UpdatePatientSchema,
  },
  appointment: {
    Create: CreateAppointmentSchema,
    Update: UpdateAppointmentSchema,
  },
  prescription: {
    Create: CreatePrescriptionSchema,
  },
  invoice: {
    Create: CreateInvoiceSchema,
  },
  clinic: {
    Create: CreateClinicSchema,
    Update: UpdateClinicSchema,
  },
  labTest: {
    Create: CreateLabTestSchema,
  },
  auth: {
    SignUp: SignUpSchema,
    SignIn: SignInSchema,
    ChangePassword: ChangePasswordSchema,
  },
  query: {
    ListPatients: ListPatientsQuerySchema,
    ListAppointments: ListAppointmentsQuerySchema,
  },
};
