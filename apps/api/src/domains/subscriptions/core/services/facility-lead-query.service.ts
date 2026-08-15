// check-as-cast-density: allow-file — one isolated narrowing below where the
// open Prisma FindManyArgs signature cannot carry the joined queue payload
// (same Prisma-generic limitation the mapper handles with its own directive).
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@workspace/db';
import type {
  CursorPaginationResult,
  FacilityLeadStatus,
  InternalFacilityLeadView,
  InternalOperator,
} from '@workspace/types';
import { paginateWithCursor } from '@/shared/common/pagination.helper';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { mapToInternalView } from './facility-lead.mapper';

/** Shared queue join so the paginated row type and the mapper agree. */
const LEAD_QUEUE_INCLUDE = {
  referrer: { select: { id: true, name: true } },
  ownerUser: { select: { id: true, name: true } },
  duplicateOf: { select: { id: true, facilityName: true } },
  notifications: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.FacilityLeadInclude;

type LeadQueueRow = Prisma.FacilityLeadGetPayload<{
  include: typeof LEAD_QUEUE_INCLUDE;
}>;

/** Facility-lead reads: the internal operator queue. */
@Injectable()
export class FacilityLeadQueryService {
  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private readonly prisma: PartnerPersistencePort,
  ) {}

  /**
   * Internal operator queue: newest first, cursor-paginated (see
   * `paginateWithCursor`), with status / owner / partner filters.
   * `ownerUserId: null` selects unassigned leads (the UI's UNASSIGNED
   * sentinel); undefined leaves the filter open.
   */
  async listLeads(
    filter?: {
      status?: FacilityLeadStatus;
      ownerUserId?: string | null;
      referrerId?: string;
    },
    page?: { cursor?: string; limit?: number },
  ): Promise<CursorPaginationResult<InternalFacilityLeadView>> {
    const leadModel = {
      // The queue always joins the referrer, owner, duplicate link and the
      // latest notification; annotate so the paginated items type carries
      // the joined shape for the mapper.
      findMany: (
        args?: Prisma.FacilityLeadFindManyArgs,
      ): Promise<LeadQueueRow[]> =>
        // The queue always passes LEAD_QUEUE_INCLUDE; narrow the open args'
        // base-row return to the joined payload once, here.
        this.prisma.facilityLead.findMany(args) as Promise<LeadQueueRow[]>,
      count: (args?: Prisma.FacilityLeadCountArgs) =>
        this.prisma.facilityLead.count(args),
    };

    const result = await paginateWithCursor<LeadQueueRow>({
      model: leadModel,
      cursor: page?.cursor,
      limit: page?.limit ?? 50,
      where: {
        status: filter?.status,
        ownerUserId: filter?.ownerUserId,
        referrerId: filter?.referrerId,
      },
      orderBy: { createdAt: 'desc' },
      include: LEAD_QUEUE_INCLUDE,
    });
    return {
      ...result,
      items: result.items.map(mapToInternalView),
    };
  }

  /** Assignable internal operators, alphabetized for the picker. */
  async listOperators(): Promise<InternalOperator[]> {
    const operators = await this.prisma.user.findMany({
      where: { role: Role.INTERNAL },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      // Bounded like the other internal user lists (§9.3): the picker never
      // needs the whole platform staff.
      take: 200,
    });
    return operators.map((operator) => ({
      id: operator.id,
      name: operator.name,
      email: operator.email,
    }));
  }
}
