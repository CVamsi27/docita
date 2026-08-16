// check-as-cast-density: allow-file — narrowing Prisma JsonValue to the
// domain statusHistory array and the schema-backed notification payload
// (both schema-backed; no unchecked widening).
import { Prisma } from '@workspace/db';
import type {
  FacilityLeadAssignmentHistoryEntry,
  FacilityLeadAuditView,
  FacilityLeadNotificationView,
  FacilityLeadStatusHistoryEntry,
  FacilityLeadStatusHistoryEntryView,
  FacilityLeadView,
  InternalFacilityLeadView,
} from '@workspace/types';
import { parseNotificationPayload } from './facility-lead-notification.service';

/** Row shape with the referrer name join used by every read. */
type LeadWithReferrer = Prisma.FacilityLeadGetPayload<{
  include: { referrer: { select: { id: true; name: true } } };
}>;

/** Internal queue row: lead + referrer + owner + duplicate link + latest notification. */
type LeadWithNotification = Prisma.FacilityLeadGetPayload<{
  include: {
    referrer: { select: { id: true; name: true } };
    ownerUser: { select: { id: true; name: true } };
    duplicateOf: { select: { id: true; facilityName: true } };
    notifications: { orderBy: { createdAt: 'desc' }; take: 1 };
  };
}>;

/** Partner-safe history: same records minus the internal operator id. */
function toHistoryView(
  statusHistory: Prisma.JsonValue | null,
): FacilityLeadStatusHistoryEntryView[] | undefined {
  if (!Array.isArray(statusHistory)) {
    return undefined;
  }
  return (statusHistory as FacilityLeadStatusHistoryEntry[]).map(
    ({ from, to, reason, at }) => ({ from, to, reason, at }),
  );
}

/** Full audit history with operator actor ids (internal surfaces only). */
function toFullHistory(
  statusHistory: Prisma.JsonValue | null,
): FacilityLeadStatusHistoryEntry[] | undefined {
  return Array.isArray(statusHistory)
    ? (statusHistory as FacilityLeadStatusHistoryEntry[])
    : undefined;
}

export function mapToView(lead: LeadWithReferrer): FacilityLeadView {
  return {
    id: lead.id,
    referrerId: lead.referrerId,
    referrerName: lead.referrer.name,
    status: lead.status,
    facilityName: lead.facilityName,
    facilityType: lead.facilityType,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    postalCode: lead.postalCode,
    contactName: lead.contactName,
    contactPhone: lead.contactPhone,
    contactEmail: lead.contactEmail,
    consentToFollowUp: lead.consentToFollowUp,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    statusHistory: toHistoryView(lead.statusHistory),
  };
}

/** Internal write response: partner view plus the full audit history. */
export function mapToAuditView(lead: LeadWithReferrer): FacilityLeadAuditView {
  return {
    ...mapToView(lead),
    statusHistory: toFullHistory(lead.statusHistory),
  };
}

export function mapToInternalView(
  lead: LeadWithNotification,
): InternalFacilityLeadView {
  const latest = lead.notifications[0] ?? null;
  return {
    ...mapToView(lead),
    // The internal queue keeps the full audit history (operator actor ids).
    statusHistory: toFullHistory(lead.statusHistory),
    ownerUserId: lead.ownerUserId ?? null,
    ownerName: lead.ownerUser?.name ?? null,
    assignmentHistory: Array.isArray(lead.assignmentHistory)
      ? (lead.assignmentHistory as FacilityLeadAssignmentHistoryEntry[])
      : undefined,
    duplicateScore: lead.duplicateScore ?? null,
    duplicateOf: lead.duplicateOf
      ? { id: lead.duplicateOf.id, facilityName: lead.duplicateOf.facilityName }
      : null,
    notification: latest ? mapNotification(latest) : null,
  };
}

export function mapNotification(
  row: LeadWithNotification['notifications'][number],
): FacilityLeadNotificationView {
  return {
    id: row.id,
    leadId: row.leadId,
    kind: row.kind,
    status: row.status,
    recipientUserId: row.recipientUserId ?? null,
    payload: parseNotificationPayload(row.payload),
    errorMessage: row.errorMessage,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    acknowledgedAt: row.acknowledgedAt
      ? row.acknowledgedAt.toISOString()
      : null,
    acknowledgedByUserId: row.acknowledgedByUserId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
