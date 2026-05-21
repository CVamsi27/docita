import { userRoleSchema, type UserRole } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";

const USER_ROLE_VALUES = userRoleSchema.options;

export function parseUserRole(
  role: string | null | undefined,
  fallback: UserRole = "RECEPTIONIST",
): UserRole {
  if (!role) return fallback;
  return parseStringEnumMember(USER_ROLE_VALUES, role) ?? fallback;
}
