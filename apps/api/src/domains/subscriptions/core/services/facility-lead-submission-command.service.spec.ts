import { beforeEach, describe, expect, it } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { computeFacilityFingerprint } from './facility-fingerprint';
import { FacilityLeadSubmissionCommandService } from './facility-lead-submission-command.service';
import { leadRow, makeFacilityLeadCtx } from './facility-lead.spec-helpers';

const submitInput = {
  facilityName: 'Sunrise Diagnostics',
  facilityType: 'DIAGNOSTIC_CENTRE' as const,
  address: '12 MG Road, Indiranagar',
  city: 'Bengaluru',
  contactName: 'Dr Anil',
  contactPhone: '98123 45678',
  consentToFollowUp: true,
};

describe('FacilityLeadSubmissionCommandService', () => {
  let ctx: ReturnType<typeof makeFacilityLeadCtx>;
  beforeEach(() => {
    ctx = makeFacilityLeadCtx();
  });

  const service = () =>
    new FacilityLeadSubmissionCommandService(ctx.prisma, ctx.outbox);

  describe('submitLead', () => {
    it('creates a SUBMITTED lead with the normalized contact phone, a fingerprint, and the created outbox event atomically', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.findFirst.mockResolvedValue(null);
      ctx.facilityLead.create.mockResolvedValue(leadRow());

      const view = await service().submitLead('r1', submitInput);

      const data = (
        ctx.facilityLead.create.mock.calls[0][0] as {
          data: Record<string, unknown>;
        }
      ).data;
      expect(data.referrerId).toBe('r1');
      expect(data.status).toBeUndefined(); // DB default SUBMITTED
      expect(data.contactPhone).toBe('+919812345678');
      expect(data.consentToFollowUp).toBe(true);
      // Prisma.JsonNull sentinel: no history on a fresh lead.
      expect(data.statusHistory).toBe(Prisma.JsonNull);
      // The race-safe duplicate fingerprint is computed and stored.
      expect(data.fingerprint).toBe(
        computeFacilityFingerprint({
          facilityName: submitInput.facilityName,
          address: submitInput.address,
          contactPhone: '+919812345678',
        }),
      );
      expect(view).toMatchObject({
        id: 'l1',
        referrerName: 'Priya Partner',
        status: 'SUBMITTED',
        facilityName: 'Sunrise Diagnostics',
      });

      // The durable event is appended inside the same transaction.
      expect(ctx.outbox.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventName: ApplicationEvents.FACILITY_LEAD_CREATED,
          aggregateType: 'FacilityLead',
          aggregateId: 'l1',
          idempotencyKey: 'facility-lead.created:l1',
          payload: { leadId: 'l1', referrerId: 'r1' },
        }),
      );
    });

    it('skips the dedupe lookup when no contact phone is provided', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.create.mockResolvedValue(
        leadRow({ contactPhone: null }),
      );

      await service().submitLead('r1', {
        ...submitInput,
        contactPhone: undefined,
      });

      expect(ctx.facilityLead.findFirst).not.toHaveBeenCalled();
      const data = (
        ctx.facilityLead.create.mock.calls[0][0] as {
          data: Record<string, unknown>;
        }
      ).data;
      expect(data.contactPhone).toBeNull();
      expect(data.fingerprint).toBeNull();
    });

    it('rejects a same-phone-but-different-facility submit with DUPLICATE_ENTRY and never creates', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      // Fingerprint pre-check misses (different facility name/address); the
      // phone dedupe then finds the conflicting lead -> conservative 409.
      ctx.facilityLead.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-1' });

      let thrown: unknown;
      try {
        await service().submitLead('r1', submitInput);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as ConflictException).getResponse()).toEqual({
        message: 'A lead for this facility contact already exists',
        code: 'DUPLICATE_ENTRY',
      });
      expect(ctx.facilityLead.create).not.toHaveBeenCalled();
      expect(ctx.outbox.append).not.toHaveBeenCalled();
    });

    it('routes a concurrent same-facility submit that only the phone check sees to DUPLICATE_REVIEW', async () => {
      // The fingerprint pre-check and the phone dedupe are separate reads, so
      // a concurrent submit of the same facility can straddle the other
      // submit's commit: the fingerprint read saw nothing, the phone read saw
      // its row. That is an exact duplicate, so it must be held for review —
      // rejecting it would make the answer depend on interleaving.
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'concurrent-1',
          fingerprint: computeFacilityFingerprint({
            facilityName: submitInput.facilityName,
            address: submitInput.address,
            contactPhone: submitInput.contactPhone ?? '',
          }),
        });
      ctx.facilityLead.create.mockResolvedValue(
        leadRow({ status: 'DUPLICATE_REVIEW', duplicateOfId: 'concurrent-1' }),
      );

      const view = await service().submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'lead-key-race000001',
      });

      const data = (
        ctx.facilityLead.create.mock.calls[0][0] as {
          data: Record<string, unknown>;
        }
      ).data;
      expect(data.status).toBe('DUPLICATE_REVIEW');
      expect(data.duplicateOfId).toBe('concurrent-1');
      expect(view.status).toBe('DUPLICATE_REVIEW');
    });

    it('routes an exact fingerprint match to DUPLICATE_REVIEW linked to the original', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      // Fingerprint pre-check finds the original facility.
      ctx.facilityLead.findFirst.mockResolvedValue({ id: 'orig-1' });
      ctx.facilityLead.create.mockResolvedValue(
        leadRow({ status: 'DUPLICATE_REVIEW', duplicateOfId: 'orig-1' }),
      );

      const view = await service().submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'lead-key-dup000001',
      });

      // The copy is held for review instead of a bare 409, with no
      // fingerprint of its own (the unique index keeps one real lead) and
      // the exact-match score.
      const data = (
        ctx.facilityLead.create.mock.calls[0][0] as {
          data: Record<string, unknown>;
        }
      ).data;
      expect(data.status).toBe('DUPLICATE_REVIEW');
      expect(data.fingerprint).toBeNull();
      expect(data.duplicateScore).toBe(1);
      expect(data.duplicateOfId).toBe('orig-1');
      // The phone dedupe is never reached: the fingerprint is the match.
      expect(ctx.facilityLead.findFirst).toHaveBeenCalledTimes(1);
      expect(view.status).toBe('DUPLICATE_REVIEW');
      // The review copy still gets its durable created event.
      expect(ctx.outbox.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventName: ApplicationEvents.FACILITY_LEAD_CREATED,
          aggregateId: 'l1',
          idempotencyKey: 'facility-lead.created:l1',
        }),
      );
    });

    it('re-routes a concurrent same-facility submit (P2002 on fingerprint) to DUPLICATE_REVIEW', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      // Pre-check misses (race), the phone dedupe also misses, then the
      // create collides on the unique fingerprint; the re-read finds the
      // winner.
      ctx.facilityLead.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'orig-1' });
      const conflict = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['fingerprint'] },
        },
      );
      ctx.facilityLead.create
        .mockRejectedValueOnce(conflict)
        .mockResolvedValueOnce(
          leadRow({ status: 'DUPLICATE_REVIEW', duplicateOfId: 'orig-1' }),
        );

      const view = await service().submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'lead-key-race000001',
      });

      expect(ctx.facilityLead.create).toHaveBeenCalledTimes(2);
      const copy = (
        ctx.facilityLead.create.mock.calls[1][0] as {
          data: Record<string, unknown>;
        }
      ).data;
      expect(copy.status).toBe('DUPLICATE_REVIEW');
      expect(copy.duplicateOfId).toBe('orig-1');
      expect(copy.duplicateScore).toBe(1);
      expect(view.status).toBe('DUPLICATE_REVIEW');
    });

    it('recognizes the driver-adapter P2002 shape (meta.driverAdapterError) and re-routes', async () => {
      // Prisma 5+ with the new query engine nests the constrained fields at
      // meta.driverAdapterError.cause.constraint.fields instead of
      // meta.target — the race must still re-route instead of 500ing.
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'orig-1' });
      const conflict = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`fingerprint`)',
        {
          code: 'P2002',
          clientVersion: 'test',
          meta: {
            modelName: 'FacilityLead',
            driverAdapterError: {
              name: 'DriverAdapterError',
              cause: {
                originalCode: '23505',
                originalMessage:
                  'duplicate key value violates unique constraint "FacilityLead_fingerprint_key"',
                kind: 'UniqueConstraintViolation',
                constraint: { fields: ['fingerprint'] },
              },
            },
          },
        },
      );
      ctx.facilityLead.create
        .mockRejectedValueOnce(conflict)
        .mockResolvedValueOnce(
          leadRow({ status: 'DUPLICATE_REVIEW', duplicateOfId: 'orig-1' }),
        );

      const view = await service().submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'lead-key-race000002',
      });

      expect(ctx.facilityLead.create).toHaveBeenCalledTimes(2);
      expect(view.status).toBe('DUPLICATE_REVIEW');
    });

    it('replays a concurrent duplicate-submit with the same key to the review copy', async () => {
      // Step 1 replay check: no existing lead. Then the fingerprint pre-check
      // finds the original, the review copy's create hits the partner+key
      // unique, and the replay re-read returns the copy we created.
      ctx.facilityLead.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          leadRow({
            status: 'DUPLICATE_REVIEW',
            idempotencyKey: 'lead-key-dup000002',
          }),
        );
      ctx.facilityLead.findFirst.mockResolvedValue({ id: 'orig-1' });
      const conflict = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['referrerId', 'idempotencyKey'] },
        },
      );
      ctx.facilityLead.create.mockRejectedValueOnce(conflict);

      const view = await service().submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'lead-key-dup000002',
      });

      expect(ctx.facilityLead.create).toHaveBeenCalledTimes(1);
      expect(view.status).toBe('DUPLICATE_REVIEW');
    });

    it('replays an idempotency key to the original lead before any dedupe', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ idempotencyKey: 'key-12345678' }),
      );

      const view = await service().submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'key-12345678',
      });

      expect(view.id).toBe('l1');
      expect(ctx.facilityLead.findFirst).not.toHaveBeenCalled();
      expect(ctx.facilityLead.create).not.toHaveBeenCalled();
      expect(ctx.outbox.append).not.toHaveBeenCalled();
    });

    it('returns the existing lead when a concurrent create hits the unique key (no second event)', async () => {
      // The step-1 replay is the recovery path for a concurrent same-key
      // submit: the loser's create never runs.
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ idempotencyKey: 'key-12345678' }),
      );

      const view = await service().submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'key-12345678',
      });

      expect(view.id).toBe('l1');
      expect(ctx.outbox.append).not.toHaveBeenCalled();
    });
  });
});
