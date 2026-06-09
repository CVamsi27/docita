import type { IAccessContext, IAccessRule } from "@/lib/access-control/interfaces";
import { hasPermission } from "@/lib/auth/permissions";

export class RoleBasedAccessRule implements IAccessRule {
  getRuleName(): string {
    return "RoleBasedAccess";
  }

  getPriority(): number {
    return 15;
  }

  canAccess(context: IAccessContext): boolean {

    if (!context.requiredPermission) return true;

    return hasPermission(context.userRole, context.requiredPermission);
  }
}
