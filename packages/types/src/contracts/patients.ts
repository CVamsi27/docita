import { z } from "zod";
import { genderSchema } from "../shared/users";
import { dpdpConsentPayloadSchema } from "./dpdp";
import { pastDateOfBirthSchema } from "../patient/patients";
import { abhaAddressSchema, abhaNumberSchema } from "../clinical/abdm";

export { pastDateOfBirthSchema };

export const patientResponseSchema = z
  .object({
  id: z.string(),
  clinicId: z.string(),
  mrn: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  gender: genderSchema,
  dateOfBirth: pastDateOfBirthSchema.optional(),
  address: z.string().optional(),
  insuranceProvider: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
  insuranceGroupNumber: z.string().optional(),
  abhaAddress: z.string().optional(),
  abhaNumber: abhaNumberSchema.nullable().optional(),
  abhaKycName: z.string().nullable().optional(),
  abhaVerifiedAt: z.union([z.string(), z.date()]).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  version: z.number(),
  })
  .strict();

export const createPatientRequestSchema = z
  .object({
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
  dateOfBirth: pastDateOfBirthSchema.nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  insuranceProvider: z.string().max(100).nullable().optional(),
  insurancePolicyNumber: z.string().max(100).nullable().optional(),
  insuranceGroupNumber: z.string().max(100).nullable().optional(),
  abhaAddress: abhaAddressSchema.nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
  clinicId: z.string().optional(),
  /**
   * DPDP Act, 2023 consent payload. Optional at the contract level so internal
   * tooling (system migrations, test fixtures, admin scripts) can still create
   * patients, but every user-facing API surface (POST /patients, /book,
   * bulk import) MUST require it via controller-level enforcement.
   */
  dpdpConsent: dpdpConsentPayloadSchema.optional(),
  })
  .strict();

export const updatePatientRequestSchema = createPatientRequestSchema.partial();

export const listPatientsQuerySchema = z.object({
  search: z.string().optional(),
  gender: genderSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict();

export const listPatientsResponseSchema = z
  .object({
  items: z.array(patientResponseSchema),
  total: z.number().int().nonnegative(),
  })
  .strict();

const normalizeNullable = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

const normalizeDate = (
  value: string | Date | null | undefined,
): Date | undefined => {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
};

// These two transforms intentionally mirror each other's normalization of
// the shared nullable contract fields (`normalizeNullable`/`normalizeDate`),
// but their `input` shapes are NOT the same: `patientDomainCreateSchema`
// extends the (required-field) create contract, while
// `patientDomainUpdateSchema` maps `updatePatientRequestSchema` — i.e.
// `createPatientRequestSchema.partial()`, where every field is optional. A
// shared helper would have to either widen the create schema's `firstName`/
// `lastName`/`gender` to `| undefined` (breaking `PatientDomainCreateInput`'s
// precision, a Zod-first single-source-of-truth concern) or lean on type
// gymnastics that cost more clarity than the duplication does. Tried and
// reverted a generic `buildPatientDomainFields<F, L, G>` helper — Zod's
// `.partial()` makes those fields optional (`firstName?:`) rather than
// `firstName: T | undefined`, which TypeScript won't assign to a generic
// `{ firstName: F }` constraint. Keep them separate and in sync by eye.
// jscpd:ignore-start
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
    insuranceProvider: normalizeNullable(input.insuranceProvider),
    insurancePolicyNumber: normalizeNullable(input.insurancePolicyNumber),
    insuranceGroupNumber: normalizeNullable(input.insuranceGroupNumber),
    abhaAddress: normalizeNullable(input.abhaAddress),
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
    insuranceProvider: normalizeNullable(input.insuranceProvider),
    insurancePolicyNumber: normalizeNullable(input.insurancePolicyNumber),
    insuranceGroupNumber: normalizeNullable(input.insuranceGroupNumber),
    abhaAddress: normalizeNullable(input.abhaAddress),
    metadata: normalizeNullable(input.metadata),
  }),
);
// jscpd:ignore-end

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
  insuranceProvider: z.string().nullable().optional(),
  insurancePolicyNumber: z.string().nullable().optional(),
  insuranceGroupNumber: z.string().nullable().optional(),
  abhaAddress: z.string().nullable().optional(),
  abhaNumber: z.string().nullable().optional(),
  abhaKycName: z.string().nullable().optional(),
  abhaVerifiedAt: z.date().nullable().optional(),
  customData: z.unknown().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().nonnegative(),
});

// Same shape as the persistence record, minus the timestamps a write never
// supplies — deriving via `.omit()` keeps both schemas' field definitions
// (and their validation rules) from drifting apart over time.
export const patientPersistenceWriteSchema = patientPersistenceRecordSchema.omit(
  { createdAt: true, updatedAt: true },
);

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
