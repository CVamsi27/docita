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
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
    },
    clinic: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditService = {
    logAction: jest.fn(),
  };

  const mockAnonymizationFactory = {
    anonymizePatient: jest.fn(),
  };

  const mockDataExportFactory = {
    exportPatientData: jest.fn(),
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
});
