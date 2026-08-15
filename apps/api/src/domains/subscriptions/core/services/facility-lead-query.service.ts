import { Inject, Injectable } from '@nestjs/common';
import { Role } from '@workspace/db';
import type {
  FacilityLeadStatus,
  InternalFacilityLeadView,
  InternalOperator,
} from '@workspace/types';
import {
  PARTNER_PERSISTENCE_PORT,
  type PartnerPersistencePort,
} from '@/domains/subscriptions/application/ports/partner-persistence.port';
import { mapToInternalView } from './facility-lead.mapper';

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
  }): Promise<InternalFacilityLeadView[]> {
    const leads = await this.prisma.facilityLead.findMany({
      where: { status: filter?.status },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        referrer: { select: { id: true, name: true } },
        ownerUser: { select: { id: true, name: true } },
        duplicateOf: { select: { id: true, facilityName: true } },
        notifications: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    return leads.map(mapToInternalView);
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
