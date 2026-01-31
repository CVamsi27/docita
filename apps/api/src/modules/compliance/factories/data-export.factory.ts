import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface ExportResult {
  exportDate: string;
  format: string;
  version: string;
  patient: any;
}

@Injectable()
export class DataExportFactory {
  private readonly logger = new Logger(DataExportFactory.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Export patient data in portable format
   */
  async exportPatientData(patientId: string): Promise<ExportResult> {
    this.logger.log(`Exporting data for patient ${patientId}`);

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
        immunizations: true,
      },
    });

    return {
      exportDate: new Date().toISOString(),
      format: 'JSON',
      version: '1.0',
      patient: patient,
    };
  }
}
