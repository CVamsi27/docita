import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { ConsentStatus, ConsentType } from '@workspace/db';
import { DpdpAuditEmitter } from './dpdp-audit.emitter';
import type {
  ConsentRecord,
  DpdpNoticeConsentInput,
} from './dpdp-compliance.types';

function getRequireConsentBeforeSending(value: unknown): boolean | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const consentFlag = (value as { requireConsentBeforeSending?: unknown })
    .requireConsentBeforeSending;
  return typeof consentFlag === 'boolean' ? consentFlag : undefined;
}

@Injectable()
export class ConsentComplianceService {
  private readonly logger = new Logger(ConsentComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dpdpAudit: DpdpAuditEmitter,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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
        givenAt: data.givenAt || this.clock.now(),
        validFrom: this.clock.now(),
        validUntil: data.expiresAt,
      },
    });

    await this.dpdpAudit.logConsentRecorded(
      {
        userId: data.patientId,
        clinicId: data.clinicId,
        resourceType: 'Consent',
        resourceId: consent.id,
        ipAddress,
      },
      {
        consentType: data.consentType,
        status: data.status,
        purpose: data.purpose,
      },
    );

    this.logger.log('Consent recorded');

    return consent;
  }

  async recordDpdpNoticeConsent(
    input: DpdpNoticeConsentInput,
  ): Promise<{ id: string }> {
    const consent = await this.prisma.consent.create({
      data: {
        patientId: input.patientId,
        clinicId: input.clinicId,
        consentType: ConsentType.DPDP_NOTICE,
        status: ConsentStatus.ACTIVE,
        givenBy: input.givenByName,
        givenByRelation: input.givenByRelation,
        givenAt: this.clock.now(),
        validFrom: this.clock.now(),
        templateVersion: input.noticeVersion,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        createdBy: input.createdBy,
        notes: input.notes,
      },
      select: { id: true },
    });

    await this.dpdpAudit.logConsentRecorded(
      {
        userId: input.createdBy ?? input.patientId,
        clinicId: input.clinicId,
        resourceType: 'Consent',
        resourceId: consent.id,
        ipAddress: input.ipAddress,
      },
      {
        consentType: ConsentType.DPDP_NOTICE,
        status: ConsentStatus.ACTIVE,
        noticeVersion: input.noticeVersion,
        givenByRelation: input.givenByRelation,
      },
    );

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
        revokedAt: this.clock.now(),
        revokedBy: withdrawnBy,
        revokedReason: reason,
      },
    });

    await this.dpdpAudit.logConsentWithdrawn(
      {
        userId: withdrawnBy,
        clinicId: consent.clinicId,
        resourceType: 'Consent',
        resourceId: consent.id,
        ipAddress,
      },
      {
        consentType: consent.consentType,
        reason,
        withdrawnBy,
      },
    );

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
        OR: [{ validUntil: null }, { validUntil: { gte: this.clock.now() } }],
      },
    });

    return !!consent;
  }

  async getConsentHistory(
    patientId: string,
    clinicId: string,
  ): Promise<unknown[]> {
    return this.prisma.consent.findMany({
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
