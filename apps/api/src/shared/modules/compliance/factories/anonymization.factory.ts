import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Patient } from '@workspace/db';
import {
  ANONYMIZATION_PERSISTENCE_PORT,
  type AnonymizationPersistencePort,
} from '../ports/anonymization.persistence.port';

@Injectable()
export class AnonymizationFactory {
  private readonly logger = new Logger(AnonymizationFactory.name);

  constructor(
    @Inject(ANONYMIZATION_PERSISTENCE_PORT)
    private readonly prisma: AnonymizationPersistencePort,
  ) {}

  async anonymizePatient(patientId: string): Promise<Patient> {
    const randomId = `ANON-${Date.now()}`;

    this.logger.log('Anonymizing patient record');

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
