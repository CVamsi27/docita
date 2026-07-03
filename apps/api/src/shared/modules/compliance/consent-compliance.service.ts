import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { ConsentStatus, ConsentType } from '@workspace/db';
import { DpdpAuditEmitter } from './dpdp-audit.emitter';
import { isRecord } from '@workspace/utils';
import type {
  ConsentRecord,
  DpdpNoticeConsentInput,
} from './dpdp-compliance.types';

function getRequireConsentBeforeSending(value: unknown): boolean | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const consentFlag = value.requireConsentBeforeSending;
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
        userId: data.actorUserId ?? data.patientId,
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
    actorUserId?: string,
  ): Promise<unknown> {
    if (clinicId) {
      const existing = await this.prisma.consent.findFirst({
        where: { id: consentId, clinicId },
      });
      if (!existing) throw new NotFoundException('Consent record not found');
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

    // Cascade: withdrawing the overarching DPDP data-processing consent must
    // actually stop downstream non-essential processing, not just flip a status.
    // Clear the WhatsApp opt-in so message send paths (which gate on
    // Patient.whatsappConsent) immediately honor the withdrawal.
    if (consent.consentType === ConsentType.DPDP_NOTICE && consent.patientId) {
      await this.prisma.patient.updateMany({
        where: { id: consent.patientId, clinicId: consent.clinicId },
        data: { whatsappConsent: false, whatsappConsentAt: null },
      });
    }

    await this.dpdpAudit.logConsentWithdrawn(
      {
        userId: actorUserId ?? withdrawnBy,
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

  /**
   * Idempotently sets the patient's DPDP data-processing consent
   * (`DPDP_NOTICE`). Granting records a fresh notice consent only when none is
   * active; revoking withdraws the active one. Used by the patient portal so a
   * patient's own consent toggle is persisted and audited (previously dropped).
   */
  async setDpdpNoticeConsent(input: {
    patientId: string;
    clinicId: string;
    granted: boolean;
    noticeVersion: string;
    actorUserId?: string;
    givenByName?: string;
  }): Promise<{ active: boolean }> {
    const existing = await this.prisma.consent.findFirst({
      where: {
        patientId: input.patientId,
        clinicId: input.clinicId,
        consentType: ConsentType.DPDP_NOTICE,
        status: ConsentStatus.ACTIVE,
        OR: [{ validUntil: null }, { validUntil: { gte: this.clock.now() } }],
      },
      select: { id: true },
    });

    if (input.granted) {
      if (!existing) {
        await this.recordDpdpNoticeConsent({
          patientId: input.patientId,
          clinicId: input.clinicId,
          noticeVersion: input.noticeVersion,
          givenByName: input.givenByName,
          createdBy: input.actorUserId,
        });
      }
      return { active: true };
    }

    if (existing) {
      await this.withdrawConsent(
        existing.id,
        'Withdrawn by patient via portal',
        input.givenByName ?? 'Patient (portal)',
        undefined,
        input.clinicId,
        input.actorUserId,
      );
    }
    return { active: false };
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

    if (!requireConsentBeforeSending) return true;

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { whatsappConsent: true, whatsappConsentAt: true },
    });

    return patient?.whatsappConsent || false;
  }
}
