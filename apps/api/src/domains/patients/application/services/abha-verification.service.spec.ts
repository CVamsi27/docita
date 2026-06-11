import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type {
  IAbdmGateway,
  IAbhaVerificationStore,
} from '@/domains/patients/core/ports/abha-verification.port';
import type { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { AbhaVerificationService } from './abha-verification.service';

describe('AbhaVerificationService', () => {
  const NOW = new Date('2026-06-11T00:00:00.000Z');

  const isConfigured = jest.fn<IAbdmGateway['isConfigured']>();
  const verifyAbha = jest.fn<IAbdmGateway['verifyAbha']>();
  const gateway = { isConfigured, verifyAbha } as IAbdmGateway;

  const findPatientForVerification =
    jest.fn<IAbhaVerificationStore['findPatientForVerification']>();
  const saveVerification =
    jest.fn<IAbhaVerificationStore['saveVerification']>();
  const store = {
    findPatientForVerification,
    saveVerification,
  } as IAbhaVerificationStore;

  const logAction = jest.fn<AuditService['logAction']>();
  const audit = { logAction } as unknown as AuditService;

  const service = new AbhaVerificationService(gateway, store, audit, {
    now: () => NOW,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findPatientForVerification.mockResolvedValue({
      id: 'pat-1',
      abhaAddress: 'asha.verma@abdm',
    });
    saveVerification.mockResolvedValue(undefined);
    logAction.mockResolvedValue(undefined);
  });

  it('throws NotFound when the patient is not in the clinic', async () => {
    findPatientForVerification.mockResolvedValue(null);
    await expect(
      service.verifyForPatient('pat-x', 'clinic-1', {}, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns 503 when ABDM is not configured (no state change)', async () => {
    isConfigured.mockReturnValue(false);
    await expect(
      service.verifyForPatient(
        'pat-1',
        'clinic-1',
        { abhaAddress: 'asha.verma@abdm' },
        'user-1',
      ),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(verifyAbha).not.toHaveBeenCalled();
    expect(saveVerification).not.toHaveBeenCalled();
  });

  it('persists and audits a successful verification', async () => {
    isConfigured.mockReturnValue(true);
    verifyAbha.mockResolvedValue({
      verified: true,
      abhaAddress: 'asha.verma@abdm',
      abhaNumber: '12345678901234',
      kycName: 'Asha Verma',
      verifiedAt: NOW.toISOString(),
      error: null,
    });

    const result = await service.verifyForPatient(
      'pat-1',
      'clinic-1',
      { abhaNumber: '1234-5678-9012-3456' },
      'user-1',
    );

    expect(result.verified).toBe(true);
    expect(saveVerification).toHaveBeenCalledWith('pat-1', 'clinic-1', {
      abhaAddress: 'asha.verma@abdm',
      abhaNumber: '12345678901234',
      abhaKycName: 'Asha Verma',
      abhaVerifiedAt: NOW,
    });
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ABHA_VERIFIED',
        resourceType: 'Patient',
        resourceId: 'pat-1',
      }),
    );
  });

  it('does not persist when the gateway reports not verified', async () => {
    isConfigured.mockReturnValue(true);
    verifyAbha.mockResolvedValue({
      verified: false,
      abhaAddress: null,
      abhaNumber: null,
      kycName: null,
      verifiedAt: null,
      error: 'ABDM_VERIFY_FAILED_404',
    });

    const result = await service.verifyForPatient(
      'pat-1',
      'clinic-1',
      { abhaAddress: 'asha.verma@abdm' },
      'user-1',
    );

    expect(result.verified).toBe(false);
    expect(saveVerification).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });
});
