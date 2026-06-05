import type { User } from "./types";

export function calculateRoleStats(users: User[]) {
  return {
    ALL: users.length,
    ADMIN: countUsersByRole(users, "ADMIN"),
    ADMIN_DOCTOR: countUsersByRole(users, "ADMIN_DOCTOR"),
    DOCTOR: countUsersByRole(users, "DOCTOR"),
    RECEPTIONIST: countUsersByRole(users, "RECEPTIONIST"),
  };
}

function countUsersByRole(users: User[], role: User["role"]): number {
  return users.filter((user) => user.role === role).length;
}
