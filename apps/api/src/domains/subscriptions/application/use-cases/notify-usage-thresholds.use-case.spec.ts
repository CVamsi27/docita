import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotifyUsageThresholdsUseCase } from './notify-usage-thresholds.use-case';
import type { SubscriptionPersistencePort } from '@/domains/subscriptions/application/ports/subscription-persistence.port';
import type { IClinicUsagePort } from '@/domains/billing/application/ports';
import { UsageThresholdNotifierService } from '@/domains/subscriptions/application/services/usage-threshold-notifier.service';
import { GLOBAL_BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';

describe('NotifyUsageThresholdsUseCase', () => {
  const runUnrestrictedMock = jest.fn<
    (callback: () => Promise<void>) => Promise<void>
  >();
  const findManyMock = jest.fn<
    (args: unknown) => Promise<Array<{ clinicId: string }>>
  >();

  const persistence = {
    runUnrestricted: runUnrestrictedMock,
    subscription: { findMany: findManyMock },
  } as unknown as SubscriptionPersistencePort;

  const getCurrentUsageMock = jest.fn<IClinicUsagePort['getCurrentUsage']>();
  const clinicUsage: IClinicUsagePort = {
    getCurrentUsage: getCurrentUsageMock,
    trackPrescription: jest.fn(async () => undefined),
  } as unknown as IClinicUsagePort;

  const processUsageWarningsMock = jest.fn<
    (clinicId: string, usage: unknown) => Promise<void>
  >();
  const usageThresholdNotifier = Object.create(
    UsageThresholdNotifierService.prototype,
  ) as UsageThresholdNotifierService;
  usageThresholdNotifier.processUsageWarnings = processUsageWarningsMock;

  let useCase: NotifyUsageThresholdsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new NotifyUsageThresholdsUseCase(
      persistence,
      clinicUsage,
      usageThresholdNotifier,
    );
    runUnrestrictedMock.mockImplementation(async (callback) => {
      await callback();
    });
  });

  it('queries clinic ids under the bulk-read cap and warns for each with its usage', async () => {
    findManyMock.mockResolvedValue([
      { clinicId: 'clinic-1' },
      { clinicId: 'clinic-2' },
    ]);
    getCurrentUsageMock.mockResolvedValue({
      period: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-31T23:59:59.999Z',
      },
    } as never);
    processUsageWarningsMock.mockResolvedValue(undefined);

    await useCase.execute();

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['ACTIVE', 'TRIALING'] } },
        take: GLOBAL_BULK_READ_LIMIT,
      }),
    );
    expect(getCurrentUsageMock).toHaveBeenCalledWith('clinic-1');
    expect(getCurrentUsageMock).toHaveBeenCalledWith('clinic-2');
    expect(processUsageWarningsMock).toHaveBeenCalledWith(
      'clinic-1',
      expect.objectContaining({ period: expect.anything() }),
    );
    expect(processUsageWarningsMock).toHaveBeenCalledWith(
      'clinic-2',
      expect.objectContaining({ period: expect.anything() }),
    );
  });

  it('does not dispatch warnings when no subscriptions are active', async () => {
    findManyMock.mockResolvedValue([]);

    await useCase.execute();

    expect(getCurrentUsageMock).not.toHaveBeenCalled();
    expect(processUsageWarningsMock).not.toHaveBeenCalled();
  });

  it('isolates a rejected clinic so the remaining checks still run', async () => {
    findManyMock.mockResolvedValue([
      { clinicId: 'clinic-fail' },
      { clinicId: 'clinic-ok' },
    ]);
    getCurrentUsageMock.mockRejectedValueOnce(new Error('usage port down'));
    getCurrentUsageMock.mockResolvedValueOnce({
      period: {
        start: '2026-05-01T00:00:00.000Z',
        end: '2026-05-31T23:59:59.999Z',
      },
    } as never);
    processUsageWarningsMock.mockResolvedValue(undefined);

    await expect(useCase.execute()).resolves.toBeUndefined();

    expect(processUsageWarningsMock).toHaveBeenCalledTimes(1);
    expect(processUsageWarningsMock).toHaveBeenCalledWith(
      'clinic-ok',
      expect.anything(),
    );
  });
});
