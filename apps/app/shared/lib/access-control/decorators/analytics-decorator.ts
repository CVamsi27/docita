

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

  // Shared by `canAccess` and `canAccessSync` — both delegate to the wrapped
  // service and then track the same way (lock vs. access analytics event
  // chosen by `decision.granted`) before returning the decision unchanged,
  // so the tracking step lives in one place rather than the sync/async paths
  // drifting apart.
  private trackDecision(
    context: IAccessContext,
    decision: IAccessDecision,
  ): IAccessDecision {
    if (!decision.granted) {
      this.trackFeatureLock(context, decision);
    } else {
      this.trackFeatureAccess(context, decision);
    }

    return decision;
  }

  async canAccess(context: IAccessContext): Promise<IAccessDecision> {
    const decision = await this.wrapped.canAccess(context);
    return this.trackDecision(context, decision);
  }

  canAccessSync(context: IAccessContext): IAccessDecision {
    const decision = this.wrapped.canAccessSync(context);
    return this.trackDecision(context, decision);
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
