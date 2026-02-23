/**
 * Upgrade Subscription Use Case
 * Handles mid-cycle and end-of-cycle plan upgrades
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ClinicTier } from '../../core/value-objects';
import {
  SubscriptionPricingService,
  SubscriptionValidationService,
  ProratingService,
} from '../../core/services';
import { UpgradeSubscriptionDto } from '../dto/subscription.dto';
import { ISubscriptionRepository } from '../ports/subscription.repository.port';

@Injectable()
export class UpgradeSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private pricingService: SubscriptionPricingService,
    private validationService: SubscriptionValidationService,
    private proratingService: ProratingService,
  ) {}

  async execute(
    dto: UpgradeSubscriptionDto,
  ): Promise<{ success: boolean; prorationCredit?: number }> {
    // Fetch subscription
    const subscription = await this.subscriptionRepository.findById(
      dto.subscriptionId,
    );

    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${dto.subscriptionId} not found`,
      );
    }

    // Validate can change plan
    const canChange = this.validationService.canChangePlan(subscription);
    if (!canChange.allowed) {
      throw new BadRequestException(canChange.reason);
    }

    // Create new tier
    const newTier = new ClinicTier(dto.newPlan as any);

    // Check if this is actually an upgrade
    if (!newTier.isUpgradeTo(subscription.getPlan())) {
      throw new BadRequestException(
        `${dto.newPlan} is not an upgrade from ${subscription.getPlan().toString()}`,
      );
    }

    // Get new pricing
    const newPriceCents = this.pricingService.getPricePaise(
      newTier,
      subscription.getBillingCycle(),
    );

    if (dto.immediate) {
      // Immediate upgrade with proration
      subscription.upgradePlan(newTier, newPriceCents, true);
    } else {
      // Schedule upgrade for next billing period
      subscription.upgradePlan(newTier, newPriceCents, false);
    }

    // Persist
    await this.subscriptionRepository.update(subscription);

    return { success: true };
  }
}
