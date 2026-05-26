import { Injectable } from '@nestjs/common';
import type { ConsentType } from '@workspace/db';
import { ConsentComplianceService } from './consent-compliance.service';
import { DataSubjectRequestService } from './data-subject-request.service';
import type {
  ConsentRecord,
  DataSubjectRequest,
  DpdpNoticeConsentInput,
} from './dpdp-compliance.types';

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

/**
 * Facade for DPDP compliance operations. Delegates to consent and data-subject services.
 */
@Injectable()
export class DPDPComplianceService {
  constructor(
    private readonly consentCompliance: ConsentComplianceService,
    private readonly dataSubjectRequests: DataSubjectRequestService,
  ) {}

  recordConsent(data: ConsentRecord, ipAddress?: string): Promise<unknown> {
    return this.consentCompliance.recordConsent(data, ipAddress);
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
    return this.consentCompliance.withdrawConsent(
      consentId,
      reason,
      withdrawnBy,
      ipAddress,
      clinicId,
    );
  }

  hasValidConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType,
  ): Promise<boolean> {
    return this.consentCompliance.hasValidConsent(
      patientId,
      clinicId,
      consentType,
    );
  }

  getConsentHistory(patientId: string, clinicId: string): Promise<unknown[]> {
    return this.consentCompliance.getConsentHistory(patientId, clinicId);
  }

  validateWhatsAppConsent(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    return this.consentCompliance.validateWhatsAppConsent(patientId, clinicId);
  }

  handleAccessRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<unknown> {
    return this.dataSubjectRequests.handleAccessRequest(data, ipAddress);
  }

  handleCorrectionRequest(
    data: DataSubjectRequest & { corrections: Record<string, unknown> },
    ipAddress?: string,
  ): Promise<unknown> {
    return this.dataSubjectRequests.handleCorrectionRequest(data, ipAddress);
  }

  handleErasureRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<unknown> {
    return this.dataSubjectRequests.handleErasureRequest(data, ipAddress);
  }

  handlePortabilityRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<unknown> {
    return this.dataSubjectRequests.handlePortabilityRequest(data, ipAddress);
  }
}
