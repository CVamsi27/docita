/**
 * Subscription Validation Service
 * Validates business rules and constraints
 */

import { Subscription } from '../entities';

export class SubscriptionValidationService {
  /**
   * Validate subscription state
   */
  validateSubscription(
    subscription: Subscription,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if subscription is in a valid state
    if (subscription.getDaysRemaining() < 0 && subscription.isDueForRenewal()) {
      errors.push('Subscription has expired and needs renewal');
    }

    // Check if auto-pay is properly configured for active subscription
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

  /**
   * Validate plan change is allowed
   */
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

  /**
   * Validate subscription can be cancelled
   */
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

  /**
   * Validate payment can be processed
   */
  validatePaymentEligibility(subscription: Subscription): {
    eligible: boolean;
    reason?: string;
  } {
    if (!subscription.canRenew()) {
      return {
        eligible: false,
        reason: 'Subscription cannot be renewed in current state',
      };
    }

    if (subscription.isDueForRenewal()) {
      return { eligible: true };
    }

    return {
      eligible: false,
      reason: 'Subscription is not yet due for renewal',
    };
  }

  /**
   * Validate credit application
   */
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

  /**
   * Validate discount application
   */
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

  /**
   * Validate billing cycle change
   */
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
