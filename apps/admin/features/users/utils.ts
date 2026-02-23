import type { RoleFilter, User, UserRole } from "./types";

export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case "ADMIN_DOCTOR":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "DOCTOR":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "RECEPTIONIST":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    default:
      return "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground";
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
