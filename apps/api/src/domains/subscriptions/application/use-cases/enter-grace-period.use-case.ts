import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ISubscriptionRepository } from '../ports/subscription.repository.port';
import { IClinicOperations } from '../ports/clinic-operations.port';
import { SubscriptionStatusEnum } from '../../core/value-objects';

@Injectable()
export class EnterGracePeriodUseCase {
  private readonly logger = new Logger(EnterGracePeriodUseCase.name);

  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly clinicOps: IClinicOperations,
  ) {}

  async execute(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    subscription.enterGracePeriod();
    await this.subscriptionRepo.save(subscription);

    // Legacy didn't update features/tier for grace period, just status
    await this.clinicOps.updateTierAndFeatures(
      subscription.clinicId,
      subscription.getPlan().value,
      SubscriptionStatusEnum.GRACE,
      {},
    );

    await this.clinicOps.emitUpdate(subscription.clinicId, {
      clinicId: subscription.clinicId,
      tier: subscription.getPlan().value,
      subscriptionStatus: SubscriptionStatusEnum.GRACE,
    });

    this.logger.log(
      `Subscription entered grace period for clinic ${subscription.clinicId}`,
    );
  }
}
