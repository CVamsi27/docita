import { getAuthenticatedUserId } from '@/shared/modules/auth/auth/request-user.util';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isWriteHttpMethod(method: string): boolean {
  return WRITE_METHODS.has(method.toUpperCase());
}

export function toAuditRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return value;
}

export function readAuditActor(user: unknown): {
  userId: string | undefined;
  clinicId: string | null;
  role: string | undefined;
} {
  const userId = getAuthenticatedUserId(user) ?? undefined;
  if (!isRecord(user)) {
    return { userId, clinicId: null, role: undefined };
  }

  const clinicId =
    typeof user.clinicId === 'string' && user.clinicId.trim().length > 0
      ? user.clinicId.trim()
      : null;
  const role = typeof user.role === 'string' ? user.role : undefined;

  return { userId, clinicId, role };
}
