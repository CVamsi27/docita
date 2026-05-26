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

  recordDpdpNoticeConsent(
    input: DpdpNoticeConsentInput,
  ): Promise<{ id: string }> {
    return this.consentCompliance.recordDpdpNoticeConsent(input);
  }

  withdrawConsent(
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
