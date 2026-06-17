// jscpd:ignore-start
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AbhaVerificationResult } from '@workspace/types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  ABDM_GATEWAY,
  ABHA_VERIFICATION_STORE,
  type IAbdmGateway,
  type IAbhaVerificationStore,
} from '@/domains/patients/core/ports/abha-verification.port';
import {
  assertAbdmConfigured,
  assertClinicAbdmEnabled,
  persistAbhaVerification,
} from './abha-verification.helper';
// jscpd:ignore-end

/**
 * ABDM M1: mobile → OTP verification flow against the ABHA sandbox
 * (`abhasbx.abdm.gov.in`). The flow is stateful across two calls:
 *   1. request OTP with mobile → txnId
 *   2. verify OTP → persisted {@link AbhaVerificationResult}
 */
@Injectable()
export class AbhaMobileVerificationService {
  private readonly logger = new Logger(AbhaMobileVerificationService.name);

  // jscpd:ignore-start
  constructor(
    @Inject(ABDM_GATEWAY) private readonly gateway: IAbdmGateway,
    @Inject(ABHA_VERIFICATION_STORE)
    private readonly store: IAbhaVerificationStore,
    private readonly auditService: AuditService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}
  // jscpd:ignore-end

  async requestOtp(patientId: string, clinicId: string, mobile: string) {
    await assertClinicAbdmEnabled(this.store, clinicId);
    assertAbdmConfigured(this.gateway.isConfigured());

    return this.gateway.requestOtp(mobile);
  }

  async verifyOtp(
    patientId: string,
    clinicId: string,
    txnId: string,
    otp: string,
    actorUserId: string,
  ): Promise<AbhaVerificationResult> {
    await assertClinicAbdmEnabled(this.store, clinicId);
    assertAbdmConfigured(this.gateway.isConfigured());

    const patient = await this.store.findPatientForVerification(
      patientId,
      clinicId,
    );
    if (!patient) {
      throw new NotFoundException('Patient was not found in this clinic');
    }

    const result = await this.gateway.verifyOtp(txnId, otp);

    // jscpd:ignore-start
    await persistAbhaVerification({
      result,
      patientId,
      clinicId,
      patientAbhaAddress: patient.abhaAddress,
      actorUserId,
      store: this.store,
      auditService: this.auditService,
      clock: this.clock,
      logger: this.logger,
      logContext: 'ABHA OTP verification did not succeed',
    });
    // jscpd:ignore-end

    return result;
  }
}
