/**
 * Create Subscription Use Case
 * Handles new subscription creation with validation
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Subscription,
  SubscriptionPayment,
  PaymentStatusEnum,
} from '../../core/entities';
import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
  ClinicTier,
  BillingCycle,
} from '../../core/value-objects';
import {
  SubscriptionPricingService,
  SubscriptionValidationService,
} from '../../core/services';
import { CreateSubscriptionDto } from '../dto/subscription.dto';
import { ISubscriptionRepository } from '../ports/subscription.repository.port';

@Injectable()
export class CreateSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private pricingService: SubscriptionPricingService,
    private validationService: SubscriptionValidationService,
  ) {}

  async execute(dto: CreateSubscriptionDto): Promise<{ subscriptionId: string }> {
    // Validate plan doesn't already exist for clinic
    const existing = await this.subscriptionRepository.findByClinicId(
      dto.clinicId,
    );
    if (existing) {
      throw new BadRequestException(
        `Clinic ${dto.clinicId} already has an active subscription`,
      );
    }

    // Create tier and cycle value objects
    const plan = new ClinicTier(dto.plan as any);
    const cycle = new BillingCycle(dto.billingCycle as any);

    // Get pricing
    const basePriceCents = this.pricingService.getPricePaise(plan, cycle);

    // Create subscription entity
    const subscription = new Subscription({
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clinicId: dto.clinicId,
      plan,
      billingCycle: cycle,
      basePriceCents,
      status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
      currentPeriodStart: dto.currentPeriodStart,
      currentPeriodEnd: dto.currentPeriodEnd,
      trialEnd: dto.trialEnd,
      autoPayEnabled: true, // New subscriptions have auto-pay
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    // Validate subscription
    const validation = this.validationService.validateSubscription(subscription);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid subscription',
        errors: validation.errors,
      });
    }

    // Persist
    await this.subscriptionRepository.save(subscription);

    return { subscriptionId: subscription.id };
  }
}
