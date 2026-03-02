

import type {
  IAccessContext,
  IAccessControlService,
  IAccessDecision,
  IUpgradeOption,
} from "@/lib/access-control/interfaces";

type StrictAnalyticsProperty =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date;

interface Analytics {
  track: (
    event: string,
    properties?: Record<string, StrictAnalyticsProperty>,
  ) => void;
}

interface FeatureLockProperties {
  feature: string;
  userId: string;
  clinicId?: string;
  currentTier: string;
  subscriptionStatus: string;
  reason: string;
  ruleName: string;
  upgradeOptionsCount: number;
  hasWhatsApp: boolean;
  hasIntelligence: boolean;
  timestamp: string;
  [key: string]: StrictAnalyticsProperty;
}

interface FeatureAccessProperties {
  feature: string;
  userId: string;
  ruleName: string;
  timestamp: string;
  [key: string]: StrictAnalyticsProperty;
}

declare global {
  interface Window {
    analytics?: Analytics;
  }
}

export class AnalyticsAccessControlDecorator implements IAccessControlService {
  constructor(private wrapped: IAccessControlService) {}

  async canAccess(context: IAccessContext): Promise<IAccessDecision> {
    const decision = await this.wrapped.canAccess(context);

    if (!decision.granted) {
      this.trackFeatureLock(context, decision);
    } else {
      this.trackFeatureAccess(context, decision);
    }

    return decision;
  }

  canAccessSync(context: IAccessContext): IAccessDecision {
    const decision = this.wrapped.canAccessSync(context);

    if (!decision.granted) {
      this.trackFeatureLock(context, decision);
    } else {
      this.trackFeatureAccess(context, decision);
    }

    return decision;
  }

  getReason(context: IAccessContext): string {
    return this.wrapped.getReason(context);
  }

  getUpgradeOptions(context: IAccessContext): IUpgradeOption[] {
    return this.wrapped.getUpgradeOptions(context);
  }

  
  private trackFeatureLock(
    context: IAccessContext,
    decision: IAccessDecision,
  ): void {

    if (typeof window !== "undefined" && window.analytics) {
      const properties: FeatureLockProperties = {
        feature: String(context.feature),
        userId: context.userId,
        clinicId: context.clinicId,
        currentTier: String(context.subscription.tier),
        subscriptionStatus: context.subscription.status,
        reason: decision.reason,
        ruleName: decision.ruleName,
        upgradeOptionsCount: decision.upgradeOptions?.length || 0,
        hasWhatsApp: context.addOns.some((a) => a.type === "WHATSAPP"),
        hasIntelligence: context.addOns.some((a) => a.type === "INTELLIGENCE"),
        timestamp: new Date().toISOString(),
      };

      window.analytics.track("feature_locked", properties);
    }
  }

  
  private trackFeatureAccess(
    context: IAccessContext,
    decision: IAccessDecision,
  ): void {

    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      window.analytics
    ) {
      const properties: FeatureAccessProperties = {
        feature: String(context.feature),
        userId: context.userId,
        ruleName: decision.ruleName,
        timestamp: new Date().toISOString(),
      };

      window.analytics.track("feature_accessed", properties);
    }
  }
}
