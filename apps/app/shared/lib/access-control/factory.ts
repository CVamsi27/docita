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
  private static applyDecorators(
    service: IAccessControlService,
    config?: IAccessControlConfig,
  ): IAccessControlService {
    if (config?.enableLogging) {
      service = new LoggingAccessControlDecorator(service);
    }
    if (config?.enableAnalytics) {
      service = new AnalyticsAccessControlDecorator(service);
    }
    return service;
  }

  static create(config?: IAccessControlConfig): IAccessControlService {
    const repository = new SubscriptionRepository(
      config?.cacheTTL,
      config?.apiBaseUrl,
    );

    const rules: IAccessRule[] = [
      new OverrideAccessRule(),
      new RoleBasedAccessRule(),
      new ClinicTypeBasedAccessRule(),
      new SubscriptionStatusRule(),
      new AddOnBasedAccessRule(),
      new TierBasedAccessRule(),
    ];

    return this.applyDecorators(
      new AccessControlService(repository, rules),
      config,
    );
  }

  static createWithCustomRules(
    rules: IAccessRule[],
    config?: IAccessControlConfig,
  ): IAccessControlService {
    const repository = new SubscriptionRepository(
      config?.cacheTTL,
      config?.apiBaseUrl,
    );

    return this.applyDecorators(
      new AccessControlService(repository, rules),
      config,
    );
  }
}
