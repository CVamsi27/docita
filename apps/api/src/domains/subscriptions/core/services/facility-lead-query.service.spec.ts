import { beforeEach, describe, expect, it } from '@jest/globals';
import { FacilityLeadQueryService } from './facility-lead-query.service';
import {
  leadRow,
  makeFacilityLeadCtx,
  notificationRow,
} from './facility-lead.spec-helpers';

describe('FacilityLeadQueryService', () => {
  let ctx: ReturnType<typeof makeFacilityLeadCtx>;
  beforeEach(() => {
    ctx = makeFacilityLeadCtx();
  });

  it('returns the queue with the partner name, newest first, filtered by status', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([
      leadRow({ notifications: [notificationRow()] }),
    ]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    const views = await service.listLeads({ status: 'SUBMITTED' });

    const args = ctx.facilityLead.findMany.mock.calls[0][0] as {
      where: { status: string };
      orderBy: Record<string, string>;
      include: {
        notifications: Record<string, unknown>;
        ownerUser: Record<string, unknown>;
      };
    };
    expect(args.where.status).toBe('SUBMITTED');
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    // Internal queue joins the latest notification per lead and the owner.
    expect(args.include.notifications).toEqual({
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(args.include.ownerUser).toEqual({
      select: { id: true, name: true },
    });
    expect(views[0]).toMatchObject({
      id: 'l1',
      referrerName: 'Priya Partner',
      ownerUserId: null,
      ownerName: null,
      notification: {
        kind: 'LEAD_CREATED',
        status: 'DELIVERED',
        recipientUserId: null,
        payload: { facilityName: 'Sunrise Diagnostics', deepLink: '/leads' },
      },
    });
  });

  it('exposes the assigned owner on the queue item', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([
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
        notifications: [notificationRow({ recipientUserId: 'op-1' })],
      }),
    ]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    const views = await service.listLeads();

    expect(views[0]).toMatchObject({
      ownerUserId: 'op-1',
      ownerName: 'Kiran Ops',
      assignmentHistory: [
        {
          fromUserId: null,
          toUserId: 'op-1',
          actorId: 'internal-9',
        },
      ],
      notification: { recipientUserId: 'op-1' },
    });
  });

  it('returns a null notification for a lead with no notification row yet', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([
      leadRow({ notifications: [] }),
    ]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    const views = await service.listLeads();

    expect(views[0].notification).toBeNull();
  });

  it('lists INTERNAL-role operators for the assign picker', async () => {
    ctx.user.findMany.mockResolvedValue([
      { id: 'op-1', name: 'Kiran Ops', email: 'kiran@docita.work' },
      { id: 'op-2', name: 'Amit Ops', email: 'amit@docita.work' },
    ]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    const operators = await service.listOperators();

    const args = ctx.user.findMany.mock.calls[0][0] as {
      where: { role: string };
      orderBy: Record<string, string>;
      take: number;
    };
    expect(args.where.role).toBe('INTERNAL');
    expect(args.orderBy).toEqual({ name: 'asc' });
    expect(args.take).toBe(200);
    expect(operators).toEqual([
      { id: 'op-1', name: 'Kiran Ops', email: 'kiran@docita.work' },
      { id: 'op-2', name: 'Amit Ops', email: 'amit@docita.work' },
    ]);
  });
});
