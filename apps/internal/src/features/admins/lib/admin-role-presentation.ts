import type { UserRole } from "@workspace/types";

/**
 * Roles the internal admins console names. `satisfies` (rather than a bare
 * object or an annotation) keeps every key checked against `UserRole` while
 * letting the maps stay plain values — no type assertion needed.
 */
const ROLE_LABEL = {
  ADMIN: "Clinic Admin",
  ADMIN_DOCTOR: "Admin Doctor",
} satisfies Partial<Record<UserRole, string>>;

const ROLE_BADGE = {
  ADMIN: "outline",
  ADMIN_DOCTOR: "default",
} satisfies Partial<Record<UserRole, "default" | "outline">>;

// `Map` keeps lookups a plain string key, so resolving an unknown role needs
// no assertion.
const LABEL_BY_ROLE = new Map<string, string>(Object.entries(ROLE_LABEL));
const BADGE_BY_ROLE = new Map<string, "default" | "outline">(
  Object.entries(ROLE_BADGE),
);

/**
 * The API sends UPPER_SNAKE. Normalizing once here means a single canonical key
 * set, replacing the previous map that carried both `admin` and `ADMIN`
 * spellings — a band-aid added after a casing mismatch, which hid the drift
 * instead of fixing the mismatch.
 */
function normalizeRole(role: string): string {
  return role.trim().toUpperCase();
}

export function getRoleLabel(role: string): string {
  return LABEL_BY_ROLE.get(normalizeRole(role)) ?? role;
}

export function getRoleBadgeVariant(role: string): "default" | "outline" {
  return BADGE_BY_ROLE.get(normalizeRole(role)) ?? "outline";
}

/** Exported so a test can assert every named role resolves. */
export const ADMIN_CONSOLE_ROLES = Object.keys(ROLE_LABEL);
