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

/** One append-only owner-assignment record on the lead. */
export const facilityLeadAssignmentHistoryEntrySchema = z.object({
  /** Null when the lead was previously unassigned. */
  fromUserId: z.string().nullable(),
  toUserId: z.string(),
  actorId: z.string(),
  at: z.string(),
});
export type FacilityLeadAssignmentHistoryEntry = z.infer<
  typeof facilityLeadAssignmentHistoryEntrySchema
>;

/** Body for `PATCH /internal/leads/:id/assign`. */
export const facilityLeadAssignSchema = z.object({
  /** The internal operator (Role.INTERNAL user) to assign. */
  userId: z.string().trim().min(1).max(64),
  reason: z.string().trim().max(500).optional(),
});
export type FacilityLeadAssign = z.infer<typeof facilityLeadAssignSchema>;

/** One internal operator option for the assign picker. */
export const internalOperatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});
export type InternalOperator = z.infer<typeof internalOperatorSchema>;

export const internalOperatorListSchema = z.array(internalOperatorSchema);

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

/** What triggered an internal facility-lead notification. */
export const facilityLeadNotificationKindSchema = z.enum([
  "LEAD_CREATED",
  "LEAD_CONVERTED",
]);
export type FacilityLeadNotificationKind = z.infer<
  typeof facilityLeadNotificationKindSchema
>;

/** Delivery state of an internal facility-lead notification. */
export const facilityLeadNotificationStatusSchema = z.enum([
  "QUEUED",
  "DELIVERED",
  "FAILED",
]);
export type FacilityLeadNotificationStatus = z.infer<
  typeof facilityLeadNotificationStatusSchema
>;

/**
 * PII-redacted payload carried by an internal facility-lead notification.
 * No contact phone/email or other sensitive data — only what the operator
 * needs to find the lead in the portal plus a deep link.
 */
export const facilityLeadNotificationPayloadSchema = z.object({
  leadId: z.string(),
  facilityName: z.string(),
  city: z.string(),
  state: z.string().nullable(),
  partnerName: z.string(),
  consentToFollowUp: z.boolean(),
  /** Null until cross-partner duplicate fingerprinting lands. */
  duplicateScore: z.number().nullable(),
  deepLink: z.string(),
});
export type FacilityLeadNotificationPayload = z.infer<
  typeof facilityLeadNotificationPayloadSchema
>;

/** Internal-portal projection of one facility-lead notification. */
export const facilityLeadNotificationViewSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  kind: facilityLeadNotificationKindSchema,
  status: facilityLeadNotificationStatusSchema,
  /** The assigned owner at delivery time (null while unassigned). */
  recipientUserId: z.string().nullable(),
  payload: facilityLeadNotificationPayloadSchema,
  errorMessage: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  createdAt: z.string(),
});
export type FacilityLeadNotificationView = z.infer<
  typeof facilityLeadNotificationViewSchema
>;

/**
 * Internal-only lead queue item: the operator-facing view plus the latest
 * internal notification delivery status and assignment state. Kept separate
 * from `facilityLeadViewSchema` so the partner submit response never leaks
 * the internal notification or assignment surface.
 */
export const internalFacilityLeadViewSchema = facilityLeadViewSchema.extend({
  ownerUserId: z.string().nullable(),
  ownerName: z.string().nullable(),
  assignmentHistory: z.array(facilityLeadAssignmentHistoryEntrySchema).optional(),
  notification: facilityLeadNotificationViewSchema.nullable(),
});
export type InternalFacilityLeadView = z.infer<
  typeof internalFacilityLeadViewSchema
>;
