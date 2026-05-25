import { z } from "zod";
import { userSchema } from "../shared/users";

export const createDoctorRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.string().optional(),
  specialization: z.string().optional(),
  hospitalRole: z.string().optional(),
  qualification: z.string().optional(),
  registrationNumber: z.string().optional(),
  registrationCouncil: z.string().optional(),
  registrationStateCode: z.string().optional(),
  licenseNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().int().nonnegative().optional(),
  consultationFee: z.number().nonnegative().optional(),
});

export const updateDoctorRequestSchema = createDoctorRequestSchema
  .partial()
  .omit({ password: true })
  .extend({
    email: z.string().email().optional(),
    licenseExpiry: z.union([z.string(), z.date()]).optional(),
    signatureUrl: z.string().trim().min(1).optional(),
    profilePhotoUrl: z.string().url().optional(),
  });

export const updateDoctorRegistrationRequestSchema = z.object({
  registrationNumber: z.string().trim().min(1),
  registrationCouncil: z.string().trim().max(120).optional(),
  registrationStateCode: z.string().trim().max(32).optional(),
});

export const doctorResponseSchema = userSchema.partial({
  createdAt: true,
  updatedAt: true,
});

export const doctorListResponseSchema = z.array(doctorResponseSchema);

export const listDoctorSchedulesQuerySchema = z.object({
  doctorId: z.string().optional(),
});

export const listDoctorTimeOffQuerySchema = z.object({
  doctorId: z.string().optional(),
  upcoming: z.coerce.boolean().optional(),
});

export const doctorAvailableSlotsQuerySchema = z.object({
  date: z.string().min(1),
  doctorId: z.string().optional(),
});

export const doctorUnavailableDoctorsQuerySchema = z.object({
  date: z.string().min(1),
});

export type CreateDoctorRequest = z.infer<typeof createDoctorRequestSchema>;
export type UpdateDoctorRequest = z.infer<typeof updateDoctorRequestSchema>;
export type UpdateDoctorRegistrationRequest = z.infer<
  typeof updateDoctorRegistrationRequestSchema
>;
export type DoctorContractResponse = z.infer<typeof doctorResponseSchema>;
export type ListDoctorSchedulesContractQuery = z.infer<
  typeof listDoctorSchedulesQuerySchema
>;
export type ListDoctorTimeOffContractQuery = z.infer<
  typeof listDoctorTimeOffQuerySchema
>;
export type DoctorAvailableSlotsContractQuery = z.infer<
  typeof doctorAvailableSlotsQuerySchema
>;
export type DoctorUnavailableDoctorsContractQuery = z.infer<
  typeof doctorUnavailableDoctorsQuerySchema
>;
