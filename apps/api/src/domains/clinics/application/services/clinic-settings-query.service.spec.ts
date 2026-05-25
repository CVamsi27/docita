import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { ClinicSettingsQueryService } from './clinic-settings-query.service';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { DataSubjectRequestStatus } from '@workspace/db';

describe('ClinicSettingsQueryService', () => {
  let service: ClinicSettingsQueryService;
  let prisma: jest.Mocked<ClinicPersistencePort>;

  beforeEach(() => {
    prisma = {
      clinic: { findUnique: jest.fn() },
      consentTemplate: { findFirst: jest.fn() },
      dataSubjectRequest: { groupBy: jest.fn(), findMany: jest.fn() },
    } as unknown as jest.Mocked<ClinicPersistencePort>;

    service = new ClinicSettingsQueryService(prisma);
  });

  describe('getComplianceSummary', () => {
    it('should return compliance summary for a clinic', async () => {
      (prisma.clinic.findUnique as jest.Mock).mockResolvedValueOnce({
        slaSignatureUrl: 'https://example.com/sla.pdf',
        slaSignatureAcceptedAt: new Date('2026-01-01'),
      } as never);
      (prisma.consentTemplate.findFirst as jest.Mock).mockResolvedValueOnce({
        updatedAt: new Date('2026-01-15'),
      } as never);
      (prisma.dataSubjectRequest.groupBy as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );

      const result = await service.getComplianceSummary('clinic-1');

      expect(result.slaSignatureUrl).toBe('https://example.com/sla.pdf');
      expect(result.consentTemplateEnabled).toBe(true);
      expect(result.withdrawalRequestsOpen).toBe(0);
    });

    it('should return null sla values when clinic has not signed sla', async () => {
      (prisma.clinic.findUnique as jest.Mock).mockResolvedValueOnce({
        slaSignatureUrl: null,
        slaSignatureAcceptedAt: null,
      } as never);
      (prisma.consentTemplate.findFirst as jest.Mock).mockResolvedValueOnce(
        null as never,
      );
      (prisma.dataSubjectRequest.groupBy as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );

      const result = await service.getComplianceSummary('clinic-1');

      expect(result.slaSignatureUrl).toBeNull();
      expect(result.slaSignatureAcceptedAt).toBeNull();
      expect(result.consentTemplateEnabled).toBe(false);
    });

    it('should count open data subject requests by type', async () => {
      (prisma.clinic.findUnique as jest.Mock).mockResolvedValueOnce({
        slaSignatureUrl: null,
        slaSignatureAcceptedAt: null,
      } as never);
      (prisma.consentTemplate.findFirst as jest.Mock).mockResolvedValueOnce(
        null as never,
      );
      (prisma.dataSubjectRequest.groupBy as jest.Mock).mockResolvedValueOnce([
        { requestType: 'CONSENT_WITHDRAWAL', _count: { _all: 3 } },
        { requestType: 'DELETION', _count: { _all: 1 } },
      ] as never);

      const result = await service.getComplianceSummary('clinic-1');

      expect(result.withdrawalRequestsOpen).toBe(3);
      expect(result.dataDeletionRequestsOpen).toBe(1);
    });
  });

  describe('listDataSubjectRequests', () => {
    it('should list all data subject requests for a clinic', async () => {
      const requests = [
        {
          id: 'req-1',
          clinicId: 'clinic-1',
          status: DataSubjectRequestStatus.OPEN,
        },
      ];
      (prisma.dataSubjectRequest.findMany as jest.Mock).mockResolvedValueOnce(
        requests as never,
      );

      const result = await service.listDataSubjectRequests('clinic-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-1');
    });

    it('should filter by status when provided', async () => {
      (prisma.dataSubjectRequest.findMany as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );

      await service.listDataSubjectRequests(
        'clinic-1',
        DataSubjectRequestStatus.OPEN,
      );

      expect(prisma.dataSubjectRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DataSubjectRequestStatus.OPEN,
          }),
        }),
      );
    });
  });
});
