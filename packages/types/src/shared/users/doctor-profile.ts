import { z } from "zod";
import { dayOfWeekSchema, hospitalRoleSchema, specializationSchema, userRoleSchema } from "./roles";

export const doctorEducationSchema = z.object({
  id: z.string().optional(), doctorId: z.string(), degree: z.string().min(1, "Enter the degree."),
  fieldOfStudy: z.string().optional(), institution: z.string().min(1, "Enter the institution name."),
  location: z.string().optional(), startYear: z.number().optional(), endYear: z.number().optional(),
  isOngoing: z.boolean().default(false), grade: z.string().optional(), thesis: z.string().optional(),
  order: z.number().default(0), createdAt: z.string().or(z.date()).optional(), updatedAt: z.string().or(z.date()).optional(),
});
export type DoctorEducation = z.infer<typeof doctorEducationSchema>;

export const doctorCertificationSchema = z.object({
  id: z.string().optional(), doctorId: z.string(), name: z.string().min(1, "Enter the certification name."),
  issuingBody: z.string().min(1, "Enter the issuing organization."), issueDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()).optional(), credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(), createdAt: z.string().or(z.date()).optional(), updatedAt: z.string().or(z.date()).optional(),
});
export type DoctorCertification = z.infer<typeof doctorCertificationSchema>;

export const doctorSpecializationSchema = z.object({
  id: z.string().optional(), doctorId: z.string(), specialization: specializationSchema,
  isPrimary: z.boolean().default(false), certificationId: z.string().optional(),
  yearsOfPractice: z.number().optional(), createdAt: z.string().or(z.date()).optional(),
});
export type DoctorSpecializationEntry = z.infer<typeof doctorSpecializationSchema>;

export const doctorScheduleSchema = z.object({
  id: z.string().optional(), doctorId: z.string(), clinicId: z.string(), dayOfWeek: dayOfWeekSchema,
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Enter a valid time, like 09:00."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Enter a valid time, like 09:00."),
  slotDuration: z.number().min(5).max(120).default(30), isActive: z.boolean().default(true),
  createdAt: z.string().or(z.date()).optional(), updatedAt: z.string().or(z.date()).optional(),
  doctor: z.object({ id: z.string(), name: z.string() }).optional(),
});
export type DoctorSchedule = z.infer<typeof doctorScheduleSchema>;

export const createDoctorScheduleSchema = doctorScheduleSchema.omit({ id: true, createdAt: true, updatedAt: true, doctor: true });
export type CreateDoctorScheduleInput = z.infer<typeof createDoctorScheduleSchema>;

export const updateDoctorScheduleSchema = createDoctorScheduleSchema.partial();
export type UpdateDoctorScheduleInput = z.infer<typeof updateDoctorScheduleSchema>;

export const doctorTimeOffSchema = z.object({
  id: z.string().optional(), doctorId: z.string(), clinicId: z.string().optional().nullable(),
  startDate: z.string().or(z.date()), endDate: z.string().or(z.date()), reason: z.string().optional(),
  isFullDay: z.boolean().default(true), startTime: z.string().optional().nullable(), endTime: z.string().optional().nullable(),
  createdAt: z.string().or(z.date()).optional(), updatedAt: z.string().or(z.date()).optional(),
  version: z.number().int().nonnegative().default(1), doctor: z.object({ id: z.string(), name: z.string() }).optional(),
});
export type DoctorTimeOff = z.infer<typeof doctorTimeOffSchema>;

export const createDoctorTimeOffSchema = doctorTimeOffSchema.omit({ id: true, createdAt: true, updatedAt: true, version: true, doctor: true });
export type CreateDoctorTimeOffInput = z.infer<typeof createDoctorTimeOffSchema>;

export const availableSlotSchema = z.object({
  time: z.string(), endTime: z.string(), doctorId: z.string(), doctorName: z.string(), isAvailable: z.boolean().default(true),
});
export type AvailableSlot = z.infer<typeof availableSlotSchema>;

export const userSchema = z.object({
  id: z.string(), email: z.string().email(), name: z.string(), role: userRoleSchema,
  clinicId: z.string().optional(), labId: z.string().nullable().optional(),
  specialization: specializationSchema.optional(), hospitalRole: hospitalRoleSchema.optional(),
  qualification: z.string().optional(), registrationNumber: z.string().optional(), registrationCouncil: z.string().optional(),
  registrationStateCode: z.string().optional(), hprId: z.string().optional(), licenseNumber: z.string().optional(), licenseExpiry: z.string().or(z.date()).optional(),
  signatureUrl: z.string().optional(), signatureStoredUrl: z.string().nullable().optional(),
  signatureUploadedAt: z.string().or(z.date()).optional(),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED", "FAILED"]).optional(),
  verificationSource: z.string().optional(), verificationRef: z.string().optional(), verificationReason: z.string().optional(),
  verificationData: z.unknown().optional(), verificationCheckedAt: z.string().or(z.date()).optional(),
  registrationCertificateUrl: z.string().nullable().optional(), registrationCertificateStoredUrl: z.string().nullable().optional(),
  verifiedByAdminId: z.string().nullable().optional(), verifiedByAdminAt: z.string().or(z.date()).nullable().optional(),
  profilePhotoUrl: z.string().optional(), bio: z.string().optional(), yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(), phoneNumber: z.string().optional(),
  educationHistory: z.array(doctorEducationSchema).optional(), certifications: z.array(doctorCertificationSchema).optional(),
  additionalSpecializations: z.array(doctorSpecializationSchema).optional(), schedules: z.array(doctorScheduleSchema).optional(),
  createdAt: z.string().or(z.date()), updatedAt: z.string().or(z.date()),
});
export type User = z.infer<typeof userSchema>;
export type Doctor = User;
