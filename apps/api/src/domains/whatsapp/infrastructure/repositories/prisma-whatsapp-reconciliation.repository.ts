import { Injectable } from '@nestjs/common';
import { WhatsappLogStatus } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IWhatsappReconciliationRepository,
  StaleWhatsappLogGroup,
} from '@/domains/whatsapp/core/repositories/whatsapp-reconciliation.repository.interface';

/**
 * Non-final outbound statuses. DELIVERED, READ and FAILED are terminal; a log
 * still in QUEUED or SENT after a long wait means its delivery webhook never
 * arrived.
 */
const NON_FINAL_STATUSES: WhatsappLogStatus[] = [
  WhatsappLogStatus.QUEUED,
  WhatsappLogStatus.SENT,
];

@Injectable()
export class PrismaWhatsappReconciliationRepository implements IWhatsappReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findStaleNonFinal(
    createdBefore: Date,
  ): Promise<StaleWhatsappLogGroup[]> {
    const groups = await this.prisma.whatsappLog.groupBy({
      by: ['clinicId', 'status'],
      where: {
        status: { in: NON_FINAL_STATUSES },
        createdAt: { lt: createdBefore },
      },
      _count: { _all: true },
      _min: { createdAt: true },
    });

    return groups.map((group) => ({
      clinicId: group.clinicId,
      status: group.status,
      count: group._count._all,
      oldestCreatedAt: group._min.createdAt ?? createdBefore,
    }));
  }
}
