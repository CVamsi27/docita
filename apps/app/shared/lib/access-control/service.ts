

import {
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  TIER_PRICING,
} from "@workspace/types";
import { DEFAULT_CURRENCY, getTierInfo } from "@workspace/utils";
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

    this.rules = [...rules].sort((a, b) => {
      const priorityA = a.getPriority?.() ?? 0;
      const priorityB = b.getPriority?.() ?? 0;
      return priorityB - priorityA;
    });
  }

  async canAccess(context: IAccessContext): Promise<IAccessDecision> {

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

  
  private evaluateRules(context: IAccessContext): IAccessDecision {

    for (const rule of this.rules) {
      if (rule.canAccess(context)) {
        return {
          granted: true,
          reason: `Access granted by ${rule.getRuleName()}`,
          ruleName: rule.getRuleName(),
        };
      }
    }

    return this.buildDenialDecision(context);
  }

  
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

  
  private getDenialReason(context: IAccessContext): {
    reason: string;
    metadata: IAccessDecision["metadata"];
  } {
    const feature = context.feature;

    if (
      context.subscription.status !== "active" &&
      context.subscription.status !== "trialing"
    ) {
      return {
        reason: this.getSubscriptionStatusMessage(context.subscription.status),
        metadata: {},
      };
    }

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

    if (typeof feature !== "string" && feature in FEATURE_TIER_MAP) {
      const requiredTier = FEATURE_TIER_MAP[feature as Feature];
      const tierInfo = getTierInfo(requiredTier);

      return {
        reason: `This feature requires ${tierInfo.name} tier or higher`,
        metadata: { requiredTier },
      };
    }

    return {
      reason: "This feature is not available on your current plan",
      metadata: {},
    };
  }

  
  private calculateUpgradeOptions(
    context: IAccessContext,
    metadata: IAccessDecision["metadata"],
  ): IUpgradeOption[] {
    const options: IUpgradeOption[] = [];

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
          currency: DEFAULT_CURRENCY,
          savings:
            context.subscription.billingCycle === "yearly"
              ? Math.round(newPrice * 12 * 0.1)
              : undefined,
          description: `Upgrade to ${getTierInfo(requiredTier).name} to unlock this feature`,
        });
      }
    }

    if (metadata?.requiredAddOn) {
      const addOnType = metadata.requiredAddOn;
      const addOnName =
        addOnType === AddOnType.WHATSAPP
          ? "WhatsApp Integration"
          : "Intelligence";

      const currentTier = context.subscription.tier;

      const addOnPrice =
        addOnType === AddOnType.WHATSAPP
          ? currentTier >= Tier.PROFESSIONAL
            ? 1499
            : 799
          : currentTier >= Tier.PROFESSIONAL
            ? 3499
            : 1999;

      options.push({
        type: "purchase_addon",
        target: addOnType,
        currentPrice: 0,
        newPrice: addOnPrice,
        currency: DEFAULT_CURRENCY,
        description: `Add ${addOnName} to your plan`,
      });
    }

    return options;
  }

  
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
        return "We could not confirm your subscription status right now";
    }
  }
}
