import { SPECIALIZATION_LABELS } from "@workspace/types";
import { ROLE_CONFIG, type RoleFilter, type User, type UserRole } from "./types";

export function isRoleConfigKey(key: string): key is keyof typeof ROLE_CONFIG {
  return key in ROLE_CONFIG;
}

function isSpecializationLabelKey(
  key: string,
): key is keyof typeof SPECIALIZATION_LABELS {
  return key in SPECIALIZATION_LABELS;
}

export function getSpecializationLabel(
  specialization: string | undefined,
): string {
  if (!specialization) {
    return "-";
  }
  if (isSpecializationLabelKey(specialization)) {
    return SPECIALIZATION_LABELS[specialization];
  }
  return specialization;
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

export function calculateRoleStats(users: User[]) {
  return {
    ALL: users.length,
    ADMIN: users.filter((user) => user.role === "ADMIN").length,
    ADMIN_DOCTOR: users.filter((user) => user.role === "ADMIN_DOCTOR").length,
    DOCTOR: users.filter((user) => user.role === "DOCTOR").length,
    RECEPTIONIST: users.filter((user) => user.role === "RECEPTIONIST").length,
  };
}

export function filterUsers(
  users: User[],
  searchTerm: string,
  role: RoleFilter,
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return users.filter((user) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch) ||
      user.specialization?.toLowerCase().includes(normalizedSearch);

    const matchesRole = role === "ALL" || user.role === role;

    return matchesSearch && matchesRole;
  });
}
