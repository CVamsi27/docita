import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotifyExpiringSubscriptionsUseCase } from '@/domains/subscriptions/application/use-cases/notify-expiring-subscriptions.use-case';
import { ExpireSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/expire-subscription.use-case';
import { EnterGracePeriodUseCase } from '@/domains/subscriptions/application/use-cases/enter-grace-period.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionReminderScheduler } from './subscription-reminder.scheduler';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';

describe('SubscriptionReminderScheduler', () => {
  let scheduler: SubscriptionReminderScheduler;
  const notifyExecuteMock = jest
    .fn<NotifyExpiringSubscriptionsUseCase['execute']>()
    .mockResolvedValue({
      reminderType: 'expiry_7d',
      matchedSubscriptions: 0,
      attemptedClinics: 0,
      sent: 0,
      failed: 0,
    });
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

  const notifyUseCase = Object.create(
    NotifyExpiringSubscriptionsUseCase.prototype,
  ) as NotifyExpiringSubscriptionsUseCase;
  notifyUseCase.execute = notifyExecuteMock;

  const expireUseCase = Object.create(
    ExpireSubscriptionUseCase.prototype,
  ) as ExpireSubscriptionUseCase;
  expireUseCase.execute = expireExecuteMock;

  const graceUseCase = Object.create(
    EnterGracePeriodUseCase.prototype,
  ) as EnterGracePeriodUseCase;
  graceUseCase.execute = graceExecuteMock;

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    runUnrestricted: {
      value: runUnrestrictedMock.mockImplementation(
        async (callback: () => Promise<void>) => callback(),
      ),
      writable: true,
    },
    subscription: {
      value: {
        findMany: findManyMock,
        update: subscriptionUpdateMock,
      },
      writable: true,
    },
    clinic: {
      value: {
        update: clinicUpdateMock,
      },
      writable: true,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const adminAlerts = Object.create(
      AdminAlertsService.prototype,
    ) as AdminAlertsService;
    adminAlerts.sendAdminAlert = jest
      .fn<AdminAlertsService['sendAdminAlert']>()
      .mockResolvedValue(false);
    adminAlerts.markRecovered = jest
      .fn<AdminAlertsService['markRecovered']>()
      .mockResolvedValue(false);

    scheduler = new SubscriptionReminderScheduler(
      notifyUseCase,
      expireUseCase,
      graceUseCase,
      prisma,
      adminAlerts,
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
