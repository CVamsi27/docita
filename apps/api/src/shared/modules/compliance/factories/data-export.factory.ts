import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';

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
    private prisma: PrismaService,
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
        immunizations: true,
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
