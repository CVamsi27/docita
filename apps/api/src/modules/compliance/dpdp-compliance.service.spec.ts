import { Test, TestingModule } from '@nestjs/testing';
import {
  DPDPComplianceService,
  DataSubjectRight,
} from './dpdp-compliance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConsentType, ConsentStatus } from '@workspace/db';

describe('DPDPComplianceService', () => {
  let service: DPDPComplianceService;
  let prisma: PrismaService;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DPDPComplianceService,
        {
          provide: PrismaService,
          useValue: {
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
            invoice: { count: jest.fn().mockResolvedValue(0) },
            appointment: { count: jest.fn().mockResolvedValue(0) },
          },
        },
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DPDPComplianceService>(DPDPComplianceService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordConsent', () => {
    it('should record consent and log audit', async () => {
      const data = {
        patientId: 'p1',
        clinicId: 'c1',
        consentType: ConsentType.DATA_SHARING,
        status: ConsentStatus.ACTIVE,
        purpose: 'Treatment',
      };

      const mockConsent = { id: 'con1', ...data };
      (prisma.consent.create as jest.Mock).mockResolvedValue(mockConsent);

      const result = await service.recordConsent(data, '127.0.0.1');

      expect(prisma.consent.create).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CONSENT_RECORDED',
          resourceId: 'con1',
        }),
      );
      expect(result).toEqual(mockConsent);
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw consent and log audit', async () => {
      const consentId = 'con1';
      const mockUpdatedConsent = {
        id: consentId,
        clinicId: 'c1',
        consentType: ConsentType.DATA_SHARING,
        status: ConsentStatus.REVOKED,
      };

      (prisma.consent.update as jest.Mock).mockResolvedValue(
        mockUpdatedConsent,
      );

      await service.withdrawConsent(consentId, 'No longer needed', 'p1');

      expect(prisma.consent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: consentId },
          data: expect.objectContaining({ status: ConsentStatus.REVOKED }),
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CONSENT_WITHDRAWN',
        }),
      );
    });
  });

  describe('handleErasureRequest', () => {
    it('should anonymize patient if no pending obligations', async () => {
      const data = {
        patientId: 'p1',
        clinicId: 'c1',
        requestType: DataSubjectRight.ERASURE,
        requestedBy: 'admin1',
        reason: 'User request',
      };

      (prisma.patient.update as jest.Mock).mockResolvedValue({ id: 'p1' });

      await service.handleErasureRequest(data, '127.0.0.1');

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({
            firstName: 'Anonymous',
            email: expect.stringContaining('@anonymized.local'),
          }),
        }),
      );
    });
  });
});
