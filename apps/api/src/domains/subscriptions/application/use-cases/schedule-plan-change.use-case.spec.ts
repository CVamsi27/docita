import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SchedulePlanChangeUseCase } from './schedule-plan-change.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  BillingCycle,
  ClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { createFixedClockMock } from '@/test-utils';

function buildSubscription(): Subscription {
  return new Subscription({
    id: 'sub-1',
    clinicId: 'clinic-1',
    plan: ClinicTier.fromString('ESSENTIAL'),
    billingCycle: BillingCycle.fromString('MONTHLY'),
    basePriceCents: 99900,
    status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
    autoPayEnabled: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    version: 1,
  });
}

describe('SchedulePlanChangeUseCase', () => {
  const clock = createFixedClockMock('2026-05-10T10:00:00.000Z');

  const findByClinicIdMock =
    jest.fn<ISubscriptionRepository['findByClinicId']>();
  const saveMock = jest.fn<ISubscriptionRepository['save']>();
  const subscriptionRepo: ISubscriptionRepository = {
    save: saveMock,
    findById: jest.fn(async () => null),
    findByClinicId: findByClinicIdMock,
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
    findGraceDeadlineReminderCandidates: jest.fn(async () => []),
    findRecentReminderClinicIds: jest.fn(async () => []),
    createSubscriptionReminders: jest.fn(async () => undefined),
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

  let useCase: SchedulePlanChangeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SchedulePlanChangeUseCase(subscriptionRepo, clock);
  });

  describe('execute', () => {
    it('throws NotFoundException when the clinic has no subscription', async () => {
      findByClinicIdMock.mockResolvedValue(null);

      await expect(
        useCase.execute({
          clinicId: 'missing',
          tier: 'STARTER',
          cycle: 'MONTHLY',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(saveMock).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the target is the current plan and cycle', async () => {
      findByClinicIdMock.mockResolvedValue(buildSubscription());

      await expect(
        useCase.execute({
          clinicId: 'clinic-1',
          tier: 'ESSENTIAL',
          cycle: 'MONTHLY',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(saveMock).not.toHaveBeenCalled();
    });

    it('schedules the change at the current period end and returns the scheduled payload', async () => {
      findByClinicIdMock.mockResolvedValue(buildSubscription());

      const result = await useCase.execute({
        clinicId: 'clinic-1',
        tier: 'STARTER',
        cycle: 'MONTHLY',
        planMode: 'CORE',
      });

      const saved = saveMock.mock.calls[0]?.[0] as Subscription;
      expect(saved.scheduledChange).toEqual({
        plan: 'STARTER',
        billingCycle: 'MONTHLY',
        effectiveAt: '2026-06-01T00:00:00.000Z',
        planMode: 'CORE',
      });
      expect(result).toEqual({
        scheduled: {
          tier: 'STARTER',
          cycle: 'MONTHLY',
          effectiveAt: '2026-06-01T00:00:00.000Z',
          planMode: 'CORE',
        },
      });
    });

    it('omits planMode from the payload when not provided', async () => {
      findByClinicIdMock.mockResolvedValue(buildSubscription());

      const result = await useCase.execute({
        clinicId: 'clinic-1',
        tier: 'STARTER',
        cycle: 'MONTHLY',
      });

      expect(result.scheduled).not.toHaveProperty('planMode');
    });
  });

  describe('cancel', () => {
    it('throws NotFoundException when the clinic has no subscription', async () => {
      findByClinicIdMock.mockResolvedValue(null);

      await expect(useCase.cancel('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is a no-op when no scheduled change exists', async () => {
      findByClinicIdMock.mockResolvedValue(buildSubscription());

      await useCase.cancel('clinic-1');

      expect(saveMock).not.toHaveBeenCalled();
    });

    it('clears the scheduled change when one exists', async () => {
      const subscription = buildSubscription();
      subscription.schedulePlanChange(
        ClinicTier.fromString('STARTER'),
        BillingCycle.fromString('MONTHLY'),
        subscription.currentPeriodEnd,
        clock.now(),
      );
      findByClinicIdMock.mockResolvedValue(subscription);

      await useCase.cancel('clinic-1');

      const saved = saveMock.mock.calls[0]?.[0] as Subscription;
      expect(saved.scheduledChange).toBeNull();
    });
  });
});
