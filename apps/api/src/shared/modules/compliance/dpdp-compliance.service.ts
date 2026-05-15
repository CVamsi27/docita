import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  ConsentType,
  ConsentStatus,
  InvoiceStatus,
  AppointmentStatus,
} from '@workspace/db';
import { AnonymizationFactory } from './factories/anonymization.factory';
import { DataExportFactory } from './factories/data-export.factory';

export enum DataSubjectRight {
  ERASURE = 'ERASURE',
}

interface ConsentRecord {
  patientId: string;
  clinicId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  purpose: string;
  givenBy?: string;
  givenAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

interface DataSubjectRequest {
  patientId: string;
  clinicId: string;
  requestType: DataSubjectRight;
  reason?: string;
  requestedBy: string;
  metadata?: Record<string, unknown>;
}

function getRequireConsentBeforeSending(value: unknown): boolean | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const consentFlag = (value as { requireConsentBeforeSending?: unknown })
    .requireConsentBeforeSending;
  return typeof consentFlag === 'boolean' ? consentFlag : undefined;
}

@Injectable()
export class DPDPComplianceService {
  private readonly logger = new Logger(DPDPComplianceService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private anonymizationFactory: AnonymizationFactory,
    private dataExportFactory: DataExportFactory,
  ) {}

  async recordConsent(
    data: ConsentRecord,
    ipAddress?: string,
  ): Promise<unknown> {
    const consent = await this.prisma.consent.create({
      data: {
        patientId: data.patientId,
        clinicId: data.clinicId,
        consentType: data.consentType,
        status: data.status,
        givenBy: data.givenBy,
        givenAt: data.givenAt || new Date(),
        validFrom: new Date(),
        validUntil: data.expiresAt,
      },
    });

    await this.auditService.logAction({
      userId: data.patientId,
      clinicId: data.clinicId,
      actionType: 'CONSENT_RECORDED',
      resourceType: 'Consent',
      resourceId: consent.id,
      metadata: {
        consentType: data.consentType,
        status: data.status,
        purpose: data.purpose,
      },
      ipAddress,
    });

    this.logger.log('Consent recorded');

    return consent;
  }

  /**
   * Record a DPDP Act, 2023 notice consent at point of patient capture.
   *
   * Persists the full audit set (templateVersion, ipAddress, userAgent,
   * createdBy, givenBy/Relation) so the clinic can always prove which
   * notice the patient agreed to, when, and over what network context.
   */
  async recordDpdpNoticeConsent(input: {
    patientId: string;
    clinicId: string;
    noticeVersion: string;
    givenByName?: string;
    givenByRelation?: string;
    createdBy?: string;
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
  }): Promise<{ id: string }> {
    const consent = await this.prisma.consent.create({
      data: {
        patientId: input.patientId,
        clinicId: input.clinicId,
        consentType: ConsentType.DPDP_NOTICE,
        status: ConsentStatus.ACTIVE,
        givenBy: input.givenByName,
        givenByRelation: input.givenByRelation,
        givenAt: new Date(),
        validFrom: new Date(),
        templateVersion: input.noticeVersion,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        createdBy: input.createdBy,
        notes: input.notes,
      },
      select: { id: true },
    });

    await this.auditService.logAction({
      userId: input.createdBy ?? input.patientId,
      clinicId: input.clinicId,
      actionType: 'CONSENT_RECORDED',
      resourceType: 'Consent',
      resourceId: consent.id,
      metadata: {
        consentType: ConsentType.DPDP_NOTICE,
        noticeVersion: input.noticeVersion,
        givenByRelation: input.givenByRelation,
      },
      ipAddress: input.ipAddress,
    });

    return consent;
  }

  async withdrawConsent(
    consentId: string,
    reason: string,
    withdrawnBy: string,
    ipAddress?: string,
    clinicId?: string,
  ): Promise<unknown> {
    if (clinicId) {
      const existing = await this.prisma.consent.findFirst({
        where: { id: consentId, clinicId },
      });
      if (!existing) {
        throw new NotFoundException('Consent record not found');
      }
    }

    const consent = await this.prisma.consent.update({
      where: { id: consentId },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: withdrawnBy,
        revokedReason: reason,
      },
    });

    await this.auditService.logAction({
      userId: withdrawnBy,
      clinicId: consent.clinicId,
      actionType: 'CONSENT_WITHDRAWN',
      resourceType: 'Consent',
      resourceId: consent.id,
      metadata: {
        consentType: consent.consentType,
        reason,
        withdrawnBy,
      },
      ipAddress,
    });

    this.logger.log(`Consent withdrawn: ${consentId} by: ${withdrawnBy}`);

    return consent;
  }

  async hasValidConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType,
  ): Promise<boolean> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        patientId,
        clinicId,
        consentType,
        status: ConsentStatus.ACTIVE,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
    });

    return !!consent;
  }

  async handleAccessRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<unknown> {
    const patientData = await this.dataExportFactory.exportPatientData(
      data.patientId,
    );

    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_ACCESS_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        requestType: data.requestType,
        reason: data.reason,
      },
      ipAddress,
    });

    this.logger.log('Access request processed for patient data');

    return patientData;
  }

  async handleCorrectionRequest(
    data: DataSubjectRequest & { corrections: Record<string, unknown> },
    ipAddress?: string,
  ): Promise<unknown> {
    const updatedPatient = await this.prisma.patient.update({
      where: { id: data.patientId },
      data: data.corrections,
    });

    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_CORRECTION_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        corrections: data.corrections,
        reason: data.reason,
      },
      ipAddress,
    });

    this.logger.log('Correction request processed for patient data');

    return updatedPatient;
  }

  async handleErasureRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<unknown> {
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

    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_ERASURE_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        reason: data.reason,
        anonymized: true,
      },
      ipAddress,
    });

    this.logger.log('Erasure request processed for patient data');

    return { anonymized: true, patient: anonymizedPatient };
  }

  async handlePortabilityRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<unknown> {
    const exportData = await this.dataExportFactory.exportPatientData(
      data.patientId,
    );

    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_PORTABILITY_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        format: 'JSON',
        recordCount: exportData.patient ? 1 : 0,
      },
      ipAddress,
    });

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
        startTime: { gte: new Date() },
        status: { not: AppointmentStatus.CANCELLED },
      },
    });

    if (futureAppointments > 0) {
      obligations.push(`${futureAppointments} future appointments`);
    }

    return obligations;
  }

  async getConsentHistory(
    patientId: string,
    clinicId: string,
  ): Promise<unknown[]> {
    return await this.prisma.consent.findMany({
      where: {
        patientId,
        clinicId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async validateWhatsAppConsent(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    const requireConsentBeforeSending = getRequireConsentBeforeSending(
      clinic?.whatsappAutomation,
    );

    if (!requireConsentBeforeSending) {
      return true;
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { whatsappConsent: true, whatsappConsentAt: true },
    });

    return patient?.whatsappConsent || false;
  }
}
