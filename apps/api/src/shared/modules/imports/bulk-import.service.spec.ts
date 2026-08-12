import { Test, TestingModule } from '@nestjs/testing';
import { BulkImportService } from './bulk-import.service';
import type { BulkImportEntityType } from '@workspace/types';
import { BulkImportJobQueryService } from './bulk-import-job-query.service';
import { BulkImportJobProcessorService } from './bulk-import-job-processor.service';
import { BulkImportOrchestratorService } from './bulk-import-orchestrator.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { IMPORT_STRATEGY_PERSISTENCE_PORT } from './ports/import-strategy.persistence.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { ImportFileParserService } from './import-file-parser.service';
import { BulkImportStrategyRegistry } from './bulk-import-strategy.registry';
import { ImportDuplicateDetectorService } from './import-duplicate-detector.service';
import { DUPLICATE_DETECTOR_TOKEN } from './ports/duplicate-detector.port';
import { ImportPatientPersistenceService } from './import-patient-persistence.service';
import {
  PatientImportStrategy,
  DoctorImportStrategy,
  PrescriptionImportStrategy,
  LabTestImportStrategy,
  InventoryImportStrategy,
} from './strategies';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('BulkImportService', () => {
  let service: BulkImportService;
  let prismaService: PrismaService;

  const buildPrismaMock = () => {
    const tx = {
      patient: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'patient-1' }),
      },
      consent: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'consent-1' }),
      },
    };

    return {
      bulkImportJob: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'job-mock' }),
        update: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({}),
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(null),
      },
      patient: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'patient-1' }),
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(null),
      },
      user: {
        findUnique: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(null),
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'user-new' }),
      },
      appointment: {
        findFirst: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({
            id: 'appt-1',
            patientId: 'patient-1',
            doctorId: 'user-1',
            clinicId: 'clinic-1',
            prescription: null,
          }),
      },
      prescription: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'rx-1' }),
      },
      labTest: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'lab-1' }),
      },
      inventoryItem: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'inv-1' }),
      },
      invoice: {
        create: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue({ id: 'inv-doc-1' }),
      },
      $transaction: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockImplementation(async (fn: unknown) =>
          (fn as (client: typeof tx) => Promise<unknown>)(tx),
        ),
    };
  };

  beforeEach(async () => {
    const prismaMock = buildPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkImportService,
        BulkImportJobQueryService,
        BulkImportJobProcessorService,
        BulkImportOrchestratorService,
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-01-15T10:00:00Z') },
        },
        ImportFileParserService,
        ImportDuplicateDetectorService,
        {
          provide: DUPLICATE_DETECTOR_TOKEN,
          useExisting: ImportDuplicateDetectorService,
        },
        ImportPatientPersistenceService,
        {
          provide: IMPORT_STRATEGY_PERSISTENCE_PORT,
          useExisting: PrismaService,
        },
        PatientImportStrategy,
        DoctorImportStrategy,
        PrescriptionImportStrategy,
        LabTestImportStrategy,
        InventoryImportStrategy,
        BulkImportStrategyRegistry,
        {
          provide: PrismaService,
          useValue: prismaMock as unknown as PrismaService,
        },
        {
          provide: AppConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({}),
            getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
            getEnvironment: jest.fn().mockReturnValue('test'),
            getBulkImportConfig: jest.fn().mockReturnValue({
              maxFileSize: 5242880,
              maxRows: 10000,
              rateLimitInterval: 300,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<BulkImportService>(BulkImportService);
    prismaService = module.get<PrismaService>(PrismaService);

    const orchestrator = module.get(BulkImportOrchestratorService);
    jest.spyOn(orchestrator['logger'], 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const startImportUnsafe = (
    clinicId: string | null,
    userId: string,
    entityType: BulkImportEntityType | string,
    fileName: string,
    fileBuffer: Buffer,
  ) =>
    (
      service.startImport as (
        clinicId: string | null,
        userId: string,
        entityType: BulkImportEntityType | string,
        fileName: string,
        fileBuffer: Buffer,
      ) => ReturnType<BulkImportService['startImport']>
    )(clinicId, userId, entityType, fileName, fileBuffer);

  describe('startImport', () => {
    it('should start bulk import job', async () => {
      const csvContent = Buffer.from(
        `firstName,lastName,phoneNumber\nJohn,Doe,1234567890`,
      );

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'patients.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status');
      expect(result.totalRows).toBe(1);
    });

    it('should reject if file is too large', async () => {
      const largeBuffer = Buffer.alloc(52428801);

      await expect(
        service.startImport(
          'clinic-1',
          'user-1',
          'PATIENT',
          'large.csv',
          largeBuffer,
        ),
      ).rejects.toThrow('exceeds limit');
    });

    it('should reject empty CSV files', async () => {
      const emptyBuffer = Buffer.from('');

      await expect(
        service.startImport(
          'clinic-1',
          'user-1',
          'PATIENT',
          'empty.csv',
          emptyBuffer,
        ),
      ).rejects.toThrow();
    });

    it('should validate entity type', async () => {
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      await expect(
        startImportUnsafe(
          'clinic-1',
          'user-1',
          'INVALID_TYPE',
          'test.csv',
          csvContent,
        ),
      ).rejects.toThrow();
    });

    it('should support PATIENT entity type', async () => {
      const csvContent = Buffer.from(
        `firstName,lastName,phoneNumber\nJohn,Doe,1234567890`,
      );

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'patients.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      expect(result.status).toBeDefined();
      expect(result.jobId).toBeDefined();
    });

    it('should support DOCTOR entity type', async () => {
      const csvContent = Buffer.from(
        `name,email,specialization\nJohn Doe,doc@example.com,CARDIOLOGY`,
      );

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'DOCTOR',
        'doctors.csv',
        csvContent,
      );

      expect(result.status).toBeDefined();
    });

    it('should support LAB_TEST entity type', async () => {
      const csvContent = Buffer.from(`testName,testCode\nBlood Test,BT01`);

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'LAB_TEST',
        'labs.csv',
        csvContent,
      );

      expect(result.status).toBeDefined();
    });
  });

  describe('processImport', () => {
    it('should process bulk import job', async () => {
      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PATIENT' as const,
        fileName: 'patients.csv',
        rows: [
          {
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '1234567890',
          },
        ],
        totalRows: 1,
        audit: { dpdpNoticeVersion: 'dpdp-v1' },
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });

    it('should import prescription when appointment exists', async () => {
      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PRESCRIPTION' as const,
        fileName: 'prescriptions.csv',
        rows: [
          {
            appointmentId: 'appt-1',
            instructions: 'Take twice daily',
          },
        ],
        totalRows: 1,
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });

    it('should handle import errors', async () => {
      jest
        .spyOn(prismaService, '$transaction')
        .mockRejectedValue(new Error('Database error'));

      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PATIENT' as const,
        fileName: 'patients.csv',
        rows: [
          {
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '1234567890',
          },
        ],
        totalRows: 1,
        audit: { dpdpNoticeVersion: 'dpdp-v1' },
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });

    it('should skip duplicate patients instead of failing', async () => {
      jest.spyOn(prismaService.patient, 'findFirst').mockResolvedValue({
        id: 'existing',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
      } as Awaited<ReturnType<typeof prismaService.patient.findFirst>>);

      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PATIENT' as const,
        fileName: 'patients.csv',
        rows: [
          {
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '1234567890',
          },
        ],
        totalRows: 1,
        audit: { dpdpNoticeVersion: 'dpdp-v1' },
      };

      await service.processImport(jobData);

      const lastUpdate = jest
        .mocked(prismaService.bulkImportJob.update)
        .mock.calls.at(-1)?.[0];
      expect(lastUpdate?.data).toEqual(
        expect.objectContaining({
          skippedRows: 1,
          successRows: 0,
          failedRows: 0,
        }),
      );
    });

    it('should process large batches', async () => {
      const rows = Array.from({ length: 1000 }, (_, i) => ({
        firstName: `Patient${i}`,
        lastName: `Test${i}`,
        phoneNumber: `555000${String(i).padStart(4, '0')}`,
      }));

      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PATIENT' as const,
        fileName: 'patients.csv',
        rows,
        totalRows: 1000,
        audit: { dpdpNoticeVersion: 'dpdp-v1' },
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV with headers', async () => {
      const csvContent = Buffer.from(
        `firstName,lastName,phoneNumber\nJohn,Doe,1234567890\nJane,Smith,0987654341`,
      );

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'patients.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      expect(result.totalRows).toBe(2);
    });

    it('should handle CSV with special characters', async () => {
      const csvContent = Buffer.from(
        `firstName,lastName,phoneNumber\n"John, Jr.",Doe,1234567890`,
      );

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'patients.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      expect(result.totalRows).toBe(1);
    });

    it('should handle CSV with UTF-8 characters', async () => {
      const csvContent = Buffer.from(
        `firstName,lastName,phoneNumber\nJöhn,Döe,1234567890`,
        'utf-8',
      );

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'patients.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      expect(result.totalRows).toBe(1);
    });
  });

  describe('Entity Type Support', () => {
    it('should validate PATIENT entity type', async () => {
      const csvContent = Buffer.from(`firstName,lastName\nJohn,Doe`);

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      expect(result).toBeDefined();
    });

    it('should validate DOCTOR entity type', async () => {
      const csvContent = Buffer.from(`name,email\nJohn Doe,doc@test.com`);

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'DOCTOR',
        'test.csv',
        csvContent,
      );

      expect(result).toBeDefined();
    });

    it('should validate LAB_TEST entity type', async () => {
      const csvContent = Buffer.from(`testName,testCode\nTest,T1`);

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'LAB_TEST',
        'test.csv',
        csvContent,
      );

      expect(result).toBeDefined();
    });

    it('should validate INVENTORY entity type', async () => {
      const csvContent = Buffer.from(`itemName,quantity\nMedicine,100`);

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'INVENTORY',
        'test.csv',
        csvContent,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed entity type', async () => {
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      await expect(
        startImportUnsafe(
          'clinic-1',
          'user-1',
          'UNKNOWN',
          'test.csv',
          csvContent,
        ),
      ).rejects.toThrow();
    });

    it('should handle null clinic ID', async () => {
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      const result = await startImportUnsafe(
        null,
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
      );

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status');
    });

    it('should handle row validation errors', async () => {
      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PATIENT' as const,
        fileName: 'patients.csv',
        rows: [{ firstName: 'John' }],
        totalRows: 1,
        audit: { dpdpNoticeVersion: 'dpdp-v1' },
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting per clinic', async () => {
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      await expect(
        service.startImport(
          'clinic-1',
          'user-1',
          'PATIENT',
          'test.csv',
          csvContent,
          { dpdpNoticeVersion: 'dpdp-v1' },
        ),
      ).rejects.toThrow('wait');
    });

    it('should allow imports after rate limit expires', async () => {
      jest.useFakeTimers();
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      jest.advanceTimersByTime(301000);

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
        { dpdpNoticeVersion: 'dpdp-v1' },
      );

      expect(result).toBeDefined();
      jest.useRealTimers();
    });
  });
});
