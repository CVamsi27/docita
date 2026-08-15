import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { FacilityLeadService } from './facility-lead.service';

function leadRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    referrerId: 'r1',
    referrer: { id: 'r1', name: 'Priya Partner' },
    status: 'SUBMITTED',
    facilityName: 'Sunrise Diagnostics',
    facilityType: 'DIAGNOSTIC_CENTRE',
    address: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    mapsUrl: null,
    contactName: 'Dr Anil',
    contactRole: 'Owner',
    contactPhone: '+919812345678',
    contactEmail: null,
    sourceNote: null,
    preferredChannel: 'WHATSAPP',
    consentToFollowUp: true,
    notes: null,
    bestTimeToContact: null,
    idempotencyKey: null,
    statusHistory: null,
    createdAt: new Date('2026-08-15T10:00:00Z'),
    updatedAt: new Date('2026-08-15T10:00:00Z'),
    ...overrides,
  };
}

function makeCtx() {
  const facilityLead = {
    findUnique: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findFirst: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    create: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findMany: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    updateMany: jest.fn<(...a: unknown[]) => Promise<{ count: number }>>(),
  };
  const prisma = { facilityLead } as never;
  return {
    service: new FacilityLeadService(prisma),
    facilityLead,
  };
}

const submitInput = {
  facilityName: 'Sunrise Diagnostics',
  facilityType: 'DIAGNOSTIC_CENTRE' as const,
  address: '12 MG Road, Indiranagar',
  city: 'Bengaluru',
  contactName: 'Dr Anil',
  contactPhone: '98123 45678',
  consentToFollowUp: true,
};

describe('FacilityLeadService', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  describe('submitLead', () => {
    it('creates a SUBMITTED lead with the normalized contact phone', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.findFirst.mockResolvedValue(null);
      ctx.facilityLead.create.mockResolvedValue(leadRow());

      const view = await ctx.service.submitLead('r1', submitInput);

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
      expect(view).toMatchObject({
        id: 'l1',
        referrerName: 'Priya Partner',
        status: 'SUBMITTED',
        facilityName: 'Sunrise Diagnostics',
      });
    });

    it('skips the dedupe lookup when no contact phone is provided', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.create.mockResolvedValue(
        leadRow({ contactPhone: null }),
      );

      await ctx.service.submitLead('r1', {
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
    });

    it('rejects a duplicate contact phone with DUPLICATE_ENTRY and never creates', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.findFirst.mockResolvedValue({ id: 'existing-1' });

      let thrown: unknown;
      try {
        await ctx.service.submitLead('r1', submitInput);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ConflictException);
      expect((thrown as ConflictException).getResponse()).toEqual({
        message: 'A lead for this facility contact already exists',
        code: 'DUPLICATE_ENTRY',
      });
      expect(ctx.facilityLead.create).not.toHaveBeenCalled();
    });

    it('replays an idempotency key to the original lead before any dedupe', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ idempotencyKey: 'key-12345678' }),
      );

      const view = await ctx.service.submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'key-12345678',
      });

      expect(view.id).toBe('l1');
      expect(ctx.facilityLead.findFirst).not.toHaveBeenCalled();
      expect(ctx.facilityLead.create).not.toHaveBeenCalled();
    });

    it('returns the existing lead when a concurrent create hits the unique key', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);
      ctx.facilityLead.findFirst.mockResolvedValue(null);
      const conflict = new Error('Unique constraint failed') as Error & {
        code: string;
        meta: { target: string[] };
      };
      conflict.code = 'P2002';
      conflict.meta = { target: ['referrerId', 'idempotencyKey'] };
      ctx.facilityLead.create.mockRejectedValueOnce(conflict);
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ idempotencyKey: 'key-12345678' }),
      );

      const view = await ctx.service.submitLead('r1', {
        ...submitInput,
        idempotencyKey: 'key-12345678',
      });

      expect(view.id).toBe('l1');
    });
  });

  describe('listLeads', () => {
    it('returns the queue with the partner name, newest first, filtered by status', async () => {
      ctx.facilityLead.findMany.mockResolvedValue([leadRow()]);

      const views = await ctx.service.listLeads({ status: 'SUBMITTED' });

      const args = ctx.facilityLead.findMany.mock.calls[0][0] as {
        where: { status: string };
        orderBy: Record<string, string>;
      };
      expect(args.where.status).toBe('SUBMITTED');
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
      expect(views[0]).toMatchObject({
        id: 'l1',
        referrerName: 'Priya Partner',
      });
    });
  });

  describe('transitionLead', () => {
    it('advances along an allowed edge and appends history with actor + reason', async () => {
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'SUBMITTED' }),
      );
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'TRIAGED', statusHistory: [] }),
      );
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });

      const view = await ctx.service.transitionLead('l1', 'admin-1', {
        status: 'TRIAGED',
        reason: 'Reached out to the contact',
      });

      const write = ctx.facilityLead.updateMany.mock.calls[0][0] as {
        where: { id: string; status: string };
        data: { status: string; statusHistory: unknown[] };
      };
      // The write is conditional on the status we read (concurrency guard).
      expect(write.where).toEqual({ id: 'l1', status: 'SUBMITTED' });
      expect(write.data.status).toBe('TRIAGED');
      const data = write.data;
      const history = data.statusHistory as Array<Record<string, unknown>>;
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        from: 'SUBMITTED',
        to: 'TRIAGED',
        reason: 'Reached out to the contact',
        actorId: 'admin-1',
      });
      expect(typeof history[0].at).toBe('string');
      expect(view.status).toBe('TRIAGED');
    });

    it('appends to existing history instead of overwriting it', async () => {
      const existingHistory = [
        {
          from: 'SUBMITTED',
          to: 'TRIAGED',
          reason: 'First triage',
          actorId: 'admin-1',
          at: '2026-08-15T11:00:00.000Z',
        },
      ];
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ status: 'TRIAGED', statusHistory: existingHistory }),
      );
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'TRIAGED', statusHistory: existingHistory }),
      );
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'CONTACT_ATTEMPTED', statusHistory: [] }),
      );

      await ctx.service.transitionLead('l1', 'admin-2', {
        status: 'CONTACT_ATTEMPTED',
        reason: 'Called twice, no answer',
      });

      const data = (
        ctx.facilityLead.updateMany.mock.calls[0][0] as {
          data: { statusHistory: unknown[] };
        }
      ).data;
      expect(data.statusHistory).toHaveLength(2);
      expect((data.statusHistory[1] as Record<string, unknown>).actorId).toBe(
        'admin-2',
      );
    });

    it('rejects an edge that skips the chain', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ status: 'SUBMITTED' }),
      );

      // CONTACTED is not the immediate successor of SUBMITTED, so the edge is
      // invalid (terminal states are reachable from any non-terminal state,
      // but chain states only advance to the next one).
      await expect(
        ctx.service.transitionLead('l1', 'admin-1', {
          status: 'CONTACTED',
          reason: 'Skip triage entirely',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ctx.facilityLead.updateMany).not.toHaveBeenCalled();
    });

    it('rejects any transition out of a terminal state', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ status: 'LOST' }),
      );

      await expect(
        ctx.service.transitionLead('l1', 'admin-1', {
          status: 'TRIAGED',
          reason: 'Revive the lead',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 for an unknown lead', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);

      await expect(
        ctx.service.transitionLead('nope', 'admin-1', {
          status: 'TRIAGED',
          reason: 'Something happened',
        }),
      ).rejects.toThrow('Lead not found');
    });

    it('throws a conflict when the lead moved under us (concurrent operator)', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ status: 'SUBMITTED' }),
      );
      // Another operator transitioned it between our read and write.
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        ctx.service.transitionLead('l1', 'admin-1', {
          status: 'TRIAGED',
          reason: 'Someone else got here first',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      // No fresh read: the write never happened.
      expect(ctx.facilityLead.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
