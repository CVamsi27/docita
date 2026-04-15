import { z } from "zod";
import { genderSchema } from "../shared/users";

export const patientResponseSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  mrn: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  gender: genderSchema,
  dateOfBirth: z.union([z.string(), z.date()]).optional(),
  address: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  version: z.number(),
});

export const createPatientRequestSchema = z.object({
  mrn: z.string().max(50).nullable().optional(),
  firstName: z.string().min(1, "Enter the patient's first name").max(100),
  lastName: z.string().min(1, "Enter the patient's last name").max(100),
  email: z
    .string()
    .email("Please enter a valid email address")
    .nullable()
    .optional(),
  phoneNumber: z.string().min(10).max(20).nullable().optional(),
  gender: genderSchema,
  dateOfBirth: z.union([z.string(), z.date()]).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  clinicId: z.string().optional(),
}).passthrough();

export const updatePatientRequestSchema = createPatientRequestSchema.partial();

export const listPatientsQuerySchema = z.object({
  search: z.string().optional(),
  gender: genderSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const listPatientsResponseSchema = z.object({
  items: z.array(patientResponseSchema),
  total: z.number().int().nonnegative(),
});

const normalizeNullable = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

const normalizeDate = (
  value: string | Date | null | undefined,
): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
};

export const patientDomainCreateSchema = createPatientRequestSchema
  .extend({
    clinicId: z.string().min(1),
  })
  .transform((input) => ({
    clinicId: input.clinicId,
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    mrn: normalizeNullable(input.mrn),
    email: normalizeNullable(input.email),
    phoneNumber: normalizeNullable(input.phoneNumber),
    dateOfBirth: normalizeDate(input.dateOfBirth),
    address: normalizeNullable(input.address),
    metadata: normalizeNullable(input.metadata),
  }));

export const patientDomainUpdateSchema = updatePatientRequestSchema.transform(
  (input) => ({
    firstName: input.firstName,
    lastName: input.lastName,
    gender: input.gender,
    mrn: normalizeNullable(input.mrn),
    email: normalizeNullable(input.email),
    phoneNumber: normalizeNullable(input.phoneNumber),
    dateOfBirth: normalizeDate(input.dateOfBirth),
    address: normalizeNullable(input.address),
    metadata: normalizeNullable(input.metadata),
  }),
);

export const patientPersistenceRecordSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  mrn: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  gender: genderSchema,
  dateOfBirth: z.date().nullable().optional(),
  address: z.string().nullable().optional(),
  customData: z.unknown().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().nonnegative(),
});

export const patientPersistenceWriteSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  mrn: z.string().nullable().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  gender: genderSchema,
  dateOfBirth: z.date().nullable().optional(),
  address: z.string().nullable().optional(),
  customData: z.unknown().nullable().optional(),
  version: z.number().int().nonnegative(),
});

export type PatientContractResponse = z.infer<typeof patientResponseSchema>;
export type CreatePatientRequest = z.infer<typeof createPatientRequestSchema>;
export type UpdatePatientRequest = z.infer<typeof updatePatientRequestSchema>;
export type ListPatientsContractQuery = z.infer<typeof listPatientsQuerySchema>;
export type ListPatientsContractResponse = z.infer<
  typeof listPatientsResponseSchema
>;
export type PatientDomainCreateInput = z.output<typeof patientDomainCreateSchema>;
export type PatientDomainUpdateInput = z.output<typeof patientDomainUpdateSchema>;
export type PatientPersistenceRecord = z.infer<
  typeof patientPersistenceRecordSchema
>;
export type PatientPersistenceWrite = z.infer<
  typeof patientPersistenceWriteSchema
>;
