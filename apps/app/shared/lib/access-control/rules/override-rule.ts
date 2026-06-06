

import type { IAccessContext, IAccessRule } from "@/lib/access-control/interfaces";

export class OverrideAccessRule implements IAccessRule {
  canAccess(context: IAccessContext): boolean {
    if (!context.overrides || context.overrides.length === 0) return false;

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
    return 100; 
  }

  
  hasOverride(context: IAccessContext): boolean {
    if (!context.overrides) return false;

    return context.overrides.some((o) => o.feature === context.feature);
  }

  
  getOverride(context: IAccessContext) {
    return context.overrides?.find((o) => o.feature === context.feature);
  }
}
