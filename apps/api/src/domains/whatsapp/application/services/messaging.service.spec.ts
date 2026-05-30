import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappLogStatus } from '@workspace/db';
import { MessagingService } from './messaging.service';
import { WHATSAPP_PERSISTENCE_PORT } from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { createFixedClockMock } from '@/test-utils/fixed-clock.mock';
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
        groupBy: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue([
            { status: WhatsappLogStatus.DELIVERED, _count: { _all: 8 } },
            { status: WhatsappLogStatus.SENT, _count: { _all: 2 } },
          ]),
        count: jest
          .fn<(...args: unknown[]) => Promise<unknown>>()
          .mockResolvedValue(1),
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
        { provide: WHATSAPP_PERSISTENCE_PORT, useValue: mockPrisma },
        {
          provide: CLOCK_PORT,
          useValue: createFixedClockMock('2026-05-30T12:00:00.000Z'),
        },
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
  });

  describe('getWhatsappStats', () => {
    it('should return patient counts and computed delivery metrics', async () => {
      mockPrisma.patient.count
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(95);

      const result = await service.getWhatsappStats('clinic-123');

      expect(result.totalPatients).toBe(120);
      expect(result.subscribers).toBe(95);
      expect(result.outboundLast30Days).toBe(10);
      expect(result.deliveryRate).toBe(80);
      expect(result.staleDeliveryCount).toBe(1);
      expect(result.responseRate).toBeNull();
    });

    it('should aggregate log statuses for the trailing 30-day window', async () => {
      await service.getWhatsappStats('clinic-123');

      expect(mockPrisma.whatsappLog.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['status'],
          where: expect.objectContaining({ clinicId: 'clinic-123' }),
        }),
      );
    });
  });
});
