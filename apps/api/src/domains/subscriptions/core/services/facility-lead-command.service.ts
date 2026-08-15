import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@workspace/db';
import {
  FACILITY_LEAD_TRANSITIONS,
  type FacilityLeadStatusHistoryEntry,
  type FacilityLeadSubmit,
  type FacilityLeadTransition,
  type FacilityLeadView,
} from '@workspace/types';
import { normalizePhoneE164, phoneMatchCandidates } from '@workspace/utils';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { mapToView } from './facility-lead.mapper';

/**
 * Facility-lead writes. Submission is idempotent on a per-partner
 * `idempotencyKey` and conflicts on a normalized contact phone with any
 * existing lead (`DUPLICATE_ENTRY`, the same semantic used for partner
 * phone conflicts) so double-submits surface instead of duplicating rows.
 * Transitions only follow the allowed edges from `FACILITY_LEAD_TRANSITIONS`
 * and append an actor/reason/timestamp record to `statusHistory` (never
 * edited in place).
 */
@Injectable()
export class FacilityLeadCommandService {
  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private readonly prisma: PartnerPersistencePort,
  ) {}

  async submitLead(
    referrerId: string,
    input: FacilityLeadSubmit,
  ): Promise<FacilityLeadView> {
    // 1. Idempotent replay: a client retry with the same key returns the
    //    original lead before any duplicate check can trip on its own phone.
    if (input.idempotencyKey) {
      const existing = await this.prisma.facilityLead.findUnique({
        where: {
          referrerId_idempotencyKey: {
            referrerId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: { referrer: { select: { id: true, name: true } } },
      });
      if (existing) return mapToView(existing);
    }

    // 2. Normalized contact-phone dedupe. Conservative for v1: any existing
    //    lead (any partner) with an equivalent stored form conflicts; the
    //    operator resolves duplicates via the lifecycle instead.
    let contactPhone: string | null = null;
    if (input.contactPhone) {
      contactPhone = normalizePhoneE164(input.contactPhone);
      const duplicate = await this.prisma.facilityLead.findFirst({
        where: { contactPhone: { in: phoneMatchCandidates(contactPhone) } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException({
          message: 'A lead for this facility contact already exists',
          code: 'DUPLICATE_ENTRY',
        });
      }
    }

    // 3. Create. The compound unique is the hard idempotency guarantee for
    //    the concurrent-submit race the pre-check cannot see.
    try {
      const lead = await this.prisma.facilityLead.create({
        data: {
          referrerId,
          facilityName: input.facilityName,
          facilityType: input.facilityType,
          address: input.address,
          city: input.city,
          state: input.state ?? null,
          postalCode: input.postalCode ?? null,
          mapsUrl: input.mapsUrl ?? null,
          contactName: input.contactName,
          contactRole: input.contactRole ?? null,
          contactPhone: contactPhone,
          contactEmail: input.contactEmail ?? null,
          sourceNote: input.sourceNote ?? null,
          preferredChannel: input.preferredChannel ?? null,
          consentToFollowUp: input.consentToFollowUp,
          notes: input.notes ?? null,
          bestTimeToContact: input.bestTimeToContact ?? null,
          idempotencyKey: input.idempotencyKey ?? null,
          statusHistory: Prisma.JsonNull,
        },
        include: { referrer: { select: { id: true, name: true } } },
      });
      return mapToView(lead);
    } catch (error) {
      if (input.idempotencyKey && isUniqueConstraintOnIdempotency(error)) {
        const existing = await this.prisma.facilityLead.findUnique({
          where: {
            referrerId_idempotencyKey: {
              referrerId,
              idempotencyKey: input.idempotencyKey,
            },
          },
          include: { referrer: { select: { id: true, name: true } } },
        });
        if (existing) return mapToView(existing);
      }
      throw error;
    }
  }

  /**
   * Internal operator status transition. Only the allowed edges from
   * `FACILITY_LEAD_TRANSITIONS` are permitted; every change appends an
   * actor/reason/timestamp record to `statusHistory` (never edited in
   * place). The write is conditional on the status we read, so two
   * operators transitioning the same lead concurrently cannot lose an
   * audit entry — the loser gets a conflict instead of an overwrite.
   */
  async transitionLead(
    id: string,
    actorId: string,
    input: FacilityLeadTransition,
  ): Promise<FacilityLeadView> {
    const lead = await this.prisma.facilityLead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const allowed = FACILITY_LEAD_TRANSITIONS[lead.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new BadRequestException(
        `A ${lead.status} lead cannot be moved to ${input.status}`,
      );
    }

    const history = Array.isArray(lead.statusHistory)
      ? (lead.statusHistory as FacilityLeadStatusHistoryEntry[])
      : [];
    const entry: FacilityLeadStatusHistoryEntry = {
      from: lead.status,
      to: input.status,
      reason: input.reason,
      actorId,
      at: new Date().toISOString(),
    };

    const updated = await this.prisma.facilityLead.updateMany({
      where: { id, status: lead.status },
      data: {
        status: input.status,
        statusHistory: toPrismaInputJsonValue([...history, entry]),
      },
    });
    if (updated.count === 0) {
      // The lead moved between our read and write (concurrent operator).
      throw new ConflictException(
        'This lead was just updated by someone else; please review and retry',
      );
    }

    const fresh = await this.prisma.facilityLead.findUnique({
      where: { id },
      include: { referrer: { select: { id: true, name: true } } },
    });
    if (!fresh) {
      throw new NotFoundException('Lead not found');
    }
    return mapToView(fresh);
  }
}

function isUniqueConstraintOnIdempotency(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;
  const target = error.meta?.target;
  return Array.isArray(target) && target.includes('idempotencyKey');
}
