import type { RoleFilter, User } from "./types";

export function filterUsers(
  users: User[],
  searchTerm: string,
  role: RoleFilter,
) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return users.filter((user) => {
    return (
      matchesUserSearch(user, normalizedSearch) && matchesUserRole(user, role)
    );
  });
}

function matchesUserSearch(user: User, normalizedSearch: string): boolean {
  if (normalizedSearch.length === 0) return true;
  return [user.name, user.email, user.specialization].some((value) =>
    value?.toLowerCase().includes(normalizedSearch),
  );
}

function matchesUserRole(user: User, role: RoleFilter): boolean {
  return role === "ALL" || user.role === role;
}
