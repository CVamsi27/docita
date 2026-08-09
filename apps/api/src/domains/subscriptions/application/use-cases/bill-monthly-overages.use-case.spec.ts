import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicTier } from '@workspace/db';
import { BillMonthlyOveragesUseCase } from './bill-monthly-overages.use-case';
import type { SubscriptionPersistencePort } from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import { SubscriptionOverageMeterService } from '@/domains/subscriptions/application/services/subscription-overage-meter.service';
import { GLOBAL_BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';

describe('BillMonthlyOveragesUseCase', () => {
  const runUnrestrictedMock = jest.fn<
    (callback: () => Promise<void>) => Promise<void>
  >();
  const findManyMock = jest.fn<
    (args: unknown) => Promise<
      Array<{
        id: string;
        clinicId: string;
        plan: ClinicTier;
        currency: string;
        includedAppointments: number | null;
        includedUsers: number | null;
      }>
    >
  >();

  const persistence = {
    runUnrestricted: runUnrestrictedMock,
    subscription: { findMany: findManyMock },
  } as unknown as SubscriptionPersistencePort;

  const processSubscriptionOverageMock = jest.fn<
    (
      sub: {
        id: string;
        clinicId: string;
        plan: string;
        currency: string;
      },
      periodStart: Date,
      periodEnd: Date,
    ) => Promise<void>
  >();
  const overageMeterService = Object.create(
    SubscriptionOverageMeterService.prototype,
  ) as SubscriptionOverageMeterService;
  overageMeterService.processSubscriptionOverage =
    processSubscriptionOverageMock;

  let useCase: BillMonthlyOveragesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new BillMonthlyOveragesUseCase(
      persistence,
      overageMeterService,
    );
    runUnrestrictedMock.mockImplementation(async (callback) => {
      await callback();
    });
  });

  it('queries active and trialing subscriptions under the bulk-read cap inside the RLS-bypass scope', async () => {
    findManyMock.mockResolvedValue([]);

    await useCase.execute({
      periodStart: new Date('2026-05-01T00:00:00.000Z'),
      periodEnd: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(runUnrestrictedMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
        take: GLOBAL_BULK_READ_LIMIT,
      }),
    );
  });

  it('processes overage for every returned subscription with the period bounds', async () => {
    const subs = [
      {
        id: 'sub-1',
        clinicId: 'clinic-1',
        plan: ClinicTier.ESSENTIAL,
        currency: 'INR',
        includedAppointments: 100,
        includedUsers: 3,
      },
      {
        id: 'sub-2',
        clinicId: 'clinic-2',
        plan: ClinicTier.PROFESSIONAL,
        currency: 'INR',
        includedAppointments: 300,
        includedUsers: 10,
      },
    ];
    findManyMock.mockResolvedValue(subs);
    processSubscriptionOverageMock.mockResolvedValue(undefined);

    await useCase.execute({
      periodStart: new Date('2026-05-01T00:00:00.000Z'),
      periodEnd: new Date('2026-05-31T23:59:59.999Z'),
    });

    expect(processSubscriptionOverageMock).toHaveBeenCalledTimes(2);
    expect(processSubscriptionOverageMock).toHaveBeenCalledWith(
      subs[0],
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-31T23:59:59.999Z'),
    );
    expect(processSubscriptionOverageMock).toHaveBeenCalledWith(
      subs[1],
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-05-31T23:59:59.999Z'),
    );
  });

  it('isolates a rejected subscription so remaining overage billing still runs', async () => {
    findManyMock.mockResolvedValue([
      {
        id: 'sub-fail',
        clinicId: 'clinic-fail',
        plan: ClinicTier.ESSENTIAL,
        currency: 'INR',
        includedAppointments: 100,
        includedUsers: 3,
      },
      {
        id: 'sub-ok',
        clinicId: 'clinic-ok',
        plan: ClinicTier.ESSENTIAL,
        currency: 'INR',
        includedAppointments: 100,
        includedUsers: 3,
      },
    ]);
    processSubscriptionOverageMock.mockRejectedValueOnce(
      new Error('billing provider down'),
    );
    processSubscriptionOverageMock.mockResolvedValueOnce(undefined);

    await expect(
      useCase.execute({
        periodStart: new Date('2026-05-01T00:00:00.000Z'),
        periodEnd: new Date('2026-05-31T23:59:59.999Z'),
      }),
    ).resolves.toBeUndefined();

    expect(processSubscriptionOverageMock).toHaveBeenCalledTimes(2);
  });
});
