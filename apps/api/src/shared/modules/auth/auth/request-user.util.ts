import { isRecord } from '@workspace/utils';

export function getMonitoringUserContext(user: unknown): {
  userId: string | undefined;
  clinicId: string | undefined;
} {
  const userId = getAuthenticatedUserId(user) ?? undefined;
  if (!isRecord(user)) {
    return { userId, clinicId: undefined };
  }

  const clinicId =
    typeof user.clinicId === 'string' && user.clinicId.trim().length > 0
      ? user.clinicId.trim()
      : undefined;

  return { userId, clinicId };
}

export function getAuthenticatedUserId(user: unknown): string | null {
  if (!isRecord(user)) {
    return null;
  }

  const sub = typeof user.sub === 'string' ? user.sub.trim() : '';
  if (sub.length > 0) {
    return sub;
  }

  const id = typeof user.id === 'string' ? user.id.trim() : '';
  if (id.length > 0) {
    return id;
  }

  return null;
}
