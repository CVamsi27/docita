import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IPatientPortalRepository } from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import type { ConsentCommandService } from '@/shared/modules/compliance/consent-command.service';
import type { ConsentQueryService } from '@/shared/modules/compliance/consent-query.service';
import { PatientPortalCommandService } from './patient-portal-command.service';
import type { PatientPortalContextService } from './patient-portal-context.service';

describe('PatientPortalCommandService — DPDP data-subject requests', () => {
  const NOW = new Date('2026-06-10T00:00:00.000Z');
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const createDataSubjectRequestMock =
    jest.fn<IPatientPortalRepository['createDataSubjectRequest']>();
  const updatePatientMock =
    jest.fn<IPatientPortalRepository['updatePatient']>();
  const repository = {
    createDataSubjectRequest: createDataSubjectRequestMock,
    updatePatient: updatePatientMock,
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

  const setDpdpNoticeConsentMock =
    jest.fn<ConsentCommandService['setDpdpNoticeConsent']>();
  const hasValidConsentMock = jest.fn<ConsentQueryService['hasValidConsent']>();
  const consentCommand = {
    setDpdpNoticeConsent: setDpdpNoticeConsentMock,
  } as unknown as ConsentCommandService;
  const consentQuery = {
    hasValidConsent: hasValidConsentMock,
  } as unknown as ConsentQueryService;

  const service = new PatientPortalCommandService(
    repository,
    contextService,
    { now: () => NOW },
    consentCommand,
    consentQuery,
  );

  beforeEach(() => {
    createDataSubjectRequestMock.mockClear();
    setDpdpNoticeConsentMock.mockClear();
    hasValidConsentMock.mockClear();
    updatePatientMock.mockClear();
    updatePatientMock.mockResolvedValue({
      whatsappConsent: true,
      whatsappConsentAt: NOW,
    } as Awaited<ReturnType<IPatientPortalRepository['updatePatient']>>);
    createDataSubjectRequestMock.mockResolvedValue({
      id: 'dsr-1',
      dueAt: new Date(NOW.getTime() + THIRTY_DAYS_MS),
    });
  });

  it('records a DELETION request in the clinic compliance queue', async () => {
    const result = await service.requestDataDeletion('user-1', {
      reason: 'I want my records removed',
      confirmDeletion: true,
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

  it('rejects a deletion request that is not explicitly confirmed', async () => {
    await expect(
      service.requestDataDeletion('user-1', { reason: 'remove me' }),
    ).rejects.toThrow(/confirmed/i);
    expect(createDataSubjectRequestMock).not.toHaveBeenCalled();
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

  describe('updateConsent — data-storage consent persistence', () => {
    it('persists an affirmative data-storage consent as DPDP_NOTICE', async () => {
      setDpdpNoticeConsentMock.mockResolvedValue({ active: true });

      const result = await service.updateConsent('user-1', {
        dataStorageConsent: true,
      });

      expect(setDpdpNoticeConsentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'pat-1',
          clinicId: 'clinic-1',
          granted: true,
          actorUserId: 'user-1',
        }),
      );
      expect(result.dataStorageConsent).toBe(true);
    });

    it('withdraws data-storage consent when the patient revokes it', async () => {
      setDpdpNoticeConsentMock.mockResolvedValue({ active: false });

      const result = await service.updateConsent('user-1', {
        dataStorageConsent: false,
      });

      expect(setDpdpNoticeConsentMock).toHaveBeenCalledWith(
        expect.objectContaining({ granted: false }),
      );
      expect(result.dataStorageConsent).toBe(false);
    });

    it('reads existing consent when only whatsapp consent changes', async () => {
      hasValidConsentMock.mockResolvedValue(true);

      const result = await service.updateConsent('user-1', {
        whatsappConsent: true,
      });

      expect(setDpdpNoticeConsentMock).not.toHaveBeenCalled();
      expect(hasValidConsentMock).toHaveBeenCalled();
      expect(result.dataStorageConsent).toBe(true);
    });
  });
});
