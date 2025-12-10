import { z } from "zod";
import { userRoleSchema, specializationSchema } from "./index";

// ============================================================================
// Team Member Schemas & Types
// ============================================================================

/**
 * Doctor-specific properties
 */
export const doctorDetailsSchema = z.object({
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.union([z.string(), z.number()]).optional(),
  consultationFee: z.union([z.string(), z.number()]).optional(),
});

export type DoctorDetails = z.infer<typeof doctorDetailsSchema>;

/**
 * Base member form data (for create/edit operations)
 */
export const memberFormDataSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: userRoleSchema.optional(),
  // Doctor-specific fields
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.union([z.string(), z.number()]).optional(),
  consultationFee: z.union([z.string(), z.number()]).optional(),
});

export type MemberFormData = z.infer<typeof memberFormDataSchema>;

/**
 * Team member (fetched from API)
 */
export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional().nullable(),
  role: userRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  // Doctor-specific fields
  specialization: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  yearsOfExperience: z.number().optional().nullable(),
  consultationFee: z.number().optional().nullable(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

/**
 * Clinic doctor (response from /clinics/:clinicId/doctors)
 */
export const clinicDoctorSchema = teamMemberSchema;
export type ClinicDoctor = z.infer<typeof clinicDoctorSchema>;

/**
 * Clinic receptionist (response from /clinics/:clinicId/receptionists)
 */
export const clinicReceptionistSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional().nullable(),
  role: z.literal("RECEPTIONIST"),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type ClinicReceptionist = z.infer<typeof clinicReceptionistSchema>;

/**
 * Create member request payload
 */
export const createMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().optional(),
  role: z.literal("DOCTOR").or(z.literal("RECEPTIONIST")).optional(),
  // Doctor-specific
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(),
});

export type CreateMemberPayload = z.infer<typeof createMemberSchema>;

/**
 * Update member request payload
 */
export const updateMemberSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  // Doctor-specific
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(),
});

export type UpdateMemberPayload = z.infer<typeof updateMemberSchema>;
