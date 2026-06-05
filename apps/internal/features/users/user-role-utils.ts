import { ROLE_CONFIG, type UserRole } from "./types";

export function isRoleConfigKey(key: string): key is keyof typeof ROLE_CONFIG {
  return key in ROLE_CONFIG;
}

export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "tier-pro";
    case "ADMIN_DOCTOR":
      return "tier-core";
    case "DOCTOR":
      return "tier-plus";
    case "RECEPTIONIST":
      return "tier-enterprise";
    default:
      return "badge-muted";
  }
}
