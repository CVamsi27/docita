import { Injectable } from '@nestjs/common';
import type { Consent, ConsentType, Patient } from '@workspace/db';
import { ConsentComplianceService } from './consent-compliance.service';
import { DataSubjectRequestService } from './data-subject-request.service';
import type { ExportResult } from './factories/data-export.factory';
import type {
  ConsentRecord,
  DataSubjectRequest,
  DpdpNoticeConsentInput,
} from './dpdp-compliance.types';

export { DataSubjectRight } from './dpdp-compliance.types';

/**
 * Facade for DPDP compliance operations. Delegates to consent and data-subject services.
 */
@Injectable()
export class DPDPComplianceService {
  constructor(
    private readonly consentCompliance: ConsentComplianceService,
    private readonly dataSubjectRequests: DataSubjectRequestService,
  ) {}

  recordConsent(data: ConsentRecord, ipAddress?: string): Promise<Consent> {
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
    actorUserId?: string,
  ): Promise<Consent> {
    return this.consentCompliance.withdrawConsent(
      consentId,
      reason,
      withdrawnBy,
      ipAddress,
      clinicId,
      actorUserId,
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

  setDpdpNoticeConsent(
    input: Parameters<ConsentComplianceService['setDpdpNoticeConsent']>[0],
  ): Promise<{ active: boolean }> {
    return this.consentCompliance.setDpdpNoticeConsent(input);
  }

  setMarketingConsent(
    input: Parameters<ConsentComplianceService['setMarketingConsent']>[0],
  ): Promise<{ active: boolean }> {
    return this.consentCompliance.setMarketingConsent(input);
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
  ): Promise<ExportResult> {
    return this.dataSubjectRequests.handleAccessRequest(data, ipAddress);
  }

  handleCorrectionRequest(
    data: DataSubjectRequest & { corrections: Record<string, unknown> },
    ipAddress?: string,
  ): Promise<Patient> {
    return this.dataSubjectRequests.handleCorrectionRequest(data, ipAddress);
  }

  handleErasureRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<{ anonymized: true; patient: Patient }> {
    return this.dataSubjectRequests.handleErasureRequest(data, ipAddress);
  }

  handlePortabilityRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<ExportResult> {
    return this.dataSubjectRequests.handlePortabilityRequest(data, ipAddress);
  }
}
