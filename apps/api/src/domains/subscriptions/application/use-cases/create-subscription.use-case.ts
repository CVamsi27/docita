import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Subscription } from '../../core/entities';
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
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '../ports/subscription.repository.port';

@Injectable()
export class CreateSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private subscriptionRepository: ISubscriptionRepository,
    private pricingService: SubscriptionPricingService,
    private validationService: SubscriptionValidationService,
  ) {}

  async execute(
    dto: CreateSubscriptionDto,
  ): Promise<{ subscriptionId: string }> {
    const existing = await this.subscriptionRepository.findByClinicId(
      dto.clinicId,
    );
    if (existing) {
      throw new BadRequestException(
        `Clinic ${dto.clinicId} already has an active subscription`,
      );
    }

    const plan = ClinicTier.fromString(dto.plan);
    const cycle = BillingCycle.fromString(dto.billingCycle);

    const basePriceCents = this.pricingService.getPricePaise(plan, cycle);

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
      autoPayEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    const validation =
      this.validationService.validateSubscription(subscription);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Invalid subscription',
        errors: validation.errors,
      });
    }

    await this.subscriptionRepository.save(subscription);

    return { subscriptionId: subscription.id };
  }
}
