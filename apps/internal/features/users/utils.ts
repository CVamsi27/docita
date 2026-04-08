import type { RoleFilter, User, UserRole } from "./types";

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
