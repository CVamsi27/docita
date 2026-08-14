import { z } from "zod";

const userRoleSchema = z.enum([
  "DOCTOR",
  "NURSE",
  "RECEPTIONIST",
  "ADMIN",
  "INTERNAL",
  "ADMIN_DOCTOR",
]);

export const doctorDetailsSchema = z.object({
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.union([z.string(), z.number()]).optional(),
  consultationFee: z.union([z.string(), z.number()]).optional(),
});

export type DoctorDetails = z.infer<typeof doctorDetailsSchema>;

const doctorFieldsSchema = z.object({
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  consultationFee: z.number().optional(),
});

const doctorFieldsFormSchema = z.object({
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  yearsOfExperience: z.union([z.string(), z.number()]).optional(),
  consultationFee: z.union([z.string(), z.number()]).optional(),
});

export const memberFormDataSchema = z.object({
  name: z.string().min(1, "Enter the team member's name."),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: userRoleSchema.optional(),
}).merge(doctorFieldsFormSchema);

export type MemberFormData = z.infer<typeof memberFormDataSchema>;

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string().optional().nullable(),
  role: userRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),

  specialization: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  yearsOfExperience: z.number().optional().nullable(),
  consultationFee: z.number().optional().nullable(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

/** Alias for {@link teamMemberSchema} scoped to doctor-role members. */
export const clinicDoctorSchema = teamMemberSchema.describe("ClinicDoctor");
export type ClinicDoctor = z.infer<typeof clinicDoctorSchema>;

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

export const createMemberSchema = z.object({
  name: z.string().min(1, "Enter the team member's name."),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Use at least 6 characters."),
  phoneNumber: z.string().optional(),
  role: z
    .literal("DOCTOR")
    .or(z.literal("NURSE"))
    .or(z.literal("RECEPTIONIST"))
    .optional(),
}).merge(doctorFieldsSchema);

export type CreateMemberPayload = z.infer<typeof createMemberSchema>;

export const updateMemberSchema = z.object({
  name: z.string().min(1, "Enter the team member's name.").optional(),
  email: z.string().email("Please enter a valid email address").optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
}).merge(doctorFieldsSchema);

export type UpdateMemberPayload = z.infer<typeof updateMemberSchema>;
