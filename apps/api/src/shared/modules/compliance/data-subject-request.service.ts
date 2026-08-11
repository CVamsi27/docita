import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentStatus, InvoiceStatus, Patient } from '@workspace/db';
import { AnonymizationFactory } from './factories/anonymization.factory';
import {
  DataExportFactory,
  type ExportResult,
} from './factories/data-export.factory';
import { DpdpAuditEmitter } from './dpdp-audit.emitter';
import type { DataSubjectRequest } from './dpdp-compliance.types';

@Injectable()
export class DataSubjectRequestService {
  private readonly logger = new Logger(DataSubjectRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dpdpAudit: DpdpAuditEmitter,
    private readonly anonymizationFactory: AnonymizationFactory,
    private readonly dataExportFactory: DataExportFactory,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async handleAccessRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<ExportResult> {
    const patientData = await this.dataExportFactory.exportPatientData(
      data.patientId,
    );

    await this.dpdpAudit.logDataAccessRequest(
      {
        userId: data.requestedBy,
        clinicId: data.clinicId,
        resourceType: 'Patient',
        resourceId: data.patientId,
        ipAddress,
      },
      {
        requestType: data.requestType,
        reason: data.reason,
      },
    );

    this.logger.log('Access request processed for patient data');

    return patientData;
  }

  async handleCorrectionRequest(
    data: DataSubjectRequest & { corrections: Record<string, unknown> },
    ipAddress?: string,
  ): Promise<Patient> {
    const updatedPatient = await this.prisma.patient.update({
      where: { id: data.patientId },
      data: data.corrections,
    });

    await this.dpdpAudit.logDataCorrectionRequest(
      {
        userId: data.requestedBy,
        clinicId: data.clinicId,
        resourceType: 'Patient',
        resourceId: data.patientId,
        ipAddress,
      },
      {
        corrections: data.corrections,
        reason: data.reason,
      },
    );

    this.logger.log('Correction request processed for patient data');

    return updatedPatient;
  }

  async handleErasureRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<{ anonymized: true; patient: Patient }> {
    const pendingObligations = await this.checkPendingObligations(
      data.patientId,
    );

    if (pendingObligations.length > 0) {
      throw new BadRequestException(
        `Cannot delete patient due to pending obligations: ${pendingObligations.join(', ')}`,
      );
    }

    const anonymizedPatient = await this.anonymizationFactory.anonymizePatient(
      data.patientId,
    );

    await this.dpdpAudit.logDataErasureRequest(
      {
        userId: data.requestedBy,
        clinicId: data.clinicId,
        resourceType: 'Patient',
        resourceId: data.patientId,
        ipAddress,
      },
      {
        reason: data.reason,
        anonymized: true,
      },
    );

    this.logger.log('Erasure request processed for patient data');

    return { anonymized: true, patient: anonymizedPatient };
  }

  async handlePortabilityRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<ExportResult> {
    const exportData = await this.dataExportFactory.exportPatientData(
      data.patientId,
    );

    await this.dpdpAudit.logDataPortabilityRequest(
      {
        userId: data.requestedBy,
        clinicId: data.clinicId,
        resourceType: 'Patient',
        resourceId: data.patientId,
        ipAddress,
      },
      {
        format: 'JSON',
        recordCount: exportData.patient ? 1 : 0,
      },
    );

    this.logger.log('Portability request processed for patient data');

    return exportData;
  }

  private async checkPendingObligations(patientId: string): Promise<string[]> {
    const obligations: string[] = [];

    const unpaidInvoices = await this.prisma.invoice.count({
      where: {
        patientId,
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE] },
      },
    });

    if (unpaidInvoices > 0) {
      obligations.push(`${unpaidInvoices} unpaid invoices`);
    }

    const futureAppointments = await this.prisma.appointment.count({
      where: {
        patientId,
        startTime: { gte: this.clock.now() },
        status: { not: AppointmentStatus.CANCELLED },
      },
    });

    if (futureAppointments > 0) {
      obligations.push(`${futureAppointments} future appointments`);
    }

    return obligations;
  }
}
