import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionStatusEnum } from '@/domains/subscriptions/core/value-objects';

@Injectable()
export class ExpireSubscriptionUseCase {
  private readonly logger = new Logger(ExpireSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
  ) {}

  async execute(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    subscription.expire();
    await this.subscriptionRepo.save(subscription);

    await this.clinicOps.updateTierAndFeatures(
      subscription.clinicId,
      'STARTER',
      SubscriptionStatusEnum.EXPIRED,
      {},
    );

    await this.clinicOps.emitUpdate(subscription.clinicId, {
      clinicId: subscription.clinicId,
      tier: 'STARTER',
      subscriptionStatus: SubscriptionStatusEnum.EXPIRED,
    });

    this.logger.log(`Subscription expired for clinic ${subscription.clinicId}`);
  }
}
