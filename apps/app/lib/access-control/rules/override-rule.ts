/**
 * Override-based access control rule
 * Single Responsibility: Evaluate feature overrides (admin grants, trials, etc.)
 */

import type { IAccessContext, IAccessRule } from "../interfaces";

export class OverrideAccessRule implements IAccessRule {
  canAccess(context: IAccessContext): boolean {
    if (!context.overrides || context.overrides.length === 0) {
      return false;
    }

    const override = context.overrides.find(
      (o) =>
        o.feature === context.feature &&
        o.granted &&
        (!o.expiresAt || o.expiresAt > new Date()),
    );

    return !!override;
  }

  getRuleName(): string {
    return "OverrideAccess";
  }

  getPriority(): number {
    return 100; // Highest priority - overrides take precedence
  }

  /**
   * Check if there's an override for a feature (regardless of grant status)
   */
  hasOverride(context: IAccessContext): boolean {
    if (!context.overrides) {
      return false;
    }

    return context.overrides.some((o) => o.feature === context.feature);
  }

  /**
   * Get the override for a feature if it exists
   */
  getOverride(context: IAccessContext) {
    return context.overrides?.find((o) => o.feature === context.feature);
  }
}
