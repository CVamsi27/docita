import { Injectable } from '@nestjs/common';
import {
  BillingCycle,
  ClinicTier,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';

@Injectable()
export class SubscriptionActivationPolicyService {
  /** Feature flags enabled when activating a non-starter paid tier. */
  buildPaidTierFeatureUpdates(tier: ClinicTier): Record<string, boolean> {
    if (tier.isStarter()) {
      return {};
    }
    return {
      WHATSAPP: true,
      PAYMENT_LINKS: true,
      WHATSAPP_REMINDERS: true,
    };
  }

  /**
   * Mid-cycle change on the same billing cycle (upgrade or same-tier renewal):
   * preserve the original currentPeriodEnd so billing rhythm does not drift.
   */
  shouldPreserveCurrentPeriodEnd(
    subscription: Subscription | null,
    tier: ClinicTier,
    cycle: BillingCycle,
  ): boolean {
    if (!subscription) {
      return false;
    }
    return subscription.shouldPreservePeriodEndOnTierChange(tier, cycle);
  }

  calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    return Subscription.calculatePeriodEnd(start, cycle);
  }
}
