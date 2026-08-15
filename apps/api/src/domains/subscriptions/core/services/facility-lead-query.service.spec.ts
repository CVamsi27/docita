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
      include: { notifications: Record<string, unknown> };
    };
    expect(args.where.status).toBe('SUBMITTED');
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    // Internal queue joins the latest notification per lead.
    expect(args.include.notifications).toEqual({
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(views[0]).toMatchObject({
      id: 'l1',
      referrerName: 'Priya Partner',
      notification: {
        kind: 'LEAD_CREATED',
        status: 'DELIVERED',
        payload: { facilityName: 'Sunrise Diagnostics', deepLink: '/leads' },
      },
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
});
