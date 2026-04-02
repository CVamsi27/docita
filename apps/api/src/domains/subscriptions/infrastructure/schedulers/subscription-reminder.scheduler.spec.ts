import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SubscriptionReminderScheduler } from './subscription-reminder.scheduler';

describe('SubscriptionReminderScheduler', () => {
  let scheduler: SubscriptionReminderScheduler;
  const notifyExecuteMock = jest.fn<() => Promise<void>>();
  const expireExecuteMock =
    jest.fn<(subscriptionId: string) => Promise<void>>();
  const graceExecuteMock = jest.fn<(subscriptionId: string) => Promise<void>>();
  const runUnrestrictedMock =
    jest.fn<(callback: () => Promise<void>) => Promise<void>>();
  const findManyMock =
    jest.fn<() => Promise<Array<{ id: string; clinicId?: string }>>>();
  const subscriptionUpdateMock =
    jest.fn<(args: unknown) => Promise<Record<string, never>>>();
  const clinicUpdateMock =
    jest.fn<(args: unknown) => Promise<Record<string, never>>>();

  const notifyUseCase = {
    execute: notifyExecuteMock,
  };
  const expireUseCase = {
    execute: expireExecuteMock,
  };
  const graceUseCase = {
    execute: graceExecuteMock,
  };

  const prisma = {
    runUnrestricted: runUnrestrictedMock.mockImplementation(
      async (callback: () => Promise<void>) => callback(),
    ),
    subscription: {
      findMany: findManyMock,
      update: subscriptionUpdateMock,
    },
    clinic: {
      update: clinicUpdateMock,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new SubscriptionReminderScheduler(
      notifyUseCase as never,
      expireUseCase as never,
      graceUseCase as never,
      prisma as never,
    );
  });

  it('converts expired trial subscriptions to STARTER free fallback', async () => {
    findManyMock
      .mockResolvedValueOnce([{ id: 'sub_trial_1', clinicId: 'clinic_1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    subscriptionUpdateMock.mockResolvedValue({} as Record<string, never>);
    clinicUpdateMock.mockResolvedValue({} as Record<string, never>);

    await scheduler.handleLapsedSubscriptions();

    expect(subscriptionUpdateMock).toHaveBeenCalledTimes(1);
    expect(subscriptionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub_trial_1' },
        data: expect.objectContaining({
          plan: 'STARTER',
          status: 'ACTIVE',
          basePriceCents: 0,
        }),
      }),
    );
    expect(clinicUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clinic_1' },
        data: expect.objectContaining({
          tier: 'STARTER',
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        }),
      }),
    );
  });

  it('still moves lapsed ACTIVE subscriptions into grace period', async () => {
    findManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'sub_active_1' }])
      .mockResolvedValueOnce([]);

    await scheduler.handleLapsedSubscriptions();

    expect(graceUseCase.execute).toHaveBeenCalledWith('sub_active_1');
  });
});
