import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotifyExpiringSubscriptionsUseCase } from '@/domains/subscriptions/application/use-cases/notify-expiring-subscriptions.use-case';
import { NotifySubscriptionGraceDeadlineUseCase } from '@/domains/subscriptions/application/use-cases/notify-subscription-grace-deadline.use-case';
import { EnterGracePeriodUseCase } from '@/domains/subscriptions/application/use-cases/enter-grace-period.use-case';
import { ExpireSubscriptionUseCase } from '@/domains/subscriptions/application/use-cases/expire-subscription.use-case';
import { PrismaService } from '@/prisma/prisma.service';
import { SubscriptionReminderScheduler } from './subscription-reminder.scheduler';
import { AdminAlertsService } from '@/shared/modules/messaging/admin-alerts/admin-alerts.service';
import type { IClock } from '@/shared/common/ports/clock.port';

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
  const graceExecuteMock = jest.fn<(subscriptionId: string) => Promise<void>>();
  const expireExecuteMock =
    jest.fn<(subscriptionId: string) => Promise<void>>();
  const notifyGraceDeadlineExecuteMock = jest
    .fn<NotifySubscriptionGraceDeadlineUseCase['execute']>()
    .mockResolvedValue({
      reminderType: 'grace_deadline_3d',
      matchedSubscriptions: 0,
      attemptedClinics: 0,
      sent: 0,
      failed: 0,
    });
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

  const notifyGraceDeadlineUseCase = Object.create(
    NotifySubscriptionGraceDeadlineUseCase.prototype,
  ) as NotifySubscriptionGraceDeadlineUseCase;
  notifyGraceDeadlineUseCase.execute = notifyGraceDeadlineExecuteMock;

  const graceUseCase = Object.create(
    EnterGracePeriodUseCase.prototype,
  ) as EnterGracePeriodUseCase;
  graceUseCase.execute = graceExecuteMock;

  const expireUseCase = Object.create(
    ExpireSubscriptionUseCase.prototype,
  ) as ExpireSubscriptionUseCase;
  expireUseCase.execute = expireExecuteMock;

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

    const clock: IClock = {
      now: () => new Date('2026-05-19T12:00:00.000Z'),
    };

    scheduler = new SubscriptionReminderScheduler(
      notifyUseCase,
      notifyGraceDeadlineUseCase,
      graceUseCase,
      expireUseCase,
      prisma,
      adminAlerts,
      clock,
    );
  });

  it('moves expired trial subscriptions into grace via EnterGracePeriodUseCase', async () => {
    findManyMock
      .mockResolvedValueOnce([{ id: 'sub_trial_1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await scheduler.handleLapsedSubscriptions();

    expect(graceExecuteMock).toHaveBeenCalledWith('sub_trial_1');
    expect(subscriptionUpdateMock).not.toHaveBeenCalled();
    expect(clinicUpdateMock).not.toHaveBeenCalled();
    expect(expireExecuteMock).not.toHaveBeenCalled();
  });

  it('still moves lapsed ACTIVE subscriptions into grace period', async () => {
    findManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'sub_active_1' }])
      .mockResolvedValueOnce([]);

    await scheduler.handleLapsedSubscriptions();

    expect(graceUseCase.execute).toHaveBeenCalledWith('sub_active_1');
    expect(expireExecuteMock).not.toHaveBeenCalled();
  });

  it('expires subscriptions past grace deadline via ExpireSubscriptionUseCase', async () => {
    findManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'sub_grace_expired' }]);

    await scheduler.handleLapsedSubscriptions();

    expect(expireExecuteMock).toHaveBeenCalledWith('sub_grace_expired');
    expect(graceExecuteMock).not.toHaveBeenCalled();
  });
});
