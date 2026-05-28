import type { Role } from '@workspace/db';
import type { UserRole } from '@workspace/types';

// check-as-cast-density: allow-file
// Prisma `Role` (from `@workspace/db`) and Zod-derived `UserRole` (from
// `@workspace/types`) are structurally identical string enums but declared
// in separate packages, so TypeScript treats them as distinct. The bridge
// cast lives in this one helper so application code can stay cast-free.

export function dbRoleToUserRole(role: Role): UserRole {
  return role as unknown as UserRole;
}
