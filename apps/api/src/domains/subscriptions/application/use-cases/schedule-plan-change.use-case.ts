import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  ClinicTier,
  BillingCycle,
} from '@/domains/subscriptions/core/value-objects';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

export interface SchedulePlanChangeRequest {
  clinicId: string;
  tier: string;
  cycle: string;
}

export interface SchedulePlanChangeResult {
  scheduled: {
    tier: string;
    cycle: string;
    effectiveAt: string;
  };
}

/**
 * Schedules a plan change to apply at the current billing period end.
 * Intended for downgrades: the user keeps their current tier features for
 * the remaining paid period, and the lower tier kicks in at renewal.
 *
 * No payment is taken at scheduling time; the next renewal cycle is when
 * the new tier's price applies.
 */
@Injectable()
export class SchedulePlanChangeUseCase {
  private readonly logger = new Logger(SchedulePlanChangeUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async execute(
    request: SchedulePlanChangeRequest,
  ): Promise<SchedulePlanChangeResult> {
    const subscription = await this.subscriptionRepo.findByClinicId(
      request.clinicId,
    );
    if (!subscription) {
      throw new NotFoundException(
        `Subscription for clinic ${request.clinicId} not found`,
      );
    }

    const targetTier = ClinicTier.fromString(request.tier);
    const targetCycle = BillingCycle.fromString(request.cycle);

    if (
      subscription.getPlan().equals(targetTier) &&
      subscription.getBillingCycle().equals(targetCycle)
    ) {
      throw new BadRequestException(
        'You are already on this plan and billing cycle.',
      );
    }

    const effectiveAt = subscription.currentPeriodEnd;
    subscription.schedulePlanChange(
      targetTier,
      targetCycle,
      effectiveAt,
      this.clock.now(),
    );
    await this.subscriptionRepo.save(subscription);

    this.logger.log(
      `Scheduled plan change for clinic ${request.clinicId}: ${targetTier.value} ${targetCycle.value} at ${effectiveAt.toISOString()}`,
    );

    return {
      scheduled: {
        tier: targetTier.value,
        cycle: targetCycle.value,
        effectiveAt: effectiveAt.toISOString(),
      },
    };
  }

  async cancel(clinicId: string): Promise<void> {
    const subscription = await this.subscriptionRepo.findByClinicId(clinicId);
    if (!subscription) {
      throw new NotFoundException(
        `Subscription for clinic ${clinicId} not found`,
      );
    }
    if (!subscription.scheduledChange) {
      return;
    }
    subscription.clearScheduledPlanChange(this.clock.now());
    await this.subscriptionRepo.save(subscription);
    this.logger.log(`Cancelled scheduled plan change for clinic ${clinicId}`);
  }
}
