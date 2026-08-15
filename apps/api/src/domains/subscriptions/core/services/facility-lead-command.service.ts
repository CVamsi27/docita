// check-as-cast-density: allow-file — narrowing Prisma JsonValue to the
// domain statusHistory array (schema-backed; no unchecked widening).
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@workspace/db';
import {
  FACILITY_LEAD_TRANSITIONS,
  type FacilityLeadAssignmentHistoryEntry,
  type FacilityLeadAssign,
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
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';
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
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    @Inject('IOutboxService') private readonly outbox: IOutboxService,
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
    //    the concurrent-submit race the pre-check cannot see. The lead and
    //    its durable `facility-lead.created` outbox event commit atomically
    //    (ADR-0010), so a lead can never exist without its event and a
    //    rolled-back submit appends nothing.
    try {
      const lead = await this.prisma.$transaction(async (tx) => {
        const created = await tx.facilityLead.create({
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
        await this.outbox.append(tx, {
          eventName: ApplicationEvents.FACILITY_LEAD_CREATED,
          aggregateType: 'FacilityLead',
          aggregateId: created.id,
          clinicId: null,
          // Deterministic per lead: the lead row itself is unique, so the
          // event is exactly-once even across relay retries.
          idempotencyKey: `facility-lead.created:${created.id}`,
          // Identifiers only — the listener reloads the lead to build the
          // PII-redacted notification payload (never PHI in the outbox).
          payload: { leadId: created.id, referrerId },
        });
        return created;
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
      at: this.clock.now().toISOString(),
    };

    // The write stays conditional on the status we read (concurrency guard)
    // and the CONVERTED outbox event commits atomically with it, so a
    // loser of a concurrent transition never appends a spurious event.
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.facilityLead.updateMany({
        where: { id, status: lead.status },
        data: {
          status: input.status,
          statusHistory: toPrismaInputJsonValue([...history, entry]),
        },
      });
      if (result.count === 0) {
        // The lead moved between our read and write (concurrent operator).
        throw new ConflictException(
          'This lead was just updated by someone else; please review and retry',
        );
      }
      if (input.status === 'CONVERTED') {
        await this.outbox.append(tx, {
          eventName: ApplicationEvents.FACILITY_LEAD_CONVERTED,
          aggregateType: 'FacilityLead',
          aggregateId: id,
          clinicId: null,
          // CONVERTED is an absorbing terminal, so one event per lead.
          idempotencyKey: `facility-lead.converted:${id}`,
          payload: { leadId: id, referrerId: lead.referrerId },
        });
      }
    });

    return this.readFreshView(id);
  }

  /**
   * Internal operator assignment. The write is conditional on the owner we
   * read, so two operators assigning the same lead concurrently cannot
   * silently overwrite each other — the loser gets a conflict. Every change
   * appends an actor/timestamp record to `assignmentHistory` (never edited
   * in place), and any existing internal notifications are re-targeted to
   * the new owner in the same transaction so the delivery record always
   * names the current assignee.
   */
  async assignOwner(
    id: string,
    actorId: string,
    input: FacilityLeadAssign,
  ): Promise<FacilityLeadView> {
    const lead = await this.prisma.facilityLead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Owners are internal operators only; the picker already restricts the
    // list, but the write re-checks so a direct API call cannot pin a clinic
    // staff or patient user as the lead owner.
    const operator = await this.prisma.user.findFirst({
      where: { id: input.userId, role: Role.INTERNAL },
      select: { id: true },
    });
    if (!operator) {
      throw new BadRequestException('Operator not found');
    }

    const history = Array.isArray(lead.assignmentHistory)
      ? (lead.assignmentHistory as FacilityLeadAssignmentHistoryEntry[])
      : [];
    const entry: FacilityLeadAssignmentHistoryEntry = {
      fromUserId: lead.ownerUserId ?? null,
      toUserId: input.userId,
      actorId,
      at: this.clock.now().toISOString(),
    };

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.facilityLead.updateMany({
        where: { id, ownerUserId: lead.ownerUserId },
        data: {
          ownerUserId: input.userId,
          assignmentHistory: toPrismaInputJsonValue([...history, entry]),
        },
      });
      if (result.count === 0) {
        // The owner changed between our read and write (concurrent assign).
        throw new ConflictException(
          'This lead was just assigned by someone else; please review and retry',
        );
      }
      // Keep the delivery record in step with the assignment.
      await tx.facilityLeadNotification.updateMany({
        where: { leadId: id },
        data: { recipientUserId: input.userId },
      });
    });

    return this.readFreshView(id);
  }

  /** Re-read after a write and map to the partner view (404 if gone). */
  private async readFreshView(id: string): Promise<FacilityLeadView> {
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
