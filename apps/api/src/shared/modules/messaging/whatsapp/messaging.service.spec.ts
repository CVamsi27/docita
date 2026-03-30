import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('MessagingService', () => {
  let service: MessagingService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;

  const mockLogs = [
    {
      id: 'log-1',
      clinicId: 'clinic-123',
      patientId: 'patient-123',
      type: 'reminder',
      message: 'Appointment reminder sent',
      status: 'DELIVERED',
      createdAt: new Date(),
      patient: { firstName: 'Rahul', lastName: 'Sharma' },
    },
    {
      id: 'log-2',
      clinicId: 'clinic-123',
      patientId: 'patient-456',
      type: 'receipt',
      message: 'Invoice sent',
      status: 'READ',
      createdAt: new Date(),
      patient: { firstName: 'Meera', lastName: 'Nair' },
    },
  ];

  function buildMockPrisma() {
    return {
      whatsappLog: {
        findMany: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(mockLogs),
      },
      patient: {
        count: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(120),
      },
    };
  }

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLogs', () => {
    it('should return logs for a clinic ordered by createdAt desc', async () => {
      const result = await service.getLogs('clinic-123', {});

      expect(mockPrisma.whatsappLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-123' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by patientId when provided', async () => {
      await service.getLogs('clinic-123', { patientId: 'patient-123' });

      expect(mockPrisma.whatsappLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-123', patientId: 'patient-123' },
        }),
      );
    });

    it('should filter by type when provided', async () => {
      await service.getLogs('clinic-123', { type: 'reminder' });

      expect(mockPrisma.whatsappLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-123', type: 'reminder' },
        }),
      );
    });

    it('should use limit when provided', async () => {
      await service.getLogs('clinic-123', { limit: 10 });

      expect(mockPrisma.whatsappLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should default to limit 50 when not provided', async () => {
      await service.getLogs('clinic-123', {});

      expect(mockPrisma.whatsappLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should include patient firstName and lastName', async () => {
      await service.getLogs('clinic-123', {});

      expect(mockPrisma.whatsappLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            patient: { select: { firstName: true, lastName: true } },
          },
        }),
      );
    });
  });

  describe('getWhatsappStats', () => {
    it('should return totalPatients and subscribers counts', async () => {
      mockPrisma.patient.count
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(95);

      const result = await service.getWhatsappStats('clinic-123');

      expect(result.totalPatients).toBe(120);
      expect(result.subscribers).toBe(95);
    });

    it('should count subscribers as patients with non-empty phone number', async () => {
      await service.getWhatsappStats('clinic-123');

      expect(mockPrisma.patient.count).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-123',
          phoneNumber: { not: '' },
        },
      });
    });

    it('should return hardcoded delivery and response rates', async () => {
      const result = await service.getWhatsappStats('clinic-123');

      expect(result.deliveryRate).toBe(98.5);
      expect(result.responseRate).toBe(12.4);
    });
  });
});
