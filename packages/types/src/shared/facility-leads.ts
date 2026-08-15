import { z } from "zod";

/**
 * Facility lead lifecycle per docs/REFERRAL_PARTNER_PROGRAM_PLAN.md.
 * Partners can only create leads (status SUBMITTED); internal operators
 * own every transition past submission. Terminal/exception states are
 * absorbing.
 */
export const facilityLeadTypeSchema = z.enum([
  "CLINIC",
  "HOSPITAL",
  "DIAGNOSTIC_CENTRE",
  "PHARMACY",
  "NURSING_HOME",
  "OTHER",
]);
export type FacilityLeadType = z.infer<typeof facilityLeadTypeSchema>;

export const facilityLeadStatusSchema = z.enum([
  "SUBMITTED",
  "TRIAGED",
  "CONTACT_ATTEMPTED",
  "CONTACTED",
  "DEMO_SCHEDULED",
  "ONBOARDING",
  "TRIAL",
  "CONVERTED",
  "DUPLICATE",
  "NOT_INTERESTED",
  "INVALID",
  "UNREACHABLE",
  "REJECTED",
  "LOST",
]);
export type FacilityLeadStatus = z.infer<typeof facilityLeadStatusSchema>;

/** Terminal/exception states are absorbing (no outgoing transitions). */
const TERMINAL_LEAD_STATUSES: readonly FacilityLeadStatus[] = [
  "DUPLICATE",
  "NOT_INTERESTED",
  "INVALID",
  "UNREACHABLE",
  "REJECTED",
  "LOST",
  "CONVERTED",
];

/**
 * Allowed lifecycle edges, single source of truth shared by the API
 * (`FacilityLeadService`) and the internal leads UI (which renders only
 * the reachable targets). Each non-terminal state may advance to its
 * immediate successor or to any absorbing terminal state.
 */
export const FACILITY_LEAD_TRANSITIONS: Record<
  FacilityLeadStatus,
  readonly FacilityLeadStatus[]
> = {
  SUBMITTED: ["TRIAGED", ...TERMINAL_LEAD_STATUSES],
  TRIAGED: ["CONTACT_ATTEMPTED", ...TERMINAL_LEAD_STATUSES],
  CONTACT_ATTEMPTED: ["CONTACTED", ...TERMINAL_LEAD_STATUSES],
  CONTACTED: ["DEMO_SCHEDULED", ...TERMINAL_LEAD_STATUSES],
  DEMO_SCHEDULED: ["ONBOARDING", ...TERMINAL_LEAD_STATUSES],
  ONBOARDING: ["TRIAL", ...TERMINAL_LEAD_STATUSES],
  TRIAL: ["CONVERTED", ...TERMINAL_LEAD_STATUSES],
  CONVERTED: [],
  DUPLICATE: [],
  NOT_INTERESTED: [],
  INVALID: [],
  UNREACHABLE: [],
  REJECTED: [],
  LOST: [],
};

/** Body for `POST /partner/me/leads`. */
export const facilityLeadSubmitSchema = z.object({
  facilityName: z.string().trim().min(2).max(200),
  facilityType: facilityLeadTypeSchema,
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(20).optional(),
  mapsUrl: z.string().url().max(500).optional(),
  contactName: z.string().trim().min(2).max(200),
  contactRole: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().email().max(255).optional(),
  sourceNote: z.string().trim().max(1000).optional(),
  preferredChannel: z
    .enum(["WHATSAPP", "SMS", "PHONE", "EMAIL", "NONE"])
    .optional(),
  /** Partner attests the facility contact consented to a Docita follow-up. */
  consentToFollowUp: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
  bestTimeToContact: z.string().trim().max(200).optional(),
  /** Client-supplied key: resubmits with the same key return the existing lead. */
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});
export type FacilityLeadSubmit = z.infer<typeof facilityLeadSubmitSchema>;

/** One append-only status transition record on the lead. */
export const facilityLeadStatusHistoryEntrySchema = z.object({
  from: facilityLeadStatusSchema,
  to: facilityLeadStatusSchema,
  reason: z.string(),
  actorId: z.string(),
  at: z.string(),
});
export type FacilityLeadStatusHistoryEntry = z.infer<
  typeof facilityLeadStatusHistoryEntrySchema
>;

/** Server-side projection of a lead (partner submit response + internal queue). */
export const facilityLeadViewSchema = z.object({
  id: z.string(),
  referrerId: z.string(),
  referrerName: z.string(),
  status: facilityLeadStatusSchema,
  facilityName: z.string(),
  facilityType: facilityLeadTypeSchema,
  address: z.string(),
  city: z.string(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  contactName: z.string(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  consentToFollowUp: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  statusHistory: z.array(facilityLeadStatusHistoryEntrySchema).optional(),
});
export type FacilityLeadView = z.infer<typeof facilityLeadViewSchema>;

/** Body for `PATCH /internal/leads/:id/status`. */
export const facilityLeadTransitionSchema = z.object({
  status: facilityLeadStatusSchema,
  reason: z.string().trim().min(3).max(500),
});
export type FacilityLeadTransition = z.infer<
  typeof facilityLeadTransitionSchema
>;
