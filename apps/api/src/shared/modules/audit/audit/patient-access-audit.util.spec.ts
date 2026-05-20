import { describe, it, expect, jest } from '@jest/globals';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
  logPatientPortalPhiRead,
} from './patient-access-audit.util';
import type { AuditService } from './audit.service';
import type { RequestWithUser } from '@/shared/common/types/common.types';

describe('logPatientPhiRead', () => {
  it('skips audit when user or clinic context is missing', async () => {
    const logPatientAccess = jest.fn<AuditService['logPatientAccess']>();
    const auditService = { logPatientAccess } as unknown as AuditService;
    const req = { user: { id: 'user-1' } } as RequestWithUser;

    await logPatientPhiRead(auditService, req, 'patient-1', 'VIEW_PROFILE');

    expect(logPatientAccess).not.toHaveBeenCalled();
  });

  it('emits logPatientAccess when actor and clinic are present', async () => {
    const logPatientAccess = jest
      .fn<AuditService['logPatientAccess']>()
      .mockResolvedValue(undefined);
    const auditService = { logPatientAccess } as unknown as AuditService;
    const req = {
      user: { id: 'user-1', clinicId: 'clinic-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as RequestWithUser;

    await logPatientPhiRead(auditService, req, 'patient-1', 'VIEW_HISTORY');

    expect(logPatientAccess).toHaveBeenCalledWith(
      'user-1',
      'clinic-1',
      'patient-1',
      'VIEW_HISTORY',
      '127.0.0.1',
      'jest',
    );
  });

  it('emits clinic-scoped list audit via logAction', async () => {
    const logAction = jest
      .fn<AuditService['logAction']>()
      .mockResolvedValue(undefined);
    const auditService = { logAction } as unknown as AuditService;
    const req = {
      user: { id: 'user-1', clinicId: 'clinic-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as RequestWithUser;

    await logClinicPhiListRead(
      auditService,
      req,
      'VIEW_PATIENT_LIST',
      'Patient',
      { page: 1 },
    );

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        clinicId: 'clinic-1',
        actionType: 'VIEW_PATIENT_LIST',
        resourceType: 'Patient',
        resourceId: 'clinic-1',
        metadata: { page: 1 },
      }),
    );
  });

  it('emits portal self-access audit with resolved clinic context', async () => {
    const logPatientAccess = jest
      .fn<AuditService['logPatientAccess']>()
      .mockResolvedValue(undefined);
    const auditService = { logPatientAccess } as unknown as AuditService;
    const req = {
      user: { id: 'portal-user-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as RequestWithUser;

    await logPatientPortalPhiRead(
      auditService,
      req,
      { patientId: 'patient-1', clinicId: 'clinic-1' },
      'VIEW_PROFILE',
    );

    expect(logPatientAccess).toHaveBeenCalledWith(
      'portal-user-1',
      'clinic-1',
      'patient-1',
      'VIEW_PROFILE',
      '127.0.0.1',
      'jest',
    );
  });
});
