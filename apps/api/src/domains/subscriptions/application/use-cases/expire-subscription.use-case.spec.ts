import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicTier } from '@workspace/db';
import { ExpireSubscriptionUseCase } from './expire-subscription.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  BillingCycle,
  ClinicTier as DomainClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { createFixedClockMock } from '@/test-utils';

function buildSubscription(): Subscription {
  return new Subscription({
    id: 'sub-1',
    clinicId: 'clinic-1',
    plan: DomainClinicTier.fromString('ESSENTIAL'),
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

describe('ExpireSubscriptionUseCase', () => {
  const clock = createFixedClockMock('2026-06-05T10:00:00.000Z');

  const findByIdMock = jest.fn<ISubscriptionRepository['findById']>();
  const saveMock = jest.fn<ISubscriptionRepository['save']>();
  const subscriptionRepo: ISubscriptionRepository = {
    save: saveMock,
    findById: findByIdMock,
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

  const updateTierAndFeaturesMock =
    jest.fn<IClinicOperations['updateTierAndFeatures']>();
  const emitUpdateMock = jest.fn<IClinicOperations['emitUpdate']>();
  const clinicOps: IClinicOperations = {
    getClinicDetails: jest.fn(),
    updateRazorpayCustomerId: jest.fn(async () => undefined),
    updateTierAndFeatures: updateTierAndFeaturesMock,
    emitUpdate: emitUpdateMock,
  } as unknown as IClinicOperations;

  let useCase: ExpireSubscriptionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ExpireSubscriptionUseCase(subscriptionRepo, clinicOps, clock);
    updateTierAndFeaturesMock.mockResolvedValue(undefined);
    emitUpdateMock.mockResolvedValue(undefined);
  });

  it('throws NotFoundException when the subscription does not exist', async () => {
    findByIdMock.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('expires the subscription, demotes the clinic to STARTER, and emits the update', async () => {
    findByIdMock.mockResolvedValue(buildSubscription());

    await useCase.execute('sub-1');

    const saved = saveMock.mock.calls[0]?.[0] as Subscription;
    expect(saved.getStatus().value).toBe(SubscriptionStatusEnum.EXPIRED);
    expect(saved.getGraceUntil()).toBeNull();
    expect(updateTierAndFeaturesMock).toHaveBeenCalledWith(
      'clinic-1',
      ClinicTier.STARTER,
      SubscriptionStatusEnum.EXPIRED,
      {},
    );
    expect(emitUpdateMock).toHaveBeenCalledWith('clinic-1', {
      clinicId: 'clinic-1',
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatusEnum.EXPIRED,
      subscriptionGraceUntil: null,
    });
  });
});
