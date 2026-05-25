import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import { PatientPortalContextService } from './patient-portal-context.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class PatientPortalCommandService {
  private readonly logger = new Logger(PatientPortalCommandService.name);

  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly repository: IPatientPortalRepository,
    private readonly contextService: PatientPortalContextService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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
    data: { whatsappConsent?: boolean; dataStorageConsent?: boolean },
  ) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const updateData: Record<string, unknown> = {};
    if (data.whatsappConsent !== undefined) {
      updateData.whatsappConsent = data.whatsappConsent;
      updateData.whatsappConsentAt = this.clock.now();
    }

    const updated = await this.repository.updatePatient(patientId, updateData);
    const dataStorageConsent = await this.repository.hasActiveTreatmentConsent(
      patientId,
      clinicId,
    );

    return {
      whatsappConsent: updated.whatsappConsent,
      whatsappConsentAt: updated.whatsappConsentAt,
      isFirstLogin: false,
      dataStorageConsent,
    };
  }

  async requestDataDeletion(
    userId: string,
    _data: { reason: string; confirmDeletion?: boolean },
  ) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    this.logger.log('Patient requested data deletion');

    return {
      message:
        'Your data deletion request has been received. Our team will process it within 30 days per DPDP guidelines.',
      patientId,
      requestedAt: this.clock.now().toISOString(),
    };
  }
}
