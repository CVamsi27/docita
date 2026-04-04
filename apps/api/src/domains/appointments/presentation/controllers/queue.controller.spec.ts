import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueueController } from './queue.controller';
import { QueueService } from '@/domains/appointments/application/services/queue.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';

describe('QueueController', () => {
  let controller: QueueController;

  const mockQueueService = {
    getQueue: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    getTodayQueue: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    checkIn: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    callPatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    completePatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    resetQueue: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    })
      .overrideGuard(TierGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<QueueController>(QueueController);
    jest.clearAllMocks();
  });

  const getQueueUnsafe = (
    req: {
      user: {
        id: string;
        clinicId: string;
        role: string;
      };
    },
    doctorId?: string,
    search?: string,
  ) =>
    (
      controller.getQueue as (
        req: {
          user: {
            id: string;
            clinicId: string;
            role: string;
          };
        },
        doctorId?: string,
        search?: string,
      ) => ReturnType<QueueController['getQueue']>
    )(req, doctorId, search);

  const getTodayQueueUnsafe = (
    req: {
      user: {
        id: string;
        clinicId: string;
        role: string;
      };
    },
    doctorId?: string,
    search?: string,
  ) =>
    (
      controller.getTodayQueue as (
        req: {
          user: {
            id: string;
            clinicId: string;
            role: string;
          };
        },
        doctorId?: string,
        search?: string,
      ) => ReturnType<QueueController['getTodayQueue']>
    )(req, doctorId, search);

  it('forces doctors to their own queue scope even when another doctorId is requested', async () => {
    mockQueueService.getQueue.mockResolvedValue([]);

    await getQueueUnsafe(
      {
        user: {
          id: 'doctor-1',
          clinicId: 'clinic-1',
          role: 'DOCTOR',
        },
      },
      'doctor-2',
      'john',
    );

    expect(mockQueueService.getQueue).toHaveBeenCalledWith(
      'clinic-1',
      'doctor-1',
      'john',
    );
  });

  it('allows clinic-wide roles to filter by any doctor id', async () => {
    mockQueueService.getQueue.mockResolvedValue([]);

    await getQueueUnsafe(
      {
        user: {
          id: 'admin-doctor-1',
          clinicId: 'clinic-1',
          role: 'ADMIN_DOCTOR',
        },
      },
      'doctor-2',
      undefined,
    );

    expect(mockQueueService.getQueue).toHaveBeenCalledWith(
      'clinic-1',
      'doctor-2',
      undefined,
    );
  });

  it('applies the same doctor self-scope behavior for today queue', async () => {
    mockQueueService.getTodayQueue.mockResolvedValue({
      patients: [],
      stats: {},
    });

    await getTodayQueueUnsafe(
      {
        user: {
          id: 'doctor-1',
          clinicId: 'clinic-1',
          role: 'DOCTOR',
        },
      },
      'doctor-2',
      undefined,
    );

    expect(mockQueueService.getTodayQueue).toHaveBeenCalledWith(
      'clinic-1',
      'doctor-1',
      undefined,
    );
  });
});
