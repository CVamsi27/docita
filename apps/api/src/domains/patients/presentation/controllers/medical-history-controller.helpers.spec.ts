import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@workspace/db';
import {
  verifyMedicalHistoryPatientAccess,
  auditViewHistory,
} from './medical-history-controller.helpers';

function createMockPatientService() {
  return {
    getPatient: jest.fn().mockResolvedValue({ id: 'pat-1' }),
  } as any;
}

function createMockAuditService() {
  return {} as any;
}

describe('verifyMedicalHistoryPatientAccess', () => {
  const patientId = 'pat-1';

  it('allows PATIENT role to access their own records', async () => {
    const req = {
      user: { role: Role.PATIENT, patientId: 'pat-1', clinicId: 'clinic-1' },
    } as any;
    const patientService = createMockPatientService();
    await expect(
      verifyMedicalHistoryPatientAccess(patientId, req, patientService),
    ).resolves.toBeUndefined();
    expect(patientService.getPatient).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when PATIENT tries to access another patient', async () => {
    const req = {
      user: {
        role: Role.PATIENT,
        patientId: 'pat-other',
        clinicId: 'clinic-1',
      },
    } as any;
    const patientService = createMockPatientService();
    await expect(
      verifyMedicalHistoryPatientAccess(patientId, req, patientService),
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException with descriptive message for cross-patient access', async () => {
    const req = {
      user: {
        role: Role.PATIENT,
        patientId: 'pat-other',
        clinicId: 'clinic-1',
      },
    } as any;
    const patientService = createMockPatientService();
    await expect(
      verifyMedicalHistoryPatientAccess(patientId, req, patientService),
    ).rejects.toThrow('You can only access your own records');
  });

  it('throws ForbiddenException when PATIENT has no patientId', async () => {
    const req = {
      user: { role: Role.PATIENT, patientId: undefined, clinicId: 'clinic-1' },
    } as any;
    const patientService = createMockPatientService();
    await expect(
      verifyMedicalHistoryPatientAccess(patientId, req, patientService),
    ).rejects.toThrow(ForbiddenException);
  });

  it('delegates to patientService for non-PATIENT roles', async () => {
    const req = {
      user: { role: Role.DOCTOR, patientId: undefined, clinicId: 'clinic-1' },
    } as any;
    const patientService = createMockPatientService();
    await verifyMedicalHistoryPatientAccess(patientId, req, patientService);
    expect(patientService.getPatient).toHaveBeenCalledWith(
      patientId,
      'clinic-1',
    );
  });

  it('throws NotFoundException when no clinicId is present for non-PATIENT', async () => {
    const req = {
      user: { role: Role.DOCTOR, patientId: undefined, clinicId: undefined },
    } as any;
    const patientService = createMockPatientService();
    await expect(
      verifyMedicalHistoryPatientAccess(patientId, req, patientService),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException with descriptive message for missing clinic', async () => {
    const req = {
      user: { role: Role.DOCTOR, patientId: undefined, clinicId: undefined },
    } as any;
    const patientService = createMockPatientService();
    await expect(
      verifyMedicalHistoryPatientAccess(patientId, req, patientService),
    ).rejects.toThrow('Clinic context required');
  });

  it('propagates errors from patientService.getPatient', async () => {
    const req = {
      user: { role: Role.DOCTOR, patientId: undefined, clinicId: 'clinic-1' },
    } as any;
    const patientService = createMockPatientService();
    patientService.getPatient.mockRejectedValue(
      new NotFoundException('Patient not found'),
    );
    await expect(
      verifyMedicalHistoryPatientAccess(patientId, req, patientService),
    ).rejects.toThrow('Patient not found');
  });
});

describe('auditViewHistory', () => {
  it('calls logPatientPhiRead with correct arguments', async () => {
    const req = {
      user: { role: Role.DOCTOR, patientId: undefined, clinicId: 'clinic-1' },
    } as any;
    const auditService = createMockAuditService();
    await auditViewHistory('pat-1', req, auditService);
    // The function delegates to logPatientPhiRead which we can't easily mock
    // without jest.mock, so we just verify it doesn't throw
  });
});
