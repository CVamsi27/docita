import { Inject, Injectable } from '@nestjs/common';
import type { FacilityLeadStatus, FacilityLeadView } from '@workspace/types';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { mapToView } from './facility-lead.mapper';

/** Facility-lead reads: the internal operator queue. */
@Injectable()
export class FacilityLeadQueryService {
  constructor(
    @Inject(PARTNER_PERSISTENCE_PORT)
    private readonly prisma: PartnerPersistencePort,
  ) {}

  /** Internal operator queue: newest first, optional status filter. */
  async listLeads(filter?: {
    status?: FacilityLeadStatus;
  }): Promise<FacilityLeadView[]> {
    const leads = await this.prisma.facilityLead.findMany({
      where: { status: filter?.status },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { referrer: { select: { id: true, name: true } } },
    });
    return leads.map(mapToView);
  }
}
