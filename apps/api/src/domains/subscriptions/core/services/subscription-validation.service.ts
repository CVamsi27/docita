import { Subscription } from '@/domains/subscriptions/core/entities';

export class SubscriptionValidationService {
  validateSubscription(
    subscription: Subscription,
    asOf: Date,
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (
      subscription.getDaysRemaining(asOf) < 0 &&
      subscription.isDueForRenewal(asOf)
    ) {
      errors.push('Subscription has expired and needs renewal');
    }

    if (
      subscription.getStatus().isActive() &&
      !subscription.isAutoPayEnabled()
    ) {
      errors.push('Active subscription should have auto-pay enabled');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  canChangePlan(subscription: Subscription): {
    allowed: boolean;
    reason?: string;
  } {
    if (!subscription.canBeMidCycleChanged()) {
      const status = subscription.getStatus().toString();
      return {
        allowed: false,
        reason: `Cannot change plan from subscription in ${status} status`,
      };
    }

    return { allowed: true };
  }

  canCancelSubscription(subscription: Subscription): {
    allowed: boolean;
    reason?: string;
  } {
    if (subscription.getStatus().isTerminal()) {
      return {
        allowed: false,
        reason: `Subscription is already ${subscription.getStatus().toString()}`,
      };
    }

    return { allowed: true };
  }

  validatePaymentEligibility(
    subscription: Subscription,
    asOf: Date,
  ): {
    eligible: boolean;
    reason?: string;
  } {
    if (!subscription.canRenew()) {
      return {
        eligible: false,
        reason: 'Subscription cannot be renewed in current state',
      };
    }

    if (subscription.isDueForRenewal(asOf)) {
      return { eligible: true };
    }

    return {
      eligible: false,
      reason: 'Subscription is not yet due for renewal',
    };
  }

  validateCreditApplication(
    subscription: Subscription,
    amountCents: number,
  ): { valid: boolean; reason?: string } {
    if (amountCents < 0) {
      return { valid: false, reason: 'Credit amount cannot be negative' };
    }

    if (amountCents > subscription.getCredits().paise) {
      return { valid: false, reason: 'Insufficient credits available' };
    }

    return { valid: true };
  }

  validateDiscountApplication(
    subscription: Subscription,
    discountPercent: number,
  ): { valid: boolean; reason?: string } {
    if (discountPercent < 0 || discountPercent > 100) {
      return {
        valid: false,
        reason: 'Discount percentage must be between 0 and 100',
      };
    }

    if (!subscription.getPlan()) {
      return {
        valid: false,
        reason: 'Subscription has no plan assigned',
      };
    }

    return { valid: true };
  }

  validateBillingCycleChange(subscription: Subscription): {
    allowed: boolean;
    reason?: string;
  } {
    if (!subscription.canBeMidCycleChanged()) {
      return {
        allowed: false,
        reason: 'Billing cycle can only be changed for active subscriptions',
      };
    }

    return { allowed: true };
  }
}
