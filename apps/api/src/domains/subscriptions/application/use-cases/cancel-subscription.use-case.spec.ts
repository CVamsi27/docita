import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicTier } from '@workspace/db';
import { CancelSubscriptionUseCase } from './cancel-subscription.use-case';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import type { IClinicOperations } from '@/domains/subscriptions/application/ports/clinic-operations.port';
import type { IPaymentGateway } from '@/domains/subscriptions/application/ports/payment-gateway.port';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  BillingCycle,
  ClinicTier as DomainClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { createFixedClockMock } from '@/test-utils';

function buildSubscription(
  overrides: Partial<Subscription> = {},
): Subscription {
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
    ...overrides,
  });
}

describe('CancelSubscriptionUseCase', () => {
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

  const updateTierAndFeaturesMock =
    jest.fn<IClinicOperations['updateTierAndFeatures']>();
  const emitUpdateMock = jest.fn<IClinicOperations['emitUpdate']>();
  const clinicOps: IClinicOperations = {
    getClinicDetails: jest.fn(),
    updateRazorpayCustomerId: jest.fn(async () => undefined),
    updateTierAndFeatures: updateTierAndFeaturesMock,
    emitUpdate: emitUpdateMock,
  } as unknown as IClinicOperations;

  const cancelSubscriptionMock =
    jest.fn<IPaymentGateway['cancelSubscription']>();
  const paymentGateway = {
    createCustomer: jest.fn(async () => 'cust_1'),
    updateCustomer: jest.fn(async () => undefined),
    createOrder: jest.fn(),
    verifyPayment: jest.fn(async () => ({
      verified: true,
      paymentId: 'pay_1',
      orderId: 'order_1',
      amountCents: 99900,
    })),
    createSubscription: jest.fn(),
    cancelSubscription: cancelSubscriptionMock,
    refundPayment: jest.fn(),
    verifyWebhookSignature: jest.fn(() => true),
  } as unknown as IPaymentGateway;

  let useCase: CancelSubscriptionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CancelSubscriptionUseCase(
      subscriptionRepo,
      clinicOps,
      paymentGateway,
      clock,
    );
    updateTierAndFeaturesMock.mockResolvedValue(undefined);
    emitUpdateMock.mockResolvedValue(undefined);
    cancelSubscriptionMock.mockResolvedValue(undefined);
  });

  it('throws NotFoundException when no subscription exists for the clinic', async () => {
    findByClinicIdMock.mockResolvedValue(null);

    await expect(useCase.execute({ clinicId: 'missing' })).rejects.toThrow(
      NotFoundException,
    );
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('defaults to cancelAtPeriodEnd=true and does not touch the gateway or clinic when no Razorpay id and period-end cancel', async () => {
    findByClinicIdMock.mockResolvedValue(buildSubscription());

    await useCase.execute({ clinicId: 'clinic-1' });

    expect(cancelSubscriptionMock).not.toHaveBeenCalled();
    expect(updateTierAndFeaturesMock).not.toHaveBeenCalled();
    expect(emitUpdateMock).not.toHaveBeenCalled();
    expect(saveMock).toHaveBeenCalledTimes(1);
    const saved = saveMock.mock.calls[0]?.[0] as Subscription;
    expect(saved.cancelAtPeriodEnd).toBe(true);
    expect(saved.cancelledAt).toEqual(clock.now());
    expect(saved.getStatus().value).toBe(SubscriptionStatusEnum.ACTIVE);
  });

  it('cancels the Razorpay subscription when one exists', async () => {
    findByClinicIdMock.mockResolvedValue(
      buildSubscription({ razorpaySubscriptionId: 'rzp_sub_1' }),
    );

    await useCase.execute({ clinicId: 'clinic-1' });

    expect(cancelSubscriptionMock).toHaveBeenCalledWith('rzp_sub_1');
  });

  it('immediate cancel transitions to CANCELLED and demotes the clinic tier to STARTER', async () => {
    findByClinicIdMock.mockResolvedValue(buildSubscription());

    await useCase.execute({
      clinicId: 'clinic-1',
      cancelAtPeriodEnd: false,
      reason: 'switching to manual billing',
    });

    const saved = saveMock.mock.calls[0]?.[0] as Subscription;
    expect(saved.getStatus().value).toBe(SubscriptionStatusEnum.CANCELLED);
    expect(saved.cancelAtPeriodEnd).toBe(false);
    expect(updateTierAndFeaturesMock).toHaveBeenCalledWith(
      'clinic-1',
      ClinicTier.STARTER,
      SubscriptionStatusEnum.CANCELLED,
      {},
    );
    expect(emitUpdateMock).toHaveBeenCalledWith('clinic-1', {
      clinicId: 'clinic-1',
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatusEnum.CANCELLED,
      subscriptionGraceUntil: null,
    });
  });
});
