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
import { computeSubscriptionGraceDeadline } from '@/domains/subscriptions/core/constants/subscription-lockout.constants';

@Injectable()
export class EnterGracePeriodUseCase {
  private readonly logger = new Logger(EnterGracePeriodUseCase.name);

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

    subscription.enterGracePeriod(computeSubscriptionGraceDeadline());
    await this.subscriptionRepo.save(subscription);

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
      subscriptionGraceUntil:
        subscription.getGraceUntil()?.toISOString() ?? null,
    });

    this.logger.log(
      `Subscription entered grace period for clinic ${subscription.clinicId}`,
    );
  }
}
