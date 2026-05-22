import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Subscription } from '@/domains/subscriptions/core/entities';
import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import {
  SubscriptionPricingService,
  SubscriptionValidationService,
} from '@/domains/subscriptions/core/services';
import { CreateSubscriptionDto } from '@/domains/subscriptions/application/dto/subscription.dto';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class CreateSubscriptionUseCase {
  private readonly logger = new Logger(CreateSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private subscriptionRepository: ISubscriptionRepository,
    private pricingService: SubscriptionPricingService,
    private validationService: SubscriptionValidationService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
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

    // AuditLogged: subscription creation
    this.logger.log({
      action: 'subscription.create',
      clinicId: dto.clinicId,
      plan: dto.plan,
      billingCycle: dto.billingCycle,
    });

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
      createdAt: this.clock.now(),
      updatedAt: this.clock.now(),
      version: 1,
    });

    const validation = this.validationService.validateSubscription(
      subscription,
      this.clock.now(),
    );
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
