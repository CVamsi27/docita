import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { BulkImportService } from './bulk-import.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BulkImportService', () => {
  let service: BulkImportService;
  let prismaService: PrismaService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      process: jest.fn(),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkImportService,
        {
          provide: PrismaService,
          useValue: {
            patient: {
              create: jest.fn().mockResolvedValue({ id: 'patient-1' }),
              findFirst: jest.fn().mockResolvedValue(null),
            },
            user: {
              findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
            },
          },
        },
        {
          provide: getQueueToken('bulk-import'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<BulkImportService>(BulkImportService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

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
      );

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status');
      expect(result.totalRows).toBe(1);
    });

    it('should reject if file is too large', async () => {
      // Create a file larger than 50MB
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
        service.startImport(
          'clinic-1',
          'user-1',
          'INVALID_TYPE' as any,
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
      );

      expect(result.status).toBeDefined();
      expect(result.jobId).toBeDefined();
    });

    it('should support DOCTOR entity type', async () => {
      const csvContent = Buffer.from(
        `firstName,lastName,specialization\nJohn,Doe,Cardiology`,
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
      const csvContent = Buffer.from(`name,testCode\nBlood Test,BT01`);

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
        fileBuffer: Buffer.from(
          `firstName,lastName,phoneNumber\nJohn,Doe,1234567890`,
        ),
        totalRows: 1,
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });

    it('should handle prescription import skip gracefully', async () => {
      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PRESCRIPTION' as const,
        fileName: 'prescriptions.csv',
        fileBuffer: Buffer.from(
          `patientId,doctorId,instructions\npat-1,doc-1,Take twice daily`,
        ),
        totalRows: 1,
      };

      // Prescriptions are skipped in bulk import
      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });

    it('should handle import errors', async () => {
      jest
        .spyOn(prismaService.patient, 'create')
        .mockRejectedValue(new Error('Database error'));

      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PATIENT' as const,
        fileName: 'patients.csv',
        fileBuffer: Buffer.from(
          `firstName,lastName,phoneNumber\nJohn,Doe,1234567890`,
        ),
        totalRows: 1,
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });

    it('should process large batches', async () => {
      const rows = Array.from({ length: 1000 }, (_, i) => [
        `Patient${i}`,
        `Test${i}`,
        `555000${i}`,
      ])
        .map((row) => row.join(','))
        .join('\n');

      const jobData = {
        jobId: 'job-1',
        clinicId: 'clinic-1',
        userId: 'user-1',
        entityType: 'PATIENT' as const,
        fileName: 'patients.csv',
        fileBuffer: Buffer.from(`firstName,lastName,phoneNumber\n${rows}`),
        totalRows: 1000,
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });
  });

  describe('CSV Parsing', () => {
    it('should parse valid CSV with headers', async () => {
      const csvContent = Buffer.from(
        `firstName,lastName,phoneNumber\nJohn,Doe,1234567890\nJane,Smith,0987654321`,
      );

      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'patients.csv',
        csvContent,
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
      );

      expect(result).toBeDefined();
    });

    it('should validate DOCTOR entity type', async () => {
      const csvContent = Buffer.from(`firstName,lastName\nJohn,Doe`);

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
      const csvContent = Buffer.from(`name,code\nTest,T1`);

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
      const csvContent = Buffer.from(`name,quantity\nMedicine,100`);

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
        service.startImport(
          'clinic-1',
          'user-1',
          'UNKNOWN' as any,
          'test.csv',
          csvContent,
        ),
      ).rejects.toThrow();
    });

    it('should handle null clinic ID', async () => {
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      // When clinicId is null, the service still processes the import
      const result = await service.startImport(
        null as any,
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
        fileBuffer: Buffer.from(
          `firstName,lastName\nJohn`, // Missing lastName column value
        ),
        totalRows: 1,
      };

      await expect(service.processImport(jobData)).resolves.not.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting per clinic', async () => {
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      // First import should succeed
      await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
      );

      // Immediate second import should be rate limited
      await expect(
        service.startImport(
          'clinic-1',
          'user-1',
          'PATIENT',
          'test.csv',
          csvContent,
        ),
      ).rejects.toThrow('wait');
    });

    it('should allow imports after rate limit expires', async () => {
      jest.useFakeTimers();
      const csvContent = Buffer.from('firstName,lastName\nJohn,Doe');

      // First import
      await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
      );

      // Advance time beyond rate limit (default 300 seconds)
      jest.advanceTimersByTime(301000);

      // Second import should succeed
      const result = await service.startImport(
        'clinic-1',
        'user-1',
        'PATIENT',
        'test.csv',
        csvContent,
      );

      expect(result).toBeDefined();
      jest.useRealTimers();
    });
  });
});
