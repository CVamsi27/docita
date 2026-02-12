import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Handles WhatsApp messaging and analytics queries
 */
@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get WhatsApp message logs for a clinic
   */
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

  /**
   * Get WhatsApp statistics for the clinic
   */
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
      deliveryRate: 98.5, // Mock data for now
      responseRate: 12.4, // Mock data for now
    };
  }
}
