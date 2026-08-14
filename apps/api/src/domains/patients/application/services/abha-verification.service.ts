// jscpd:ignore-start
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import {
  assertAbdmConfigured,
  assertClinicAbdmEnabled,
  persistAbhaVerification,
} from './abha-verification.helper';
// jscpd:ignore-end

/**
 * ABDM M1: verifies a patient's ABHA against the ABDM gateway and persists the
 * verification state. When ABDM is not configured the gateway returns
 * `ABDM_NOT_CONFIGURED` and this surfaces a 503 (feature dormant until
 * credentials are supplied) — no patient state is changed.
 */
@Injectable()
export class AbhaVerificationService {
  private readonly logger = new Logger(AbhaVerificationService.name);

  // jscpd:ignore-start
  constructor(
    @Inject(ABDM_GATEWAY) private readonly gateway: IAbdmGateway,
    @Inject(ABHA_VERIFICATION_STORE)
    private readonly store: IAbhaVerificationStore,
    private readonly auditService: AuditService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}
  // jscpd:ignore-end

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

    await assertClinicAbdmEnabled(this.store, clinicId);
    assertAbdmConfigured(this.gateway.isConfigured());

    const result = await this.gateway.verifyAbha(input);

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
      logContext: 'ABHA verification did not succeed',
    });
    // jscpd:ignore-end

    return result;
  }
}
