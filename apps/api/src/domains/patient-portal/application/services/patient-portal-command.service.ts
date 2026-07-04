// jscpd:ignore-start
import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import { PatientPortalContextService } from './patient-portal-context.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ConsentType } from '@workspace/db';
import { DPDP_NOTICE_VERSION } from '@workspace/types';
import { DPDPComplianceService } from '@/shared/modules/compliance/dpdp-compliance.service';

@Injectable()
export class PatientPortalCommandService {
  private readonly logger = new Logger(PatientPortalCommandService.name);

  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly repository: IPatientPortalRepository,
    private readonly contextService: PatientPortalContextService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly dpdpService: DPDPComplianceService,
  ) {}

  async updateProfile(
    userId: string,
    data: {
      phoneNumber?: string;
      email?: string;
      address?: string;
      whatsappConsent?: boolean;
      preferredName?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
    },
  ) {
    const { patientId } = await this.contextService.getPatientContext(userId);
    // jscpd:ignore-end

    const updateData: Record<string, unknown> = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.preferredName !== undefined)
      updateData.preferredName = data.preferredName;
    if (data.emergencyContactName !== undefined)
      updateData.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined)
      updateData.emergencyContactPhone = data.emergencyContactPhone;
    if (data.emergencyContactRelation !== undefined)
      updateData.emergencyContactRelation = data.emergencyContactRelation;
    if (data.whatsappConsent !== undefined) {
      updateData.whatsappConsent = data.whatsappConsent;
      updateData.whatsappConsentAt = this.clock.now();
    }

    return this.repository.updatePatient(patientId, updateData);
  }

  async updateConsent(
    userId: string,
    data: {
      whatsappConsent?: boolean;
      dataStorageConsent?: boolean;
      marketingConsent?: boolean;
    },
  ) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const updateData: Record<string, unknown> = {};
    if (data.whatsappConsent !== undefined) {
      updateData.whatsappConsent = data.whatsappConsent;
      updateData.whatsappConsentAt = this.clock.now();
    }

    const updated = await this.repository.updatePatient(patientId, updateData);

    // Marketing consent as a first-class, auditable DPDP purpose (Stage 3).
    let marketingConsent: boolean;
    if (data.marketingConsent !== undefined) {
      const result = await this.dpdpService.setMarketingConsent({
        patientId,
        clinicId,
        granted: data.marketingConsent,
        actorUserId: userId,
        givenByName: 'Patient (portal)',
      });
      marketingConsent = result.active;
    } else {
      marketingConsent = await this.dpdpService.hasValidConsent(
        patientId,
        clinicId,
        ConsentType.MARKETING,
      );
    }

    // Persist the patient's DPDP data-storage decision as a DPDP_NOTICE
    // consent (previously this flag was accepted by the API and dropped).
    let dataStorageConsent: boolean;
    if (data.dataStorageConsent !== undefined) {
      const result = await this.dpdpService.setDpdpNoticeConsent({
        patientId,
        clinicId,
        granted: data.dataStorageConsent,
        noticeVersion: DPDP_NOTICE_VERSION,
        actorUserId: userId,
        givenByName: 'Patient (portal)',
      });
      dataStorageConsent = result.active;
    } else {
      dataStorageConsent = await this.dpdpService.hasValidConsent(
        patientId,
        clinicId,
        ConsentType.DPDP_NOTICE,
      );
    }

    return {
      whatsappConsent: updated.whatsappConsent,
      whatsappConsentAt: updated.whatsappConsentAt,
      isFirstLogin: false,
      dataStorageConsent,
      marketingConsent,
    };
  }

  async requestDataDeletion(
    userId: string,
    data: { reason: string; confirmDeletion?: boolean },
  ) {
    // Destructive intent — require explicit confirmation server-side, not just
    // in the UI (a direct API call must not skip it).
    if (data.confirmDeletion !== true) {
      throw new BadRequestException(
        'Data deletion must be explicitly confirmed.',
      );
    }

    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const request = await this.createPortalDataSubjectRequest({
      clinicId,
      patientId,
      requestType: 'DELETION',
      requestDetails: data.reason,
    });

    this.logger.log('Patient requested data deletion', {
      requestId: request.id,
    });

    return {
      message:
        'Your data deletion request has been received. Our team will process it within 30 days per DPDP guidelines.',
      patientId,
      requestId: request.id,
      requestedAt: this.clock.now().toISOString(),
    };
  }

  async requestDataExport(userId: string, data: { reason?: string }) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const request = await this.createPortalDataSubjectRequest({
      clinicId,
      patientId,
      requestType: 'EXPORT',
      requestDetails: data.reason,
    });

    this.logger.log('Patient requested data export', {
      requestId: request.id,
    });

    return {
      message:
        'Your data export request has been received. Our team will share a copy of your records within 30 days per DPDP guidelines.',
      patientId,
      requestId: request.id,
      requestedAt: this.clock.now().toISOString(),
    };
  }

  /**
   * DPDP data-subject requests raised from the patient portal land in the
   * clinic's compliance queue with a 30-day SLA (mirrors the staff-side
   * default in ClinicDataSubjectRequestService).
   */
  private createPortalDataSubjectRequest(input: {
    clinicId: string;
    patientId: string;
    requestType: 'DELETION' | 'EXPORT';
    requestDetails?: string;
  }) {
    const dueAt = new Date(
      this.clock.now().getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    return this.repository.createDataSubjectRequest({ ...input, dueAt });
  }
}
