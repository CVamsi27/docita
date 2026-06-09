import { Inject, Injectable } from '@nestjs/common';
import { WhatsappLogStatus } from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';

const STALE_AFTER_HOURS = 6;
const STATS_LOOKBACK_DAYS = 30;

@Injectable()
export class MessagingService {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getLogs(
    clinicId: string,
    options: { limit?: number; patientId?: string; type?: string },
  ) {
    return this.persistence.whatsappLog.findMany({
      where: {
        clinicId,
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.type && { type: options.type }),
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
    });
  }

  async getWhatsappStats(clinicId: string) {
    const now = this.clock.now();
    const periodStart = new Date(
      now.getTime() - STATS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const staleCutoff = new Date(
      now.getTime() - STALE_AFTER_HOURS * 60 * 60 * 1000,
    );
    const [totalPatients, subscribers, statusGroups, staleDeliveryCount] =
      await Promise.all([
        this.persistence.patient.count({ where: { clinicId } }),
        this.persistence.patient.count({
          where: {
            clinicId,
            phoneNumber: { not: '' },
          },
        }),
        this.persistence.whatsappLog.groupBy({
          by: ['status'],
          where: {
            clinicId,
            createdAt: { gte: periodStart },
          },
          _count: { _all: true },
        }),
        this.persistence.whatsappLog.count({
          where: {
            clinicId,
            status: {
              in: [WhatsappLogStatus.QUEUED, WhatsappLogStatus.SENT],
            },
            createdAt: { lt: staleCutoff },
          },
        }),
      ]);
    const countByStatus = new Map(
      statusGroups.map((group) => [group.status, group._count._all]),
    );
    const outboundLast30Days = statusGroups.reduce(
      (sum, group) => sum + group._count._all,
      0,
    );
    const deliveredCount =
      (countByStatus.get(WhatsappLogStatus.DELIVERED) ?? 0) +
      (countByStatus.get(WhatsappLogStatus.READ) ?? 0);
    const deliveryRate =
      outboundLast30Days > 0
        ? Math.round((deliveredCount / outboundLast30Days) * 1000) / 10
        : null;

    return {
      totalPatients,
      subscribers,
      deliveryRate,
      responseRate: null,
      staleDeliveryCount,
      outboundLast30Days,
    };
  }
}
