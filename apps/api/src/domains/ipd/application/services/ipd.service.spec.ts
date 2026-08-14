import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IpdService } from './ipd.service';
import type { IpdRepository } from '@/domains/ipd/core/repositories/ipd.repository.interface';
import type { AuditService } from '@/shared/modules/audit/audit/audit.service';
import type {
  AdmitPatientRequest,
  DischargePatientRequest,
  TransferPatientRequest,
} from '@workspace/types';

describe('IpdService', () => {
  let service: IpdService;
  const repo = {
    listWards: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    listAdmissions: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    admitPatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    transferPatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    dischargePatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };
  const logAction = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  beforeEach(() => {
    jest.clearAllMocks();
    logAction.mockResolvedValue(undefined);
    service = new IpdService(
      repo as unknown as IpdRepository,
      { logAction } as unknown as AuditService,
    );
  });

  it('delegates read queries without emitting audit records', () => {
    repo.listWards.mockReturnValue(Promise.resolve([]));
    repo.listAdmissions.mockReturnValue(Promise.resolve([]));

    void service.listWards('clinic_1', 'ICU');
    void service.listAdmissions('clinic_1', 'ACTIVE');

    expect(repo.listWards).toHaveBeenCalledWith('clinic_1', 'ICU');
    expect(repo.listAdmissions).toHaveBeenCalledWith('clinic_1', 'ACTIVE');
    expect(logAction).not.toHaveBeenCalled();
  });

  it('admits a patient and audits IPD_ADMISSION_CREATED at the command boundary', async () => {
    repo.admitPatient.mockResolvedValue({ id: 'adm_1' });
    const input = {
      patientId: 'p1',
      bedId: 'b1',
      admittingDoctorId: 'd1',
    } as AdmitPatientRequest;

    const result = await service.admitPatient(
      'clinic_1',
      input,
      'user_1',
      '1.2.3.4',
    );

    expect(repo.admitPatient).toHaveBeenCalledWith('clinic_1', input);
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: 'clinic_1',
        userId: 'user_1',
        actionType: 'IPD_ADMISSION_CREATED',
        resourceType: 'Admission',
        resourceId: 'adm_1',
        ipAddress: '1.2.3.4',
      }),
    );
    expect(result).toEqual({ id: 'adm_1' });
  });

  it('transfers a patient and audits IPD_ADMISSION_TRANSFERRED', async () => {
    repo.transferPatient.mockResolvedValue({ id: 'adm_2' });
    const input = {
      admissionId: 'adm_2',
      toBedId: 'b9',
    } as TransferPatientRequest;

    await service.transferPatient('clinic_1', input, 'user_1');

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'IPD_ADMISSION_TRANSFERRED',
        resourceId: 'adm_2',
        metadata: { toBedId: 'b9' },
      }),
    );
  });

  it('discharges a patient and audits IPD_ADMISSION_DISCHARGED with bed/patient metadata', async () => {
    repo.dischargePatient.mockResolvedValue({
      id: 'adm_3',
      bedId: 'b3',
      patientId: 'p3',
    });
    const input = { admissionId: 'adm_3' } as DischargePatientRequest;

    await service.dischargePatient('clinic_1', input, 'user_1');

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'IPD_ADMISSION_DISCHARGED',
        resourceId: 'adm_3',
        metadata: { bedId: 'b3', patientId: 'p3' },
      }),
    );
  });
});
