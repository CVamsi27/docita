import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NotifySubscriptionGraceDeadlineUseCase } from './notify-subscription-grace-deadline.use-case';
import { ISubscriptionRepository } from '@/domains/subscriptions/application/ports';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { createFixedClockMock } from '@/test-utils';

describe('NotifySubscriptionGraceDeadlineUseCase', () => {
  const clock = createFixedClockMock('2026-05-15T10:00:00.000Z');
  const findCandidatesMock =
    jest.fn<ISubscriptionRepository['findGraceDeadlineReminderCandidates']>();
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
    findExpiryReminderCandidates: jest.fn(async () => []),
    findGraceDeadlineReminderCandidates: findCandidatesMock,
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
    findPaymentByRazorpayPaymentId: jest.fn(async () => null),
  };

  let useCase: NotifySubscriptionGraceDeadlineUseCase;
  const emailService = Object.create(EmailService.prototype) as EmailService;
  emailService.send = jest.fn<EmailService['send']>().mockResolvedValue({
    success: true,
    messageId: 'msg_1',
  });

  const candidate = {
    id: 'sub-1',
    clinicId: 'clinic-1',
    graceUntil: new Date('2026-05-25T00:00:00.000Z'),
    clinic: {
      name: 'Grace Clinic',
      users: [{ email: 'admin@grace.test', name: 'Admin' }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new NotifySubscriptionGraceDeadlineUseCase(
      subscriptionRepository,
      emailService,
      clock,
    );
    findRecentReminderClinicIdsMock.mockResolvedValue([]);
    createSubscriptionRemindersMock.mockResolvedValue(undefined);
  });

  it('queries candidates within the target day UTC bounds', async () => {
    findCandidatesMock.mockResolvedValue([]);

    await useCase.execute({
      targetDate: new Date('2026-05-15T00:00:00.000Z'),
      reminderType: 'grace_deadline_3d',
    });

    expect(findCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        startOfDay: expect.any(Date),
        endOfDay: expect.any(Date),
      }),
    );
  });

  it.each([
    [
      'grace_deadline_7d',
      'Docita subscription: 7 days left to resolve billing',
    ],
    [
      'grace_deadline_3d',
      'Docita subscription: 3 days left to resolve billing',
    ],
    ['grace_deadline_1d', 'Docita subscription: 1 day left to resolve billing'],
    ['grace_deadline_today', 'Docita subscription: billing deadline is today'],
  ] as const)(
    'uses the day-specific subject for %s',
    async (reminderType, expectedSubject) => {
      findCandidatesMock.mockResolvedValue([candidate]);
      findRecentReminderClinicIdsMock.mockResolvedValue([]);

      await useCase.execute({
        targetDate: new Date('2026-05-15T00:00:00.000Z'),
        reminderType,
      });

      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expectedSubject }),
      );
    },
  );

  it('skips candidates without a grace deadline and reports matched vs attempted', async () => {
    findCandidatesMock.mockResolvedValue([
      candidate,
      { ...candidate, id: 'sub-2', clinicId: 'clinic-2', graceUntil: null },
    ]);
    findRecentReminderClinicIdsMock.mockResolvedValue([]);

    const result = await useCase.execute({
      targetDate: new Date('2026-05-15T00:00:00.000Z'),
      reminderType: 'grace_deadline_3d',
    });

    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      reminderType: 'grace_deadline_3d',
      matchedSubscriptions: 2,
      attemptedClinics: 1,
      sent: 1,
      failed: 0,
    });
    expect(createSubscriptionRemindersMock).toHaveBeenCalledWith([
      expect.objectContaining({
        clinicId: 'clinic-1',
        subscriptionId: 'sub-1',
        type: 'grace_deadline_3d',
        channel: 'EMAIL',
        status: 'sent',
      }),
    ]);
  });

  it('returns zeroed results and sends nothing when no candidates match', async () => {
    findCandidatesMock.mockResolvedValue([]);

    const result = await useCase.execute({
      targetDate: new Date('2026-05-15T00:00:00.000Z'),
      reminderType: 'grace_deadline_1d',
    });

    expect(emailService.send).not.toHaveBeenCalled();
    expect(findRecentReminderClinicIdsMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      reminderType: 'grace_deadline_1d',
      matchedSubscriptions: 0,
      attemptedClinics: 0,
      sent: 0,
      failed: 0,
    });
  });
});
