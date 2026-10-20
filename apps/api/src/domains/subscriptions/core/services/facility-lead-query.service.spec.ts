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
    expect(views.items[0]).toMatchObject({
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

  it('filters by owner (null selects unassigned), referrer, and lead id', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    await service.listLeads({
      ownerUserId: null,
      referrerId: 'r-9',
      // The notification deep link narrows the queue to exactly one lead.
      leadId: 'l-deeplink',
    });

    const args = ctx.facilityLead.findMany.mock.calls[0][0] as {
      where: {
        ownerUserId: string | null;
        referrerId: string;
        id: string;
      };
    };
    expect(args.where.ownerUserId).toBeNull();
    expect(args.where.referrerId).toBe('r-9');
    expect(args.where.id).toBe('l-deeplink');
  });

  it('builds where clauses for age, location, duplicate flag, and consent', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    await service.listLeads({
      createdSince: new Date('2026-08-01T00:00:00Z'),
      location: 'maharashtra',
      duplicateFlagged: true,
      consent: false,
    });

    const args = ctx.facilityLead.findMany.mock.calls[0][0] as {
      where: {
        createdAt: { gte: Date };
        OR: Array<Record<string, unknown>>;
        duplicateScore: { not: null };
        consentToFollowUp: boolean;
      };
    };
    expect(args.where.createdAt).toEqual({
      gte: new Date('2026-08-01T00:00:00Z'),
    });
    expect(args.where.OR).toEqual([
      { city: { contains: 'maharashtra', mode: 'insensitive' } },
      { state: { contains: 'maharashtra', mode: 'insensitive' } },
    ]);
    expect(args.where.duplicateScore).toEqual({ not: null });
    expect(args.where.consentToFollowUp).toBe(false);
  });

  it('leaves the new dimensions open when they are not supplied', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    await service.listLeads({});

    const args = ctx.facilityLead.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(args.where.createdAt).toBeUndefined();
    expect(args.where.OR).toBeUndefined();
    expect(args.where.duplicateScore).toBeUndefined();
    expect(args.where.consentToFollowUp).toBeUndefined();
  });

  it('pages with a cursor and bounded limit', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([
      leadRow({ id: 'l2', notifications: [] }),
      leadRow({ id: 'l1', notifications: [] }),
    ]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    const page = await service.listLeads(undefined, {
      cursor: 'l3',
      limit: 1,
    });

    const args = ctx.facilityLead.findMany.mock.calls[0][0] as {
      take: number;
      cursor?: { id: string };
      skip?: number;
    };
    // take = limit + 1 so the helper can detect hasMore.
    expect(args.take).toBe(2);
    expect(args.cursor).toEqual({ id: 'l3' });
    expect(args.skip).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('l2');
  });

  it('surfaces the duplicate link and score for review-flagged leads', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([
      leadRow({
        status: 'DUPLICATE_REVIEW',
        duplicateScore: 1,
        duplicateOfId: 'orig-1',
        duplicateOf: { id: 'orig-1', facilityName: 'Sunrise Diagnostics' },
        notifications: [],
      }),
    ]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    const views = await service.listLeads();

    const args = ctx.facilityLead.findMany.mock.calls[0][0] as {
      include: { duplicateOf: Record<string, unknown> };
    };
    expect(args.include.duplicateOf).toEqual({
      select: { id: true, facilityName: true },
    });
    expect(views.items[0]).toMatchObject({
      status: 'DUPLICATE_REVIEW',
      duplicateScore: 1,
      duplicateOf: { id: 'orig-1', facilityName: 'Sunrise Diagnostics' },
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

    expect(views.items[0]).toMatchObject({
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

    expect(views.items[0].notification).toBeNull();
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
