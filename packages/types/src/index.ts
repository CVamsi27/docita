import { z } from "zod";

export const patientSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().or(z.date()), // Handle both string input and date object
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  medicalHistory: z.array(z.string()).optional(),
  bloodGroup: z.string().optional(),
  allergies: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  tags: z.array(z.object({
    id: z.string(),
    tag: z.string(),
    color: z.string()
  })).optional(),
});

export type Patient = z.infer<typeof patientSchema>;

export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  createdAt: z.string().or(z.date()),
});

export type Document = z.infer<typeof documentSchema>;

export const vitalSignSchema = z.object({
  height: z.number().optional(),
  weight: z.number().optional(),
  bloodPressure: z.string().optional(),
  pulse: z.number().optional(),
  temperature: z.number().optional(),
  spo2: z.number().optional(),
});

export type VitalSign = z.infer<typeof vitalSignSchema>;

export const appointmentSchema = z.object({
  id: z.string().optional(),
  patientId: z.string(),
  doctorId: z.string(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  status: z.enum(["scheduled", "confirmed", "cancelled", "completed", "no-show"]),
  type: z.enum(["consultation", "follow-up", "check-up"]),
  notes: z.string().optional(),
  observations: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  doctor: z.object({ name: z.string() }).optional(),
  vitalSign: vitalSignSchema.optional(),
  prescription: z.lazy(() => prescriptionSchema).optional(),
  invoice: z.lazy(() => invoiceSchema).optional(),
});

export type Appointment = z.infer<typeof appointmentSchema>;

export const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
});

export type Medication = z.infer<typeof medicationSchema>;

export const prescriptionSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string(),
  patientId: z.string(),
  doctorId: z.string(),
  medications: z.array(medicationSchema),
  instructions: z.string().optional(),
  date: z.string().or(z.date()),
});

export type Prescription = z.infer<typeof prescriptionSchema>;

export const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

export type LineItem = z.infer<typeof lineItemSchema>;

export const invoiceSchema = z.object({
  id: z.string().optional(),
  appointmentId: z.string().optional(),
  patientId: z.string(),
  total: z.number(),
  status: z.enum(["pending", "paid", "overdue"]),
  items: z.array(lineItemSchema),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const createPatientSchema = patientSchema.extend({
  dateOfBirth: z.string().refine((val: string) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date < new Date();
  }, {
    message: "Date of birth must be in the past",
  }),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const createAppointmentSchema = appointmentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  doctorId: true
}).extend({
  startTime: z.string(),
  endTime: z.string(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
