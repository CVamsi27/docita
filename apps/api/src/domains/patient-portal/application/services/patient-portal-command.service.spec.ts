import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IPatientPortalRepository } from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import { PatientPortalCommandService } from './patient-portal-command.service';
import type { PatientPortalContextService } from './patient-portal-context.service';

describe('PatientPortalCommandService — DPDP data-subject requests', () => {
  const NOW = new Date('2026-06-10T00:00:00.000Z');
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const createDataSubjectRequestMock =
    jest.fn<IPatientPortalRepository['createDataSubjectRequest']>();
  const repository = {
    createDataSubjectRequest: createDataSubjectRequestMock,
  } as unknown as IPatientPortalRepository;

  const contextService = {
    getPatientContext: jest
      .fn<PatientPortalContextService['getPatientContext']>()
      .mockResolvedValue({
        patient: { id: 'pat-1' },
        patientId: 'pat-1',
        clinicId: 'clinic-1',
      } as Awaited<
        ReturnType<PatientPortalContextService['getPatientContext']>
      >),
  } as unknown as PatientPortalContextService;

  const service = new PatientPortalCommandService(repository, contextService, {
    now: () => NOW,
  });

  beforeEach(() => {
    createDataSubjectRequestMock.mockClear();
    createDataSubjectRequestMock.mockResolvedValue({
      id: 'dsr-1',
      dueAt: new Date(NOW.getTime() + THIRTY_DAYS_MS),
    });
  });

  it('records a DELETION request in the clinic compliance queue', async () => {
    const result = await service.requestDataDeletion('user-1', {
      reason: 'I want my records removed',
    });

    expect(createDataSubjectRequestMock).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      patientId: 'pat-1',
      requestType: 'DELETION',
      requestDetails: 'I want my records removed',
      dueAt: new Date(NOW.getTime() + THIRTY_DAYS_MS),
    });
    expect(result.requestId).toBe('dsr-1');
    expect(result.message).toContain('30 days');
  });

  it('records an EXPORT request with the same 30-day SLA', async () => {
    const result = await service.requestDataExport('user-1', {
      reason: 'Need my records for a second opinion',
    });

    expect(createDataSubjectRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestType: 'EXPORT',
        dueAt: new Date(NOW.getTime() + THIRTY_DAYS_MS),
      }),
    );
    expect(result.requestId).toBe('dsr-1');
  });
});
