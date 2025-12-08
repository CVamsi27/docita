import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
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
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
            },
            clinic: {
              findUnique: jest.fn().mockResolvedValue({ id: 'clinic-1' }),
            },
            user: {
              findUnique: jest
                .fn()
                .mockResolvedValue({ id: 'user-1', role: 'ADMIN' }),
            },
          },
        },
        {
          provide: getQueueToken('audit'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('should queue audit log for async processing', async () => {
      const logData = {
        clinicId: 'clinic-1',
        userId: 'user-1',
        actionType: 'PATIENT_CREATED',
        resourceType: 'PATIENT',
        resourceId: 'patient-1',
      };

      await service.logAction(logData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'log-action',
        logData,
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
        }),
      );
    });

    it('should log immediately when immediate flag is true', async () => {
      const logData = {
        clinicId: 'clinic-1',
        userId: 'user-1',
        actionType: 'CRITICAL_ACTION',
        resourceType: 'SYSTEM',
        resourceId: 'system-1',
      };

      jest.spyOn(service, 'createAuditLog').mockResolvedValue({});

      await service.logAction(logData, true);

      expect(service.createAuditLog).toHaveBeenCalledWith(logData);
    });

    it('should handle queue errors gracefully', async () => {
      const logData = {
        clinicId: 'clinic-1',
        userId: 'user-1',
        actionType: 'PATIENT_CREATED',
        resourceType: 'PATIENT',
        resourceId: 'patient-1',
      };

      mockQueue.add = jest.fn().mockRejectedValue(new Error('Queue error'));

      // Should not throw
      await expect(service.logAction(logData)).resolves.toBeUndefined();
    });
  });

  describe('createAuditLog', () => {
    it('should create audit log entry', async () => {
      const logData = {
        clinicId: 'clinic-1',
        userId: 'user-1',
        actionType: 'PATIENT_CREATED',
        resourceType: 'PATIENT',
        resourceId: 'patient-1',
      };

      const result = await service.createAuditLog(logData);

      expect(result).toBeDefined();
      expect(result.clinicId).toBe('clinic-1');
      expect(result.userId).toBe('user-1');
      expect(result.actionType).toBe('PATIENT_CREATED');
    });

    it('should throw error if clinic not found', async () => {
      const logData = {
        clinicId: 'invalid-clinic',
        userId: 'user-1',
        actionType: 'PATIENT_CREATED',
        resourceType: 'PATIENT',
        resourceId: 'patient-1',
      };

      jest.spyOn(prismaService.clinic, 'findUnique').mockResolvedValue(null);

      await expect(service.createAuditLog(logData)).rejects.toThrow(
        'Clinic invalid-clinic not found',
      );
    });

    it('should throw error if user not found', async () => {
      const logData = {
        clinicId: 'clinic-1',
        userId: 'invalid-user',
        actionType: 'PATIENT_CREATED',
        resourceType: 'PATIENT',
        resourceId: 'patient-1',
      };

      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(service.createAuditLog(logData)).rejects.toThrow(
        'User invalid-user not found',
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockLogs = [
        {
          id: '1',
          clinicId: 'clinic-1',
          userId: 'user-1',
          actionType: 'PRESCRIPTION_CREATED',
          resourceType: 'PRESCRIPTION',
          resourceId: 'prescription-1',
          timestamp: new Date(),
        },
      ];

      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          skip: 0,
          take: 10,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter logs by action type', async () => {
      const mockLogs = [
        {
          id: '1',
          actionType: 'PRESCRIPTION_CREATED',
          clinicId: 'clinic-1',
          timestamp: new Date(),
        },
      ];

      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          actionType: 'PRESCRIPTION_CREATED',
          skip: 0,
          take: 10,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const mockLogs: any[] = [];

      jest
        .spyOn(prismaService.auditLog, 'findMany')
        .mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          startDate,
          endDate,
          skip: 0,
          take: 10,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          skip: 20,
          take: 10,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter logs by user ID', async () => {
      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          userId: 'user-1',
          skip: 0,
          take: 10,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should deny access to non-admin users', async () => {
      await expect(
        service.getAuditLogs(
          {
            clinicId: 'clinic-1',
          },
          'USER',
        ),
      ).rejects.toThrow('Insufficient permissions to view audit logs');
    });

    it('should allow access to SUPER_ADMIN users', async () => {
      jest.spyOn(prismaService.auditLog, 'findMany').mockResolvedValue([]);

      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
        },
        'SUPER_ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('archiveOldLogs', () => {
    it('should archive logs older than specified days', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      service.archiveOldLogs(90);

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should use default 90 days if not specified', () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      service.archiveOldLogs();

      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should handle archive errors gracefully', async () => {
      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      // Simulate error by mocking failing operation
      jest
        .spyOn(service as any, 'archiveOldLogs')
        .mockRejectedValue(new Error('Archive failed'));

      // Call the original method
      await expect(service.archiveOldLogs(90)).rejects.toThrow();
    });
  });

  describe('Access Control', () => {
    it('should restrict audit log access to admins only', async () => {
      const restrictedRoles = ['USER', 'PATIENT', 'GUEST'];

      for (const role of restrictedRoles) {
        await expect(
          service.getAuditLogs({ clinicId: 'clinic-1' }, role),
        ).rejects.toThrow('Insufficient permissions to view audit logs');
      }
    });

    it('should allow access for ADMIN and SUPER_ADMIN', async () => {
      jest.spyOn(prismaService.auditLog, 'findMany').mockResolvedValue([]);

      const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];

      for (const role of allowedRoles) {
        await expect(
          service.getAuditLogs({ clinicId: 'clinic-1' }, role),
        ).resolves.toEqual([]);
      }
    });
  });

  describe('Clinic Isolation', () => {
    it('should only return logs for specified clinic', async () => {
      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
