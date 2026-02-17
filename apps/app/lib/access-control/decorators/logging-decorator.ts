/**
 * Logging Decorator
 * Decorator Pattern: Adds logging to access control decisions
 * Open/Closed Principle: Extends functionality without modifying core service
 */

import type {
  IAccessContext,
  IAccessControlService,
  IAccessDecision,
  IUpgradeOption,
} from "../interfaces";

export class LoggingAccessControlDecorator implements IAccessControlService {
  constructor(private wrapped: IAccessControlService) {}

  async canAccess(context: IAccessContext): Promise<IAccessDecision> {
    const startTime = performance.now();

    console.log(
      `[AccessControl] Checking access for user ${context.userId}, feature ${context.feature}`,
    );

    const decision = await this.wrapped.canAccess(context);
    const duration = performance.now() - startTime;

    console.log(
      `[AccessControl] Decision: ${decision.granted ? "GRANTED" : "DENIED"}`,
      {
        reason: decision.reason,
        ruleName: decision.ruleName,
        duration: `${duration.toFixed(2)}ms`,
        upgradeOptions: decision.upgradeOptions?.length || 0,
      },
    );

    return decision;
  }

  canAccessSync(context: IAccessContext): IAccessDecision {
    const startTime = performance.now();

    console.log(`[AccessControl] Sync check for feature ${context.feature}`);

    const decision = this.wrapped.canAccessSync(context);
    const duration = performance.now() - startTime;

    console.log(
      `[AccessControl] Sync decision: ${decision.granted ? "GRANTED" : "DENIED"}`,
      {
        reason: decision.reason,
        duration: `${duration.toFixed(2)}ms`,
      },
    );

    return decision;
  }

  getReason(context: IAccessContext): string {
    const reason = this.wrapped.getReason(context);
    console.log(
      `[AccessControl] Denial reason for ${context.feature}: ${reason}`,
    );
    return reason;
  }

  getUpgradeOptions(context: IAccessContext): IUpgradeOption[] {
    const options = this.wrapped.getUpgradeOptions(context);
    console.log(
      `[AccessControl] Upgrade options for ${context.feature}:`,
      options.length,
    );
    return options;
  }
}
