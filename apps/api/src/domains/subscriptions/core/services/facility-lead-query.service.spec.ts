import { beforeEach, describe, expect, it } from '@jest/globals';
import { FacilityLeadQueryService } from './facility-lead-query.service';
import { leadRow, makeFacilityLeadCtx } from './facility-lead.spec-helpers';

describe('FacilityLeadQueryService', () => {
  let ctx: ReturnType<typeof makeFacilityLeadCtx>;
  beforeEach(() => {
    ctx = makeFacilityLeadCtx();
  });

  it('returns the queue with the partner name, newest first, filtered by status', async () => {
    ctx.facilityLead.findMany.mockResolvedValue([leadRow()]);

    const service = new FacilityLeadQueryService(ctx.prisma);
    const views = await service.listLeads({ status: 'SUBMITTED' });

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
