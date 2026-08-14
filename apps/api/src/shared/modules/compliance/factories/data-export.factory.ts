import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  DATA_EXPORT_PERSISTENCE_PORT,
  type DataExportPersistencePort,
} from '../ports/data-export.persistence.port';

export interface ExportResult {
  exportDate: string;
  format: string;
  version: string;
  patient: Record<string, unknown> | null;
}

@Injectable()
export class DataExportFactory {
  private readonly logger = new Logger(DataExportFactory.name);

  constructor(
    @Inject(DATA_EXPORT_PERSISTENCE_PORT)
    private readonly prisma: DataExportPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async exportPatientData(patientId: string): Promise<ExportResult> {
    this.logger.log('Exporting patient data');

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          include: {
            vitalSign: true,
            diagnoses: true,
            procedures: true,
          },
        },
        prescriptions: {
          include: {
            medications: true,
          },
        },
        documents: true,
        invoices: true,
        medicalConditions: true,
        patientAllergies: true,
        familyHistory: true,
        socialHistory: true,
        surgicalHistory: true,
        immunizations: true,
        // DPDP right-to-access must return the whole record, not a subset.
        medicalDocuments: true,
        admissions: true,
        labTestOrders: true,
        abdmExternalRecords: true,
      },
    });

    return {
      exportDate: this.clock.now().toISOString(),
      format: 'JSON',
      version: '1.0',
      patient,
    };
  }
}
