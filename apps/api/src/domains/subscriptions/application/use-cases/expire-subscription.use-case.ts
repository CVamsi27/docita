import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { ClinicTier } from '@workspace/db';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionStatusEnum } from '@/domains/subscriptions/core/value-objects';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class ExpireSubscriptionUseCase {
  private readonly logger = new Logger(ExpireSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    subscription.expire(this.clock.now());
    await this.subscriptionRepo.save(subscription);

    await this.clinicOps.updateTierAndFeatures(
      subscription.clinicId,
      ClinicTier.STARTER,
      SubscriptionStatusEnum.EXPIRED,
      {},
    );

    await this.clinicOps.emitUpdate(subscription.clinicId, {
      clinicId: subscription.clinicId,
      tier: ClinicTier.STARTER,
      subscriptionStatus: SubscriptionStatusEnum.EXPIRED,
      subscriptionGraceUntil: null,
    });

    this.logger.log(`Subscription expired for clinic ${subscription.clinicId}`);
  }
}
