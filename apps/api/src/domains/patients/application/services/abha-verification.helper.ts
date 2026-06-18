import type { Logger } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import type { AbhaVerificationResult } from '@workspace/types';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { AuditService } from '@/shared/modules/audit/audit/audit.service';
import type { IAbhaVerificationStore } from '@/domains/patients/core/ports/abha-verification.port';

/**
 * Persist a successful ABHA verification result and emit an audit entry.
 * Shared by both the mobile-OTP and gateway verification flows so the
 * save + audit block stays in one place.
 */
const ABDM_NOT_CONFIGURED_MSG =
  'ABDM integration is not enabled for this environment yet. ' +
  'ABHA was captured but cannot be verified until ABDM credentials are configured.';

const ABDM_TENANT_DISABLED_MSG =
  'ABDM is turned off for this facility. Enable ABDM in settings after credentials are available.';

export function assertAbdmConfigured(isConfigured: boolean): void {
  if (!isConfigured) {
    throw new ServiceUnavailableException({
      message: ABDM_NOT_CONFIGURED_MSG,
      code: 'ABDM_NOT_CONFIGURED',
    });
  }
}

export async function assertClinicAbdmEnabled(
  store: IAbhaVerificationStore,
  clinicId: string,
): Promise<void> {
  if (await store.isClinicAbdmEnabled(clinicId)) return;
  throw new ServiceUnavailableException({
    message: ABDM_TENANT_DISABLED_MSG,
    code: 'ABDM_TENANT_DISABLED',
  });
}

export async function persistAbhaVerification(params: {
  result: AbhaVerificationResult;
  patientId: string;
  clinicId: string;
  patientAbhaAddress: string | null;
  actorUserId: string;
  store: IAbhaVerificationStore;
  auditService: AuditService;
  clock: IClock;
  logger: Logger;
  logContext: string;
}): Promise<void> {
  const {
    result,
    patientId,
    clinicId,
    patientAbhaAddress,
    actorUserId,
    store,
    auditService,
    clock,
    logger,
    logContext,
  } = params;

  if (result.verified) {
    await store.saveVerification(patientId, clinicId, {
      abhaAddress: result.abhaAddress ?? patientAbhaAddress,
      abhaNumber: result.abhaNumber,
      abhaKycName: result.kycName,
      abhaVerifiedAt: clock.now(),
    });

    await auditService.logAction({
      clinicId,
      userId: actorUserId,
      actionType: 'ABHA_VERIFIED',
      resourceType: 'Patient',
      resourceId: patientId,
    });
  } else {
    logger.warn(logContext, {
      error: result.error ?? 'unknown',
    });
  }
}
