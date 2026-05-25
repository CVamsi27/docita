import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SubscriptionStatus } from '@workspace/db';
import { NotifyExpiringSubscriptionsUseCase } from './notify-expiring-subscriptions.use-case';
import { ISubscriptionRepository } from '@/domains/subscriptions/application/ports';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { createFixedClockMock } from '@/test-utils';

describe('NotifyExpiringSubscriptionsUseCase', () => {
  const clock = createFixedClockMock();
  const findSubscriptionsMock =
    jest.fn<ISubscriptionRepository['findExpiryReminderCandidates']>();
  const findRecentReminderClinicIdsMock =
    jest.fn<ISubscriptionRepository['findRecentReminderClinicIds']>();
  const createSubscriptionRemindersMock =
    jest.fn<ISubscriptionRepository['createSubscriptionReminders']>();

  const subscriptionRepository: ISubscriptionRepository = {
    save: jest.fn(async () => undefined),
    findById: jest.fn(async () => null),
    findByClinicId: jest.fn(async () => null),
    findByStatus: jest.fn(async () => []),
    findApproachingRenewal: jest.fn(async () => []),
    update: jest.fn(async () => undefined),
    markClinicPastDue: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    findBillingContact: jest.fn(async () => ({
      name: null,
      email: null,
      phoneNumber: null,
    })),
    findExpiryReminderCandidates: findSubscriptionsMock,
    findGraceDeadlineReminderCandidates: jest.fn(async () => []),
    findRecentReminderClinicIds: findRecentReminderClinicIdsMock,
    createSubscriptionReminders: createSubscriptionRemindersMock,
    savePayment: jest.fn(async () => undefined),
    updatePaymentStatus: jest.fn(async () => undefined),
    updatePaymentStatusById: jest.fn(async () => undefined),
    findPaymentsByClinicId: jest.fn(async () => []),
    findPaymentById: jest.fn(async () => null),
    findPaymentByOrderId: jest.fn(async () => null),
    updatePaymentLink: jest.fn(async () => undefined),
    expireDuplicatePendingCheckouts: jest.fn(async () => 0),
    expireOtherPendingSubscriptionCheckouts: jest.fn(async () => 0),
    findReusablePendingCheckout: jest.fn(async () => null),
  };

  let useCase: NotifyExpiringSubscriptionsUseCase;
  const emailService = Object.create(EmailService.prototype) as EmailService;
  emailService.send = jest.fn<EmailService['send']>().mockResolvedValue({
    success: true,
    messageId: 'msg_1',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new NotifyExpiringSubscriptionsUseCase(
      subscriptionRepository,
      emailService,
      clock,
    );
  });

  it('creates at most one reminder per clinic after prefetch dedupe', async () => {
    findSubscriptionsMock.mockResolvedValue([
      {
        id: 'sub-1',
        clinicId: 'clinic-1',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date('2026-04-10T00:00:00.000Z'),
        clinic: {
          name: 'Clinic 1',
          users: [{ email: 'a@c1.test', name: 'A' }],
        },
      },
      {
        id: 'sub-2',
        clinicId: 'clinic-1',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date('2026-04-10T00:00:00.000Z'),
        clinic: {
          name: 'Clinic 1',
          users: [{ email: 'a@c1.test', name: 'A' }],
        },
      },
      {
        id: 'sub-3',
        clinicId: 'clinic-2',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date('2026-04-10T00:00:00.000Z'),
        clinic: {
          name: 'Clinic 2',
          users: [{ email: 'a@c2.test', name: 'A' }],
        },
      },
    ]);
    findRecentReminderClinicIdsMock.mockResolvedValue(['clinic-2']);
    createSubscriptionRemindersMock.mockResolvedValue(undefined);

    await useCase.execute({
      targetDate: new Date('2026-04-10T00:00:00.000Z'),
      reminderType: 'expiry_7d',
    });

    expect(findRecentReminderClinicIdsMock).toHaveBeenCalledTimes(1);
    expect(createSubscriptionRemindersMock).toHaveBeenCalledTimes(1);
    expect(createSubscriptionRemindersMock).toHaveBeenCalledWith([
      expect.objectContaining({
        clinicId: 'clinic-1',
        subscriptionId: 'sub-1',
        type: 'expiry_7d',
        channel: 'EMAIL',
        status: 'sent',
      }),
    ]);
  });

  it('uses same-day subject when reminder type is expiry_0d', async () => {
    findSubscriptionsMock.mockResolvedValue([
      {
        id: 'sub-today',
        clinicId: 'clinic-today',
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd: new Date('2026-04-10T00:00:00.000Z'),
        clinic: {
          name: 'Today Clinic',
          users: [{ email: 'a@today.test', name: 'A' }],
        },
      },
    ]);
    findRecentReminderClinicIdsMock.mockResolvedValue([]);
    createSubscriptionRemindersMock.mockResolvedValue(undefined);

    await useCase.execute({
      targetDate: new Date('2026-04-10T00:00:00.000Z'),
      reminderType: 'expiry_0d',
    });

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Docita trial ends today',
      }),
    );
  });

  it('uses trial-specific email copy for TRIALING subscriptions', async () => {
    findSubscriptionsMock.mockResolvedValue([
      {
        id: 'sub-trial',
        clinicId: 'clinic-trial',
        status: SubscriptionStatus.TRIALING,
        currentPeriodEnd: new Date('2026-04-10T00:00:00.000Z'),
        clinic: {
          name: 'Trial Clinic',
          users: [{ email: 'admin@trial.test', name: 'Admin' }],
        },
      },
    ]);
    findRecentReminderClinicIdsMock.mockResolvedValue([]);
    createSubscriptionRemindersMock.mockResolvedValue(undefined);

    await useCase.execute({
      targetDate: new Date('2026-04-10T00:00:00.000Z'),
      reminderType: 'expiry_14d',
    });

    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Docita trial ends in 14 days',
        text: expect.stringContaining('trial for "Trial Clinic"'),
      }),
    );
  });

  it('skips reminder writes when no subscriptions expire for the target date', async () => {
    findSubscriptionsMock.mockResolvedValue([]);

    await useCase.execute({
      targetDate: new Date('2026-04-10T00:00:00.000Z'),
      reminderType: 'expiry_7d',
    });

    expect(findRecentReminderClinicIdsMock).not.toHaveBeenCalled();
    expect(createSubscriptionRemindersMock).not.toHaveBeenCalled();
  });
});
