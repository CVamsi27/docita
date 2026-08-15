import { beforeEach, describe, expect, it } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { FacilityLeadCommandService } from './facility-lead-command.service';
import { leadRow, makeFacilityLeadCtx } from './facility-lead.spec-helpers';

describe('FacilityLeadCommandService', () => {
  let ctx: ReturnType<typeof makeFacilityLeadCtx>;
  beforeEach(() => {
    ctx = makeFacilityLeadCtx();
  });

  const service = () =>
    new FacilityLeadCommandService(ctx.prisma, ctx.clock, ctx.outbox);

  describe('transitionLead', () => {
    it('advances along an allowed edge and appends history with actor + reason (no outbox event)', async () => {
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'SUBMITTED' }),
      );
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'TRIAGED', statusHistory: [] }),
      );
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });

      const view = await service().transitionLead('l1', 'admin-1', {
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
      // Non-CONVERTED transitions emit nothing.
      expect(ctx.outbox.append).not.toHaveBeenCalled();
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

      await service().transitionLead('l1', 'admin-2', {
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

    it('appends the converted outbox event atomically when a lead converts', async () => {
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'TRIAL', statusHistory: [] }),
      );
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'CONVERTED', statusHistory: [] }),
      );
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });

      const view = await service().transitionLead('l1', 'admin-1', {
        status: 'CONVERTED',
        reason: 'Signed the onboarding agreement',
      });

      expect(view.status).toBe('CONVERTED');
      expect(ctx.outbox.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventName: ApplicationEvents.FACILITY_LEAD_CONVERTED,
          aggregateType: 'FacilityLead',
          aggregateId: 'l1',
          idempotencyKey: 'facility-lead.converted:l1',
          payload: { leadId: 'l1', referrerId: 'r1' },
        }),
      );
    });

    it('resolves a DUPLICATE_REVIEW lead to TRIAGED and drops the duplicate linkage', async () => {
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({
          status: 'DUPLICATE_REVIEW',
          duplicateOfId: 'orig-1',
          duplicateScore: 1,
          statusHistory: [],
        }),
      );
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'TRIAGED', statusHistory: [] }),
      );
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });

      const view = await service().transitionLead('l1', 'admin-1', {
        status: 'TRIAGED',
        reason: 'Verified this is a distinct facility after all',
      });

      expect(view.status).toBe('TRIAGED');
      const write = ctx.facilityLead.updateMany.mock.calls[0][0] as {
        where: { status: string };
        data: { duplicateOfId: string | null; duplicateScore: number | null };
      };
      expect(write.where.status).toBe('DUPLICATE_REVIEW');
      // Resolved as real: the queue must stop labeling it a duplicate.
      expect(write.data.duplicateOfId).toBeNull();
      expect(write.data.duplicateScore).toBeNull();
    });

    it('keeps the duplicate linkage when a DUPLICATE_REVIEW lead is rejected as a duplicate', async () => {
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({
          status: 'DUPLICATE_REVIEW',
          duplicateOfId: 'orig-1',
          duplicateScore: 1,
          statusHistory: [],
        }),
      );
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ status: 'DUPLICATE', statusHistory: [] }),
      );
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });

      const view = await service().transitionLead('l1', 'admin-1', {
        status: 'DUPLICATE',
        reason: 'Confirmed a copy of the existing Sunrise Diagnostics lead',
      });

      expect(view.status).toBe('DUPLICATE');
      const write = ctx.facilityLead.updateMany.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      // The dead copy keeps its provenance: the write does not touch the
      // duplicate linkage (the DB retains the stored values).
      expect(write.data.duplicateOfId).toBeUndefined();
      expect(write.data.duplicateScore).toBeUndefined();
    });

    it('rejects an edge that skips the chain', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ status: 'SUBMITTED' }),
      );

      // CONTACTED is not the immediate successor of SUBMITTED, so the edge is
      // invalid (terminal states are reachable from any non-terminal state,
      // but chain states only advance to the next one).
      await expect(
        service().transitionLead('l1', 'admin-1', {
          status: 'CONTACTED',
          reason: 'Skip triage entirely',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ctx.facilityLead.updateMany).not.toHaveBeenCalled();
      expect(ctx.outbox.append).not.toHaveBeenCalled();
    });

    it('rejects any transition out of a terminal state', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ status: 'LOST' }),
      );

      await expect(
        service().transitionLead('l1', 'admin-1', {
          status: 'TRIAGED',
          reason: 'Revive the lead',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 for an unknown lead', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);

      await expect(
        service().transitionLead('nope', 'admin-1', {
          status: 'TRIAGED',
          reason: 'Something happened',
        }),
      ).rejects.toThrow('Lead not found');
    });

    it('throws a conflict when the lead moved under us (concurrent operator) and appends nothing', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(
        leadRow({ status: 'SUBMITTED' }),
      );
      // Another operator transitioned it between our read and write.
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service().transitionLead('l1', 'admin-1', {
          status: 'TRIAGED',
          reason: 'Someone else got here first',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      // No fresh read: the write never happened.
      expect(ctx.facilityLead.findUnique).toHaveBeenCalledTimes(1);
      expect(ctx.outbox.append).not.toHaveBeenCalled();
    });
  });

  describe('assignOwner', () => {
    it('assigns an INTERNAL operator, records the audit entry, and re-targets notifications atomically', async () => {
      ctx.facilityLead.findUnique.mockResolvedValueOnce(leadRow());
      ctx.user.findFirst.mockResolvedValue({ id: 'op-1' });
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });
      ctx.facilityLeadNotification.updateMany.mockResolvedValue({ count: 1 });
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({
          ownerUserId: 'op-1',
          ownerUser: { id: 'op-1', name: 'Kiran Ops' },
          assignmentHistory: [
            {
              fromUserId: null,
              toUserId: 'op-1',
              actorId: 'internal-9',
              at: '2026-08-15T12:00:00.000Z',
            },
          ],
        }),
      );

      const view = await service().assignOwner('l1', 'internal-9', {
        userId: 'op-1',
      });

      // The target must be an internal operator.
      const operatorQuery = ctx.user.findFirst.mock.calls[0][0] as {
        where: { id: string; role: string };
      };
      expect(operatorQuery.where).toEqual({ id: 'op-1', role: 'INTERNAL' });

      // The write is conditional on the owner we read (concurrency guard).
      const write = ctx.facilityLead.updateMany.mock.calls[0][0] as {
        where: { id: string; ownerUserId: string | null };
        data: { ownerUserId: string; assignmentHistory: unknown[] };
      };
      expect(write.where).toEqual({ id: 'l1', ownerUserId: null });
      expect(write.data.ownerUserId).toBe('op-1');
      const history = write.data.assignmentHistory as Array<
        Record<string, unknown>
      >;
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        fromUserId: null,
        toUserId: 'op-1',
        actorId: 'internal-9',
      });
      expect(typeof history[0].at).toBe('string');

      // Existing notifications are re-targeted in the same transaction.
      expect(ctx.facilityLeadNotification.updateMany).toHaveBeenCalledWith({
        where: { leadId: 'l1' },
        data: { recipientUserId: 'op-1' },
      });
      // The partner view never exposes the assignment surface; the fresh
      // internal read (queue) carries owner fields instead.
      expect(view.id).toBe('l1');
      expect(ctx.facilityLead.findUnique).toHaveBeenCalledTimes(2);
      // Assignment emits no outbox event.
      expect(ctx.outbox.append).not.toHaveBeenCalled();
    });

    it('appends to existing assignment history instead of overwriting it', async () => {
      const existing = [
        {
          fromUserId: null,
          toUserId: 'op-1',
          actorId: 'internal-9',
          at: '2026-08-15T11:00:00.000Z',
        },
      ];
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({
          ownerUserId: 'op-1',
          ownerUser: { id: 'op-1', name: 'Kiran Ops' },
          assignmentHistory: existing,
        }),
      );
      ctx.user.findFirst.mockResolvedValue({ id: 'op-2' });
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 1 });
      ctx.facilityLeadNotification.updateMany.mockResolvedValue({ count: 1 });
      ctx.facilityLead.findUnique.mockResolvedValueOnce(
        leadRow({ ownerUserId: 'op-2' }),
      );

      await service().assignOwner('l1', 'internal-9', { userId: 'op-2' });

      const write = ctx.facilityLead.updateMany.mock.calls[0][0] as {
        where: { ownerUserId: string | null };
        data: { assignmentHistory: unknown[] };
      };
      // Conditional on the owner we actually read.
      expect(write.where.ownerUserId).toBe('op-1');
      const history = write.data.assignmentHistory as Array<
        Record<string, unknown>
      >;
      expect(history).toHaveLength(2);
      expect(history[1]).toMatchObject({
        fromUserId: 'op-1',
        toUserId: 'op-2',
        actorId: 'internal-9',
      });
    });

    it('rejects a non-INTERNAL target with 400 and writes nothing', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(leadRow());
      ctx.user.findFirst.mockResolvedValue(null);

      await expect(
        service().assignOwner('l1', 'internal-9', { userId: 'patient-1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ctx.facilityLead.updateMany).not.toHaveBeenCalled();
      expect(ctx.facilityLeadNotification.updateMany).not.toHaveBeenCalled();
    });

    it('throws 404 for an unknown lead', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(null);

      await expect(
        service().assignOwner('nope', 'internal-9', { userId: 'op-1' }),
      ).rejects.toThrow('Lead not found');
      expect(ctx.user.findFirst).not.toHaveBeenCalled();
    });

    it('throws a conflict when the owner changed concurrently and re-targets nothing', async () => {
      ctx.facilityLead.findUnique.mockResolvedValue(leadRow());
      ctx.user.findFirst.mockResolvedValue({ id: 'op-1' });
      // Someone else assigned the lead between our read and write.
      ctx.facilityLead.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service().assignOwner('l1', 'internal-9', { userId: 'op-1' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(ctx.facilityLeadNotification.updateMany).not.toHaveBeenCalled();
      // No fresh read: the write never happened.
      expect(ctx.facilityLead.findUnique).toHaveBeenCalledTimes(1);
    });
  });
});
