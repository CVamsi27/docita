import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class AnonymizationFactory {
  private readonly logger = new Logger(AnonymizationFactory.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Anonymize patient data
   * Replaces PII with anonymous placeholders
   */
  async anonymizePatient(patientId: string): Promise<any> {
    const randomId = `ANON-${Date.now()}`;

    this.logger.log(`Anonymizing patient ${patientId}`);

    return await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        firstName: 'Anonymous',
        lastName: 'Patient',
        email: `${randomId}@anonymized.local`,
        phoneNumber: '0000000000',
        address: null,
        dateOfBirth: new Date('1900-01-01'),
        emergencyContactName: null,
        emergencyContactPhone: null,
        whatsappConsent: false,
      },
    });
  }
}
