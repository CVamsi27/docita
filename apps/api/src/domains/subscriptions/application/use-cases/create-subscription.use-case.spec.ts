import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CreateSubscriptionUseCase } from './create-subscription.use-case';
import type { CreateSubscriptionDto } from '@/domains/subscriptions/application/dto/subscription.dto';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import { SubscriptionValidationService } from '@/domains/subscriptions/core/services/subscription-validation.service';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  BillingCycle,
  ClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { createFixedClockMock } from '@/test-utils';

describe('CreateSubscriptionUseCase', () => {
  const clock = createFixedClockMock('2026-05-01T10:00:00.000Z');

  const findByIdMock = jest.fn<ISubscriptionRepository['findById']>();
  const findByClinicIdMock =
    jest.fn<ISubscriptionRepository['findByClinicId']>();
  const saveMock = jest.fn<ISubscriptionRepository['save']>();

  const subscriptionRepo: ISubscriptionRepository = {
    save: saveMock,
    findById: findByIdMock,
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

  const getPricePaiseMock =
    jest.fn<SubscriptionPricingService['getPricePaise']>();
  const pricingService = Object.create(
    SubscriptionPricingService.prototype,
  ) as SubscriptionPricingService;
  pricingService.getPricePaise = getPricePaiseMock;

  const validateSubscriptionMock =
    jest.fn<SubscriptionValidationService['validateSubscription']>();
  const validationService = Object.create(
    SubscriptionValidationService.prototype,
  ) as SubscriptionValidationService;
  validationService.validateSubscription = validateSubscriptionMock;

  let useCase: CreateSubscriptionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateSubscriptionUseCase(
      subscriptionRepo,
      pricingService,
      validationService,
      clock,
    );
    getPricePaiseMock.mockReturnValue(99900);
    validateSubscriptionMock.mockReturnValue({ valid: true, errors: [] });
  });

  const dto: CreateSubscriptionDto = {
    clinicId: 'clinic-1',
    plan: 'ESSENTIAL',
    billingCycle: 'MONTHLY',
    currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
  };

  it('rejects creation when the clinic already has a subscription', async () => {
    findByClinicIdMock.mockResolvedValue(
      new Subscription({
        id: 'sub-existing',
        clinicId: 'clinic-1',
        plan: ClinicTier.fromString('ESSENTIAL'),
        billingCycle: BillingCycle.fromString('MONTHLY'),
        basePriceCents: 99900,
        status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
        currentPeriodStart: dto.currentPeriodStart,
        currentPeriodEnd: dto.currentPeriodEnd,
        autoPayEnabled: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        version: 1,
      }),
    );

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('creates an ACTIVE subscription with auto-pay, price from pricing service, and version 1', async () => {
    findByClinicIdMock.mockResolvedValue(null);

    const result = await useCase.execute(dto);

    expect(getPricePaiseMock).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'ESSENTIAL' }),
      expect.objectContaining({ value: 'MONTHLY' }),
    );
    expect(validateSubscriptionMock).toHaveBeenCalledWith(
      expect.any(Subscription),
      clock.now(),
    );
    expect(saveMock).toHaveBeenCalledTimes(1);
    const saved = saveMock.mock.calls[0]?.[0] as Subscription;
    expect(saved.id).toMatch(/^sub_/);
    expect(saved.clinicId).toBe('clinic-1');
    expect(saved.getStatus().value).toBe(SubscriptionStatusEnum.ACTIVE);
    expect(saved.isAutoPayEnabled()).toBe(true);
    expect(saved.version).toBe(1);
    expect(saved.getBasePrice().paise).toBe(99900);
    expect(result).toEqual({ subscriptionId: saved.id });
  });

  it('rejects creation when validation reports errors', async () => {
    findByClinicIdMock.mockResolvedValue(null);
    validateSubscriptionMock.mockReturnValue({
      valid: false,
      errors: ['Subscription has expired and needs renewal'],
    });

    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    expect(saveMock).not.toHaveBeenCalled();
  });
});
