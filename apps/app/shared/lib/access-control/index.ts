
export type {
  IAccessRule,
  IAccessContext,
  IAccessDecision,
  IAccessControlService,
  ISubscriptionRepository,
  ISubscription,
  IAddOn,
  IFeatureOverride,
  IUpgradeOption,
  IAccessControlConfig,
} from "./interfaces";

export {
  AddOnType,
  isFeatureEnum,
  isActiveSubscription,
  isActiveAddOn,
  hasQuotaRemaining,
} from "./interfaces";

export { TierBasedAccessRule } from "../rules/tier-based-rule";
export {
  AddOnBasedAccessRule,
  FEATURE_ADDON_MAP,
} from "../rules/addon-based-rule";
export { OverrideAccessRule } from "../rules/override-rule";
export { SubscriptionStatusRule } from "../rules/subscription-status-rule";

export { AccessControlService } from "./service";
export { SubscriptionRepository } from "./repository";
export { AccessControlFactory } from "./factory";

export { LoggingAccessControlDecorator } from "./decorators/logging-decorator";
export { AnalyticsAccessControlDecorator } from "./decorators/analytics-decorator";
