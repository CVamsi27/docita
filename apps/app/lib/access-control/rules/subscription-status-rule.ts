

import type { IAccessContext, IAccessRule } from "@/lib/access-control/interfaces";

export class SubscriptionStatusRule implements IAccessRule {
  canAccess(context: IAccessContext): boolean {

    return (
      context.subscription.status === "active" ||
      context.subscription.status === "trialing"
    );
  }

  getRuleName(): string {
    return "SubscriptionStatus";
  }

  getPriority(): number {
    return 50; 
  }

  
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
