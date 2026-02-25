import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ISubscriptionRepository } from '../ports/subscription.repository.port';
import { IClinicOperations } from '../ports/clinic-operations.port';
import { SubscriptionStatusEnum } from '../../core/value-objects';

@Injectable()
export class ExpireSubscriptionUseCase {
  private readonly logger = new Logger(ExpireSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepo: ISubscriptionRepository,
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
      'CAPTURE',
      SubscriptionStatusEnum.EXPIRED,
      {},
    );

    await this.clinicOps.emitUpdate(subscription.clinicId, {
      clinicId: subscription.clinicId,
      tier: 'CAPTURE',
      subscriptionStatus: SubscriptionStatusEnum.EXPIRED,
    });

    this.logger.log(`Subscription expired for clinic ${subscription.clinicId}`);
  }
}
