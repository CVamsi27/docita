import type { IAccessContext, IAccessRule } from "../interfaces";
import { hasPermission } from "@/lib/permissions";

/**
 * RoleBasedAccessRule - Checks if user's role has required permission
 *
 * Priority: 15 (Between Override and SubscriptionStatus)
 *
 * Grants access if:
 * - No permission required, OR
 * - User's role has the required permission
 *
 * This rule integrates role-based permissions with tier-based features,
 * ensuring users have both the right subscription AND the right role.
 */
export class RoleBasedAccessRule implements IAccessRule {
  getRuleName(): string {
    return "RoleBasedAccess";
  }

  getPriority(): number {
    return 15;
  }

  canAccess(context: IAccessContext): boolean {
    // If no permission required, pass through to next rule
    if (!context.requiredPermission) {
      return true;
    }

    // Check if user's role has the permission
    return hasPermission(context.userRole, context.requiredPermission);
  }
}
