import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(
    clinicId: string,
    options: { limit?: number; patientId?: string; type?: string },
  ) {
    return this.prisma.whatsappLog.findMany({
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
    const totalPatients = await this.prisma.patient.count({
      where: { clinicId },
    });

    const subscribers = await this.prisma.patient.count({
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
