import { z } from "zod";
import { userRoleSchema } from "../shared/users/roles";
import { planModeSchema } from "../billing/tier";

/** PHI data-classification anchor for resource attributes. */
export const resourceClassificationSchema = z.enum([
  "public",
  "phi",
  "phi-special",
  "billing",
]);
export type ResourceClassification = z.infer<typeof resourceClassificationSchema>;

/** DPDP consent state — a resource attribute, never a role. */
export const consentStateSchema = z.enum(["granted", "withdrawn", "minor"]);
export type ConsentState = z.infer<typeof consentStateSchema>;

/**
 * Subject attributes: who is asking. Derived from the authenticated user +
 * JWT claims. `doctorId` is the User id for doctor roles (PatientDoctor.doctorId
 * references User.id); `patientId` is the Patient profile id from the JWT.
 * Optional collections default to empty — a missing attribute never grants.
 */
export const subjectAttributesSchema = z.object({
  userId: z.string().min(1),
  roles: z.array(userRoleSchema).min(1),
  clinicId: z.string().min(1),
  doctorId: z.string().nullish(),
  patientId: z.string().nullish(),
  department: z.string().nullish(),
  careTeamIds: z.array(z.string()).default([]),
  isVerified: z.boolean().default(false),
  shifts: z.array(z.string()).default([]),
});
export type SubjectAttributes = z.infer<typeof subjectAttributesSchema>;

/**
 * Resource attributes: what is being asked about. `ownerId` is the owning
 * User id (Patient.userId); `assignedDoctorIds` mirrors the many-to-many
 * PatientDoctor relation (active rows only); `requiresAssignment` gates
 * doctor assignment-pinning per surface (staff surface off today, portal
 * surface on later — see ADR-0013).
 */
export const resourceAttributesSchema = z.object({
  type: z.string().min(1),
  clinicId: z.string().min(1),
  ownerId: z.string().nullish(),
  assignedDoctorIds: z.array(z.string()).default([]),
  assignedPatientId: z.string().nullish(),
  classification: resourceClassificationSchema,
  consentState: consentStateSchema.nullish(),
  requiresAssignment: z.boolean().default(false),
});
export type ResourceAttributes = z.infer<typeof resourceAttributesSchema>;

export const authnContextSchema = z.enum([
  "session",
  "api-key",
  "webhook",
  "internal",
]);
export type AuthnContext = z.infer<typeof authnContextSchema>;

/** Clinic facts loaded from ClinicAuthCacheService (tier, mode, features). */
export const clinicEnvAttributesSchema = z.object({
  tier: z.string().min(1),
  planMode: planModeSchema.nullish(),
  hasIntelligence: z.boolean().default(false),
  features: z.record(z.string(), z.boolean()).default({}),
  subscriptionStatus: z.string().min(1),
});
export type ClinicEnvAttributes = z.infer<typeof clinicEnvAttributesSchema>;

/**
 * Environment attributes: request context + clock. `time` and `authnContext`
 * are required — nothing may default them to permissive.
 */
export const envAttributesSchema = z.object({
  authnContext: authnContextSchema,
  time: z.string().datetime(),
  zone: z.string().default("UTC"),
  device: z.string().nullish(),
  origin: z.string().nullish(),
  clinic: clinicEnvAttributesSchema.nullable().default(null),
});
export type EnvAttributes = z.infer<typeof envAttributesSchema>;
