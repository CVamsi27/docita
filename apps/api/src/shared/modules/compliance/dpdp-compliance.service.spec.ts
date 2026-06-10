import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import {
  DPDPComplianceService,
  DataSubjectRight as _DataSubjectRight,
} from './dpdp-compliance.service';
import { ConsentComplianceService } from './consent-compliance.service';
import { DataSubjectRequestService } from './data-subject-request.service';
import { DpdpAuditEmitter } from './dpdp-audit.emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { AnonymizationFactory } from './factories/anonymization.factory';
import { DataExportFactory } from './factories/data-export.factory';
import { clockPortTestProvider } from '@/test-utils';

describe('DPDPComplianceService', () => {
  let service: DPDPComplianceService;

  const mockPrismaService = {
    consent: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    patient: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    invoice: {
      count: jest.fn<(...args: unknown[]) => Promise<number>>(),
    },
    appointment: {
      count: jest.fn<(...args: unknown[]) => Promise<number>>(),
    },
    clinic: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const mockAuditService = {
    logAction: jest.fn(),
  };

  const mockAnonymizationFactory = {
    anonymizePatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockDataExportFactory = {
    exportPatientData: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DpdpAuditEmitter,
        ConsentComplianceService,
        DataSubjectRequestService,
        DPDPComplianceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: AnonymizationFactory, useValue: mockAnonymizationFactory },
        { provide: DataExportFactory, useValue: mockDataExportFactory },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<DPDPComplianceService>(DPDPComplianceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handlePortabilityRequest', () => {
    it('returns the exported patient record (DPDP access/portability)', async () => {
      const exported = {
        exportDate: '2026-06-10T00:00:00.000Z',
        format: 'JSON',
        version: '1.0',
        patient: { id: 'pat_1', firstName: 'Asha' },
      };
      mockDataExportFactory.exportPatientData.mockResolvedValue(exported);

      const result = await service.handlePortabilityRequest({
        patientId: 'pat_1',
        clinicId: 'clinic_1',
        requestType: _DataSubjectRight.PORTABILITY,
        requestedBy: 'user_1',
      });

      expect(mockDataExportFactory.exportPatientData).toHaveBeenCalledWith(
        'pat_1',
      );
      expect(result).toEqual(exported);
    });
  });

  describe('handleErasureRequest', () => {
    it('blocks erasure while statutory obligations remain', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(2);
      mockPrismaService.appointment.count.mockResolvedValue(0);

      await expect(
        service.handleErasureRequest({
          patientId: 'pat_1',
          clinicId: 'clinic_1',
          requestType: _DataSubjectRight.ERASURE,
          requestedBy: 'user_1',
        }),
      ).rejects.toThrow(/pending obligations/i);
      expect(mockAnonymizationFactory.anonymizePatient).not.toHaveBeenCalled();
    });

    it('anonymizes (not hard-deletes) the patient when clear', async () => {
      mockPrismaService.invoice.count.mockResolvedValue(0);
      mockPrismaService.appointment.count.mockResolvedValue(0);
      mockAnonymizationFactory.anonymizePatient.mockResolvedValue({
        id: 'pat_1',
      });

      const result = (await service.handleErasureRequest({
        patientId: 'pat_1',
        clinicId: 'clinic_1',
        requestType: _DataSubjectRight.ERASURE,
        requestedBy: 'user_1',
      })) as { anonymized: boolean };

      expect(result.anonymized).toBe(true);
      expect(mockAnonymizationFactory.anonymizePatient).toHaveBeenCalledWith(
        'pat_1',
      );
    });
  });
});
