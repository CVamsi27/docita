import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ClinicTier } from '@/domains/subscriptions/core/value-objects';
import {
  SubscriptionPricingService,
  SubscriptionValidationService,
  ProratingService,
} from '@/domains/subscriptions/core/services';
import { UpgradeSubscriptionDto } from '@/domains/subscriptions/application/dto/subscription.dto';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class UpgradeSubscriptionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private subscriptionRepository: ISubscriptionRepository,
    private pricingService: SubscriptionPricingService,
    private validationService: SubscriptionValidationService,
    private proratingService: ProratingService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(
    dto: UpgradeSubscriptionDto,
  ): Promise<{ success: boolean; prorationCredit?: number }> {
    const subscription = await this.subscriptionRepository.findById(
      dto.subscriptionId,
    );

    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${dto.subscriptionId} not found`,
      );
    }

    const canChange = this.validationService.canChangePlan(subscription);
    if (!canChange.allowed) throw new BadRequestException(canChange.reason);

    const newTier = ClinicTier.fromString(dto.newPlan);

    if (!newTier.isUpgradeTo(subscription.getPlan())) {
      throw new BadRequestException(
        `${dto.newPlan} is not an upgrade from ${subscription.getPlan().toString()}`,
      );
    }

    const newPriceCents = this.pricingService.getPricePaise(
      newTier,
      subscription.getBillingCycle(),
    );

    const now = this.clock.now();
    if (dto.immediate) {
      subscription.upgradePlan(newTier, newPriceCents, true, now);
    } else {
      subscription.upgradePlan(newTier, newPriceCents, false, now);
    }

    await this.subscriptionRepository.update(subscription);

    return { success: true };
  }
}
