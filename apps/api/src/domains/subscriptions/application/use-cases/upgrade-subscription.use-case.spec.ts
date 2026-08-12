import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UpgradeSubscriptionUseCase } from './upgrade-subscription.use-case';
import type { UpgradeSubscriptionDto } from '@/domains/subscriptions/application/dto/subscription.dto';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { SubscriptionValidationService } from '@/domains/subscriptions/core/services/subscription-validation.service';
import { ProratingService } from '@/domains/subscriptions/core/services/proration.service';
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
    plan: ClinicTier.fromString('STARTER'),
    billingCycle: BillingCycle.fromString('MONTHLY'),
    basePriceCents: 49900,
    status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
    autoPayEnabled: true,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    version: 1,
  });
}

describe('UpgradeSubscriptionUseCase', () => {
  const clock = createFixedClockMock('2026-05-10T10:00:00.000Z');

  const findByIdMock = jest.fn<ISubscriptionRepository['findById']>();
  const updateMock = jest.fn<ISubscriptionRepository['update']>();
  const subscriptionRepo: ISubscriptionRepository = {
    save: jest.fn(async () => undefined),
    findById: findByIdMock,
    findByClinicId: jest.fn(async () => null),
    findByStatus: jest.fn(async () => []),
    findApproachingRenewal: jest.fn(async () => []),
    update: updateMock,
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

  const getPricePaiseMock =
    jest.fn<SubscriptionPricingService['getPricePaise']>();
  const pricingService = Object.create(
    SubscriptionPricingService.prototype,
  ) as SubscriptionPricingService;
  pricingService.getPricePaise = getPricePaiseMock;

  const canChangePlanMock =
    jest.fn<SubscriptionValidationService['canChangePlan']>();
  const validationService = Object.create(
    SubscriptionValidationService.prototype,
  ) as SubscriptionValidationService;
  validationService.canChangePlan = canChangePlanMock;

  const proratingService = Object.create(
    ProratingService.prototype,
  ) as ProratingService;

  let useCase: UpgradeSubscriptionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpgradeSubscriptionUseCase(
      subscriptionRepo,
      pricingService,
      validationService,
      proratingService,
      clock,
    );
    canChangePlanMock.mockReturnValue({ allowed: true });
    getPricePaiseMock.mockReturnValue(99900);
  });

  const dto: UpgradeSubscriptionDto = {
    subscriptionId: 'sub-1',
    newPlan: 'ESSENTIAL',
    immediate: true,
  };

  it('throws NotFoundException when the subscription does not exist', async () => {
    findByIdMock.mockResolvedValue(null);

    await expect(useCase.execute(dto)).rejects.toThrow(NotFoundException);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the plan cannot be changed mid-cycle', async () => {
    findByIdMock.mockResolvedValue(buildSubscription());
    canChangePlanMock.mockReturnValue({
      allowed: false,
      reason: 'Cannot change plan from subscription in CANCELLED status',
    });

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when the target tier is not an upgrade', async () => {
    // ESSENTIAL -> PROFESSIONAL is the valid shape, but an ESSENTIAL base
    // against an ESSENTIAL target is not an upgrade.
    const subscription = new Subscription({
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
    findByIdMock.mockResolvedValue(subscription);

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('upgrades the plan immediately, pins the new price, and persists via update', async () => {
    findByIdMock.mockResolvedValue(buildSubscription());

    const result = await useCase.execute(dto);

    expect(getPricePaiseMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'ESSENTIAL' }),
      expect.objectContaining({ value: 'MONTHLY' }),
    );
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updated = updateMock.mock.calls[0]?.[0] as Subscription;
    expect(updated.getPlan().value).toBe('ESSENTIAL');
    expect(updated.getBasePrice().paise).toBe(99900);
    expect(result).toEqual({ success: true });
  });

  it('defers the upgrade when immediate=false, keeping the current plan and price', async () => {
    findByIdMock.mockResolvedValue(buildSubscription());

    await useCase.execute({ ...dto, immediate: false });

    const updated = updateMock.mock.calls[0]?.[0] as Subscription;
    expect(updated.getPlan().value).toBe('STARTER');
    expect(updated.getBasePrice().paise).toBe(49900);
  });
});
