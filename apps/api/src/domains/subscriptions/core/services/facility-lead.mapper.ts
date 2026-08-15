// check-as-cast-density: allow-file — narrowing Prisma JsonValue to the
// domain statusHistory array (schema-backed; no unchecked widening).
import { Prisma } from '@workspace/db';
import type {
  FacilityLeadStatusHistoryEntry,
  FacilityLeadView,
} from '@workspace/types';

/** Row shape with the referrer name join used by every read. */
type LeadWithReferrer = Prisma.FacilityLeadGetPayload<{
  include: { referrer: { select: { id: true; name: true } } };
}>;

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
    statusHistory: Array.isArray(lead.statusHistory)
      ? (lead.statusHistory as FacilityLeadStatusHistoryEntry[])
      : undefined,
  };
}
