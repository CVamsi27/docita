import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  AbhaVerificationResult,
  VerifyAbhaRequest,
} from '@workspace/types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  ABDM_GATEWAY,
  ABHA_VERIFICATION_STORE,
  type IAbdmGateway,
  type IAbhaVerificationStore,
} from '@/domains/patients/core/ports/abha-verification.port';

/**
 * ABDM M1: verifies a patient's ABHA against the ABDM gateway and persists the
 * verification state. When ABDM is not configured the gateway returns
 * `ABDM_NOT_CONFIGURED` and this surfaces a 503 (feature dormant until
 * credentials are supplied) — no patient state is changed.
 */
@Injectable()
export class AbhaVerificationService {
  private readonly logger = new Logger(AbhaVerificationService.name);

  constructor(
    @Inject(ABDM_GATEWAY) private readonly gateway: IAbdmGateway,
    @Inject(ABHA_VERIFICATION_STORE)
    private readonly store: IAbhaVerificationStore,
    private readonly auditService: AuditService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async verifyForPatient(
    patientId: string,
    clinicId: string,
    input: VerifyAbhaRequest,
    actorUserId: string,
  ): Promise<AbhaVerificationResult> {
    const patient = await this.store.findPatientForVerification(
      patientId,
      clinicId,
    );
    if (!patient) {
      throw new NotFoundException('Patient was not found in this clinic');
    }

    if (!(await this.store.isClinicAbdmEnabled(clinicId))) {
      throw new ServiceUnavailableException({
        message:
          'ABDM is turned off for this facility. Enable ABDM in settings after credentials are available.',
        code: 'ABDM_TENANT_DISABLED',
      });
    }

    if (!this.gateway.isConfigured()) {
      throw new ServiceUnavailableException({
        message:
          'ABDM integration is not enabled for this environment yet. ' +
          'ABHA was captured but cannot be verified until ABDM credentials are configured.',
        code: 'ABDM_NOT_CONFIGURED',
      });
    }

    const result = await this.gateway.verifyAbha(input);

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
      this.logger.warn('ABHA verification did not succeed', {
        error: result.error ?? 'unknown',
      });
    }

    return result;
  }
}
