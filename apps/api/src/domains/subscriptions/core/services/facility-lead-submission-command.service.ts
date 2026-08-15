// check-as-cast-density: allow-file — narrowing Prisma JsonValue and the
// P2002 meta (classic `meta.target` vs driver-adapter constraint fields).
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import {
  type FacilityLeadSubmit,
  type FacilityLeadView,
} from '@workspace/types';
import { normalizePhoneE164, phoneMatchCandidates } from '@workspace/utils';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';
import { computeFacilityFingerprint } from './facility-fingerprint';
import { mapToView } from './facility-lead.mapper';

/**
 * Facility-lead submission (partner-facing write). Idempotent on a
 * per-partner `idempotencyKey`. Cross-partner duplicate handling follows
 * the plan: an exact fingerprint match (normalized name + address + phone,
 * enforced by a unique index so concurrent submits cannot both slip
 * through) routes the new lead to DUPLICATE_REVIEW instead of rejecting
 * it, while a same-phone-but-different-facility match still conflicts
 * with `DUPLICATE_ENTRY` (the conservative contract, unchanged).
 */
@Injectable()
export class FacilityLeadSubmissionCommandService {
  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private readonly prisma: PartnerPersistencePort,
    @Inject('IOutboxService') private readonly outbox: IOutboxService,
  ) {}

  async submitLead(
    referrerId: string,
    input: FacilityLeadSubmit,
  ): Promise<FacilityLeadView> {
    // 1. Idempotent replay: a client retry with the same key returns the
    //    original lead before any duplicate check can trip on its own phone.
    const replayed = await this.replayByIdempotencyKey(
      referrerId,
      input.idempotencyKey,
    );
    if (replayed) return replayed;

    // 2. Normalized phone + the deterministic facility fingerprint (only
    //    when a contact phone was provided, matching the dedupe scope).
    const contactPhone = input.contactPhone
      ? normalizePhoneE164(input.contactPhone)
      : null;
    const fingerprint = contactPhone
      ? computeFacilityFingerprint({
          facilityName: input.facilityName,
          address: input.address,
          contactPhone,
        })
      : null;

    // 3. Optimistic fingerprint pre-check: an exact facility match is held
    //    for operator review instead of a bare rejection. The unique index
    //    below is the hard guarantee for the concurrent-submit race this
    //    pre-check cannot see.
    if (fingerprint) {
      const existing = await this.prisma.facilityLead.findFirst({
        where: { fingerprint },
        select: { id: true },
      });
      if (existing) {
        return this.createDuplicateLead(
          referrerId,
          input,
          contactPhone,
          existing.id,
        );
      }
    }

    // 4. Same-phone-but-different-facility dedupe (only reached when the
    //    fingerprint did not match): conservative `DUPLICATE_ENTRY`, the
    //    same semantic used for partner phone conflicts.
    if (contactPhone) {
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

    // 5. Create. The compound unique is the hard idempotency guarantee for
    //    the concurrent-submit race the pre-check cannot see; the fingerprint
    //    unique is the hard duplicate guarantee (a losing concurrent submit
    //    of the same facility is re-routed to DUPLICATE_REVIEW below). The
    //    lead and its durable `facility-lead.created` outbox event commit
    //    atomically (ADR-0010), so a lead can never exist without its event
    //    and a rolled-back submit appends nothing.
    try {
      // The await is deliberate: a bare `return` would hand the rejection
      // to the caller and skip this P2002 re-route handling.
      return await this.createLeadInTransaction(
        referrerId,
        input,
        contactPhone,
        { fingerprint },
      );
    } catch (error) {
      if (fingerprint && isUniqueConstraintOnFingerprint(error)) {
        // Concurrent submit of the same facility slipped past the pre-check:
        // re-read the winner and route this submission to review.
        const existing = await this.prisma.facilityLead.findFirst({
          where: { fingerprint },
          select: { id: true },
        });
        if (existing) {
          return this.createDuplicateLead(
            referrerId,
            input,
            contactPhone,
            existing.id,
          );
        }
      }
      // A concurrent retry with the same key returns the original lead;
      // anything else re-throws.
      return this.replayOrThrow(referrerId, input.idempotencyKey, error);
    }
  }

  /**
   * Hold a fingerprint-matching submission in DUPLICATE_REVIEW, linked to
   * the original lead, so an operator resolves it with an audit record
   * instead of the partner hitting a bare rejection. The review copy gets
   * no fingerprint (the unique index keeps exactly one real lead per
   * facility) and carries `duplicateScore = 1` (exact match) surfaced in
   * the queue and the notification payload.
   */
  private async createDuplicateLead(
    referrerId: string,
    input: FacilityLeadSubmit,
    contactPhone: string | null,
    duplicateOfId: string,
  ): Promise<FacilityLeadView> {
    try {
      return await this.createLeadInTransaction(
        referrerId,
        input,
        contactPhone,
        {
          status: 'DUPLICATE_REVIEW',
          fingerprint: null,
          duplicateScore: 1,
          duplicateOfId,
        },
      );
    } catch (error) {
      // Same-partner concurrent retry with the same key: return the copy we
      // already created for this key instead of surfacing the unique clash.
      return this.replayOrThrow(referrerId, input.idempotencyKey, error);
    }
  }

  /**
   * Lead + durable created-event in one transaction (ADR-0010). `overrides`
   * lets the duplicate path override status/fingerprint/score/link.
   */
  private async createLeadInTransaction(
    referrerId: string,
    input: FacilityLeadSubmit,
    contactPhone: string | null,
    overrides: Partial<Prisma.FacilityLeadUncheckedCreateInput> = {},
  ): Promise<FacilityLeadView> {
    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.facilityLead.create({
        data: {
          ...this.buildLeadCreateData(referrerId, input, contactPhone),
          ...overrides,
        },
        include: { referrer: { select: { id: true, name: true } } },
      });
      await this.appendCreatedEvent(tx, created.id, referrerId);
      return created;
    });
    return mapToView(lead);
  }

  /** Shared submit fields (the duplicate copy overrides status/fingerprint). */
  private buildLeadCreateData(
    referrerId: string,
    input: FacilityLeadSubmit,
    contactPhone: string | null,
  ): Prisma.FacilityLeadUncheckedCreateInput {
    return {
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
      contactPhone,
      contactEmail: input.contactEmail ?? null,
      sourceNote: input.sourceNote ?? null,
      preferredChannel: input.preferredChannel ?? null,
      consentToFollowUp: input.consentToFollowUp,
      notes: input.notes ?? null,
      bestTimeToContact: input.bestTimeToContact ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      statusHistory: Prisma.JsonNull,
    };
  }

  /** Durable created event, exactly-once per lead id. */
  private async appendCreatedEvent(
    tx: Prisma.TransactionClient,
    leadId: string,
    referrerId: string,
  ): Promise<void> {
    await this.outbox.append(tx, {
      eventName: ApplicationEvents.FACILITY_LEAD_CREATED,
      aggregateType: 'FacilityLead',
      aggregateId: leadId,
      clinicId: null,
      // Deterministic per lead: the lead row itself is unique, so the
      // event is exactly-once even across relay retries.
      idempotencyKey: `facility-lead.created:${leadId}`,
      // Identifiers only — the listener reloads the lead to build the
      // PII-redacted notification payload (never PHI in the outbox).
      payload: { leadId, referrerId },
    });
  }

  /**
   * Re-read a lead by the partner+key unique after a P2002 on the
   * idempotency key (concurrent retry of the same submission). Returns the
   * existing lead's view, or null when the caller should re-throw.
   */
  private async replayByIdempotencyKey(
    referrerId: string,
    idempotencyKey: string | undefined,
  ): Promise<FacilityLeadView | null> {
    if (!idempotencyKey) return null;
    const existing = await this.prisma.facilityLead.findUnique({
      where: {
        referrerId_idempotencyKey: {
          referrerId,
          idempotencyKey,
        },
      },
      include: { referrer: { select: { id: true, name: true } } },
    });
    return existing ? mapToView(existing) : null;
  }

  /**
   * Resolve a P2002 on the partner+key unique: re-read the existing lead
   * and return it, or re-throw the original error when the conflict is not
   * on the idempotency key or the row is gone.
   */
  private async replayOrThrow(
    referrerId: string,
    idempotencyKey: string | undefined,
    error: unknown,
  ): Promise<FacilityLeadView> {
    if (isUniqueConstraintOnIdempotency(error)) {
      const replayed = await this.replayByIdempotencyKey(
        referrerId,
        idempotencyKey,
      );
      if (replayed) return replayed;
    }
    throw error;
  }
}

/**
 * The constrained fields of a P2002. Prisma's classic shape is
 * `meta.target` (string[]); the driver-adapter shape (Prisma 5+ with the
 * new query engine) nests it at `meta.driverAdapterError.cause.constraint
 * .fields`. Both must be recognized or a concurrent-submit race surfaces
 * as a 500 instead of being re-routed.
 */
function uniqueConstraintTargets(error: unknown): string[] {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return [];
  if (error.code !== 'P2002') return [];
  const meta = error.meta as
    | { target?: unknown; driverAdapterError?: unknown }
    | undefined;
  if (!meta) return [];
  const driverAdapterFields = (
    meta.driverAdapterError as {
      cause?: { constraint?: { fields?: unknown } };
    } | null
  )?.cause?.constraint?.fields;
  const target = meta.target ?? driverAdapterFields;
  return Array.isArray(target)
    ? target.filter((field): field is string => typeof field === 'string')
    : [];
}

function isUniqueConstraintOnIdempotency(error: unknown): boolean {
  return uniqueConstraintTargets(error).includes('idempotencyKey');
}

function isUniqueConstraintOnFingerprint(error: unknown): boolean {
  return uniqueConstraintTargets(error).includes('fingerprint');
}
