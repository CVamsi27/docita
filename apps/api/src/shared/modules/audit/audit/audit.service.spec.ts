import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { clockPortTestProvider } from '@/test-utils';

describe('AuditService', () => {
  let service: AuditService;
  let prismaService: {
    auditLog: {
      create: ReturnType<typeof jest.fn>;
      findMany: ReturnType<typeof jest.fn>;
      count: ReturnType<typeof jest.fn>;
    };
    clinic: {
      findUnique: ReturnType<typeof jest.fn>;
    };
    user: {
      findUnique: ReturnType<typeof jest.fn>;
    };
    runUnrestricted: ReturnType<typeof jest.fn>;
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: {
            auditLog: {
              create: jest.fn(
                async (payload: { data: Record<string, unknown> }) =>
                  payload.data,
              ),
              findMany: jest.fn(async () => []),
              count: jest.fn(async () => 0),
            },
            clinic: {
              findUnique: jest.fn(async () => ({ id: 'clinic-1' })),
            },
            user: {
              findUnique: jest.fn(async () => ({
                id: 'user-1',
                role: 'ADMIN',
              })),
            },
            runUnrestricted: jest.fn((callback: () => unknown) => callback()),
          },
        },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prismaService = module.get(PrismaService) as typeof prismaService;

    jest.spyOn(service['logger'], 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('awaits createAuditLog and resolves on success', async () => {
      const logData = {
        clinicId: 'clinic-1',
        userId: 'user-1',
        actionType: 'PATIENT_CREATED',
        resourceType: 'PATIENT',
        resourceId: 'patient-1',
      };

      jest.spyOn(service, 'createAuditLog').mockResolvedValue({});

      await service.logAction(logData);

      expect(service.createAuditLog).toHaveBeenCalledWith(logData);
    });

    it('propagates failures so callers can roll back', async () => {
      const logData = {
        clinicId: 'clinic-1',
        userId: 'user-1',
        actionType: 'PATIENT_CREATED',
        resourceType: 'PATIENT',
        resourceId: 'patient-1',
      };

      jest
        .spyOn(service, 'createAuditLog')
        .mockRejectedValue(new Error('Audit create error'));

      await expect(service.logAction(logData)).rejects.toThrow(
        'Audit create error',
      );
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

      const result = (await service.createAuditLog(logData)) as Record<
        string,
        unknown
      >;

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

      jest
        .spyOn(prismaService.clinic, 'findUnique')
        .mockImplementation(async () => null);

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

      jest
        .spyOn(prismaService.user, 'findUnique')
        .mockImplementation(async () => null);

      await expect(service.createAuditLog(logData)).rejects.toThrow(
        'User invalid-user not found',
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const _mockLogs = [
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
          limit: 10,
          page: 1,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter logs by action', async () => {
      const _mockLogs = [
        {
          id: '1',
          action: 'PRESCRIPTION_CREATED',
          clinicId: 'clinic-1',
          createdAt: new Date(),
        },
      ];

      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          action: 'PRESCRIPTION_CREATED',
          limit: 10,
          page: 1,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter logs by date range', async () => {
      const startDate = '2025-01-01T00:00:00.000Z';
      const endDate = '2025-01-31T23:59:59.999Z';
      const mockLogs: Array<Record<string, unknown>> = [];

      jest
        .spyOn(prismaService.auditLog, 'findMany')
        .mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          startDate,
          endDate,
          limit: 10,
          page: 1,
        },
        'ADMIN',
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
          page: 3,
          limit: 10,
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
          limit: 10,
          page: 1,
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

    it('should allow access to INTERNAL users', async () => {
      jest
        .spyOn(prismaService.auditLog, 'findMany')
        .mockImplementation(async () => []);

      const result = await service.getAuditLogs(
        {
          clinicId: 'clinic-1',
        },
        'INTERNAL',
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

    it('should handle archive errors gracefully', () => {
      jest.spyOn(service['logger'], 'log').mockImplementationOnce(() => {
        throw new Error('Archive failed');
      });

      service.archiveOldLogs(90);

      expect(service['logger'].error).toHaveBeenCalled();
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

    it('should allow access for ADMIN and INTERNAL', async () => {
      jest
        .spyOn(prismaService.auditLog, 'findMany')
        .mockImplementation(async () => []);

      const allowedRoles = ['ADMIN', 'INTERNAL'];

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

  describe('getRecentAuditSummary', () => {
    it('clamps the limit and maps actor names', async () => {
      const createdAt = new Date('2026-04-24T10:00:00.000Z');

      jest.spyOn(prismaService.auditLog, 'findMany').mockResolvedValue([
        {
          id: 'audit-1',
          action: 'DATA_SUBJECT_REQUEST_CREATED',
          createdAt,
          user: { name: 'Dr. Rao' },
        },
        {
          id: 'audit-2',
          action: 'DATA_SUBJECT_REQUEST_UPDATED',
          createdAt,
          user: null,
        },
      ]);

      const result = await service.getRecentAuditSummary('clinic-1', 50);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1' },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: {
            select: { name: true },
          },
        },
      });
      expect(result).toEqual([
        {
          id: 'audit-1',
          action: 'DATA_SUBJECT_REQUEST_CREATED',
          createdAt: '2026-04-24T10:00:00.000Z',
          actor: { name: 'Dr. Rao' },
        },
        {
          id: 'audit-2',
          action: 'DATA_SUBJECT_REQUEST_UPDATED',
          createdAt: '2026-04-24T10:00:00.000Z',
          actor: undefined,
        },
      ]);
    });
  });
});
