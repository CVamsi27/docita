/**
 * Access Control Factory
 * Factory Pattern: Creates properly configured access control service
 */

import type {
  IAccessControlConfig,
  IAccessControlService,
  IAccessRule,
} from "./interfaces";
import { AccessControlService } from "./service";
import { SubscriptionRepository } from "./repository";
import { TierBasedAccessRule } from "./rules/tier-based-rule";
import { AddOnBasedAccessRule } from "./rules/addon-based-rule";
import { OverrideAccessRule } from "./rules/override-rule";
import { SubscriptionStatusRule } from "./rules/subscription-status-rule";
import { RoleBasedAccessRule } from "./rules/role-based-rule";
import { ClinicTypeBasedAccessRule } from "./rules/clinic-type-rule";
import { LoggingAccessControlDecorator } from "./decorators/logging-decorator";
import { AnalyticsAccessControlDecorator } from "./decorators/analytics-decorator";

export class AccessControlFactory {
  /**
   * Create a fully configured access control service
   * Factory Method Pattern
   */
  static create(config?: IAccessControlConfig): IAccessControlService {
    const repository = new SubscriptionRepository(
      config?.cacheTTL,
      config?.apiBaseUrl,
    );

    const rules: IAccessRule[] = [
      // Priority 100: Overrides (admin grants, trials)
      new OverrideAccessRule(),

      // Priority 15: Role-based permissions
      new RoleBasedAccessRule(),

      // Priority 25: Clinic type-based access (specialty features)
      new ClinicTypeBasedAccessRule(),

      // Priority 50: Subscription status
      new SubscriptionStatusRule(),

      // Priority 20: Add-on features (WhatsApp, Intelligence)
      new AddOnBasedAccessRule(),

      // Priority 10: Tier-based features
      new TierBasedAccessRule(),
    ];

    let service: IAccessControlService = new AccessControlService(
      repository,
      rules,
    );

    // Apply decorators if enabled
    if (config?.enableLogging) {
      service = new LoggingAccessControlDecorator(service);
    }

    if (config?.enableAnalytics) {
      service = new AnalyticsAccessControlDecorator(service);
    }

    return service;
  }

  /**
   * Create service with custom rules
   * Allows for extension with custom access logic
   */
  static createWithCustomRules(
    rules: IAccessRule[],
    config?: IAccessControlConfig,
  ): IAccessControlService {
    const repository = new SubscriptionRepository(
      config?.cacheTTL,
      config?.apiBaseUrl,
    );

    let service: IAccessControlService = new AccessControlService(
      repository,
      rules,
    );

    if (config?.enableLogging) {
      service = new LoggingAccessControlDecorator(service);
    }

    if (config?.enableAnalytics) {
      service = new AnalyticsAccessControlDecorator(service);
    }

    return service;
  }
}
