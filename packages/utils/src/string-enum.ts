/**
 * Narrow a runtime string against a Prisma/Zod string-enum member list without
 * scattering `value as Enum` at every call site.
 */
export function isStringEnumMember<T extends string>(
  members: readonly T[],
  value: string,
): value is T {
  return (members as readonly string[]).includes(value);
}

export function parseStringEnumMember<T extends string>(
  members: readonly T[],
  value: string,
): T | null {
  return isStringEnumMember(members, value) ? value : null;
}
