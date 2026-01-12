/**
 * Subscription status access control rule
 * Single Responsibility: Ensure subscription is active
 */

import type { IAccessContext, IAccessRule } from "../interfaces";

export class SubscriptionStatusRule implements IAccessRule {
  canAccess(context: IAccessContext): boolean {
    // Allow access only if subscription is active or trialing
    return (
      context.subscription.status === "active" ||
      context.subscription.status === "trialing"
    );
  }

  getRuleName(): string {
    return "SubscriptionStatus";
  }

  getPriority(): number {
    return 50; // High priority - check subscription status early
  }

  /**
   * Get subscription status message
   */
  getStatusMessage(context: IAccessContext): string {
    switch (context.subscription.status) {
      case "active":
        return "Subscription is active";
      case "trialing":
        return "Trial period active";
      case "past_due":
        return "Payment is past due. Please update your payment method.";
      case "canceled":
        return "Subscription has been canceled";
      default:
        return "Unknown subscription status";
    }
  }
}
