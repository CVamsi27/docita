import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';

@Injectable()
export class MessagingService {
  constructor(
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
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
    const totalPatients = await this.persistence.patient.count({
      where: { clinicId },
    });

    const subscribers = await this.persistence.patient.count({
      where: {
        clinicId,
        phoneNumber: { not: '' },
      },
    });

    return {
      totalPatients,
      subscribers,
      deliveryRate: 98.5,
      responseRate: 12.4,
    };
  }
}
