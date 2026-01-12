/**
 * Access Control Service
 * Chain of Responsibility pattern for rule evaluation
 * Open/Closed Principle: Add new rules without modifying this class
 */

import {
  Feature,
  FEATURE_TIER_MAP,
  getTierInfo,
  Tier,
  TIER_PRICING,
} from "@workspace/types";
import {
  AddOnType,
  type IAccessContext,
  type IAccessControlService,
  type IAccessDecision,
  type IAccessRule,
  type ISubscriptionRepository,
  type IUpgradeOption,
} from "./interfaces";
import { FEATURE_ADDON_MAP } from "./rules/addon-based-rule";

export class AccessControlService implements IAccessControlService {
  private rules: IAccessRule[] = [];
  private repository: ISubscriptionRepository;

  constructor(repository: ISubscriptionRepository, rules: IAccessRule[]) {
    this.repository = repository;
    // Sort rules by priority (highest first)
    this.rules = [...rules].sort((a, b) => {
      const priorityA = a.getPriority?.() ?? 0;
      const priorityB = b.getPriority?.() ?? 0;
      return priorityB - priorityA;
    });
  }

  async canAccess(context: IAccessContext): Promise<IAccessDecision> {
    // Refresh subscription data from API
    const freshContext = await this.repository.getContext(
      context.userId,
      context.clinicId,
    );
    const mergedContext = { ...context, ...freshContext };
    return this.evaluateRules(mergedContext);
  }

  canAccessSync(context: IAccessContext): IAccessDecision {
    return this.evaluateRules(context);
  }

  getReason(context: IAccessContext): string {
    const decision = this.evaluateRules(context);
    return decision.reason;
  }

  getUpgradeOptions(context: IAccessContext): IUpgradeOption[] {
    const decision = this.evaluateRules(context);
    return decision.upgradeOptions || [];
  }

  /**
   * Evaluate rules using Chain of Responsibility pattern
   * Rules are evaluated in priority order until one grants access
   */
  private evaluateRules(context: IAccessContext): IAccessDecision {
    // Evaluate each rule in priority order
    for (const rule of this.rules) {
      if (rule.canAccess(context)) {
        return {
          granted: true,
          reason: `Access granted by ${rule.getRuleName()}`,
          ruleName: rule.getRuleName(),
        };
      }
    }

    // Access denied - determine reason and upgrade options
    return this.buildDenialDecision(context);
  }

  /**
   * Build a detailed denial decision with upgrade options
   */
  private buildDenialDecision(context: IAccessContext): IAccessDecision {
    const { reason, metadata } = this.getDenialReason(context);
    const upgradeOptions = this.calculateUpgradeOptions(context, metadata);

    return {
      granted: false,
      reason,
      ruleName: "AccessDenied",
      upgradeOptions,
      metadata,
    };
  }

  /**
   * Determine why access was denied
   */
  private getDenialReason(context: IAccessContext): {
    reason: string;
    metadata: IAccessDecision["metadata"];
  } {
    const feature = context.feature;

    // Check subscription status first
    if (
      context.subscription.status !== "active" &&
      context.subscription.status !== "trialing"
    ) {
      return {
        reason: this.getSubscriptionStatusMessage(context.subscription.status),
        metadata: {},
      };
    }

    // Check if it's an add-on feature
    const featureStr = String(feature);
    if (featureStr in FEATURE_ADDON_MAP) {
      const requiredAddOn = FEATURE_ADDON_MAP[featureStr];
      const addOnName =
        requiredAddOn === AddOnType.WHATSAPP
          ? "WhatsApp Integration"
          : "Intelligence (AI)";

      return {
        reason: `This feature requires the ${addOnName} add-on`,
        metadata: { requiredAddOn },
      };
    }

    // Check if it's a tier-based feature
    if (typeof feature !== "string" && feature in FEATURE_TIER_MAP) {
      const requiredTier = FEATURE_TIER_MAP[feature as Feature];
      const tierInfo = getTierInfo(requiredTier);

      return {
        reason: `This feature requires ${tierInfo.name} tier or higher`,
        metadata: { requiredTier },
      };
    }

    // Unknown feature
    return {
      reason: "This feature is not available on your current plan",
      metadata: {},
    };
  }

  /**
   * Calculate upgrade options based on denial reason
   */
  private calculateUpgradeOptions(
    context: IAccessContext,
    metadata: IAccessDecision["metadata"],
  ): IUpgradeOption[] {
    const options: IUpgradeOption[] = [];

    // Tier upgrade option
    if (metadata?.requiredTier !== undefined) {
      const currentTier = context.subscription.tier;
      const requiredTier = metadata.requiredTier;

      if (currentTier < requiredTier) {
        const currentTierName = Tier[currentTier] as keyof typeof TIER_PRICING;
        const requiredTierName = Tier[
          requiredTier
        ] as keyof typeof TIER_PRICING;
        const currentPrice = TIER_PRICING[currentTierName].monthly as number;
        const newPrice = TIER_PRICING[requiredTierName].monthly as number;

        options.push({
          type: "upgrade_tier",
          target: requiredTierName,
          currentPrice,
          newPrice,
          currency: "₹",
          savings:
            context.subscription.billingCycle === "yearly"
              ? Math.round(newPrice * 12 * 0.1)
              : undefined,
          description: `Upgrade to ${getTierInfo(requiredTier).name} to unlock this feature`,
        });
      }
    }

    // Add-on purchase option
    if (metadata?.requiredAddOn) {
      const addOnType = metadata.requiredAddOn;
      const addOnName =
        addOnType === AddOnType.WHATSAPP
          ? "WhatsApp Integration"
          : "Intelligence";

      // Get base pricing for current tier
      const currentTier = context.subscription.tier;

      // Simplified pricing - would come from ADDON_PRICING in production
      const addOnPrice =
        addOnType === AddOnType.WHATSAPP
          ? currentTier >= Tier.PRO
            ? 1499
            : 799
          : currentTier >= Tier.PRO
            ? 3499
            : 1999;

      options.push({
        type: "purchase_addon",
        target: addOnType,
        currentPrice: 0,
        newPrice: addOnPrice,
        currency: "₹",
        description: `Add ${addOnName} to your plan`,
      });
    }

    return options;
  }

  /**
   * Get user-friendly subscription status message
   */
  private getSubscriptionStatusMessage(
    status: "active" | "past_due" | "canceled" | "trialing",
  ): string {
    switch (status) {
      case "active":
        return "Subscription is active";
      case "trialing":
        return "Trial period active";
      case "past_due":
        return "Your payment is past due. Please update your payment method to continue using this feature.";
      case "canceled":
        return "Your subscription has been canceled. Please reactivate to access features.";
      default:
        return "Unable to verify subscription status";
    }
  }
}
