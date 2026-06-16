import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AbhaVerificationResult } from '@workspace/types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { AbdmAbhaClient } from '@/domains/abdm/infrastructure/abdm-abha.client';
import {
  ABHA_VERIFICATION_STORE,
  type IAbhaVerificationStore,
} from '@/domains/patients/core/ports/abha-verification.port';

/**
 * ABDM M1: mobile → OTP verification flow against the ABHA sandbox
 * (`abhasbx.abdm.gov.in`). The flow is stateful across three calls:
 *   1. search by mobile → masked accounts + txnId
 *   2. request OTP for a chosen account index → txnId
 *   3. verify OTP → persisted {@link AbhaVerificationResult}
 */
@Injectable()
export class AbhaMobileVerificationService {
  private readonly logger = new Logger(AbhaMobileVerificationService.name);

  constructor(
    private readonly abhaClient: AbdmAbhaClient,
    @Inject(ABHA_VERIFICATION_STORE)
    private readonly store: IAbhaVerificationStore,
    private readonly auditService: AuditService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async searchByMobile(patientId: string, clinicId: string, mobile: string) {
    await this.assertClinicAbdmEnabled(clinicId);
    this.assertConfigured();

    return this.abhaClient.searchByMobile(mobile);
  }

  async requestOtp(
    patientId: string,
    clinicId: string,
    txnId: string,
    index: number,
  ) {
    await this.assertClinicAbdmEnabled(clinicId);
    this.assertConfigured();

    return this.abhaClient.requestOtp(txnId, index);
  }

  async verifyOtp(
    patientId: string,
    clinicId: string,
    txnId: string,
    otp: string,
    actorUserId: string,
  ): Promise<AbhaVerificationResult> {
    await this.assertClinicAbdmEnabled(clinicId);
    this.assertConfigured();

    const patient = await this.store.findPatientForVerification(
      patientId,
      clinicId,
    );
    if (!patient) {
      throw new NotFoundException('Patient was not found in this clinic');
    }

    const result = await this.abhaClient.verifyOtp(txnId, otp);

    if (result.verified) {
      await this.store.saveVerification(patientId, clinicId, {
        abhaAddress: result.abhaAddress ?? patient.abhaAddress,
        abhaNumber: result.abhaNumber,
        abhaKycName: result.kycName,
        abhaVerifiedAt: this.clock.now(),
      });

      await this.auditService.logAction({
        clinicId,
        userId: actorUserId,
        actionType: 'ABHA_VERIFIED',
        resourceType: 'Patient',
        resourceId: patientId,
      });
    } else {
      this.logger.warn('ABHA OTP verification did not succeed', {
        error: result.error ?? 'unknown',
      });
    }

    return result;
  }

  private assertConfigured(): void {
    if (!this.abhaClient.isConfigured()) {
      throw new ServiceUnavailableException({
        message:
          'ABDM integration is not enabled for this environment yet. ' +
          'ABHA was captured but cannot be verified until ABDM credentials are configured.',
        code: 'ABDM_NOT_CONFIGURED',
      });
    }
  }

  private async assertClinicAbdmEnabled(clinicId: string): Promise<void> {
    if (await this.store.isClinicAbdmEnabled(clinicId)) return;
    throw new ServiceUnavailableException({
      message:
        'ABDM is turned off for this facility. Enable ABDM in settings after credentials are available.',
      code: 'ABDM_TENANT_DISABLED',
    });
  }
}
