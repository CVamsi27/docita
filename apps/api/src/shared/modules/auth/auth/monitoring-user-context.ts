import { isRecord } from '@workspace/utils';

function extractMonitoringUserId(user: unknown): string | undefined {
  if (!isRecord(user)) return undefined;
  const sub = typeof user.sub === 'string' ? user.sub.trim() : '';
  if (sub) return sub;
  const id = typeof user.id === 'string' ? user.id.trim() : '';
  return id || undefined;
}

export function getMonitoringUserContext(user: unknown): {
  userId: string | undefined;
  clinicId: string | undefined;
} {
  const userId = extractMonitoringUserId(user);
  if (!isRecord(user)) return { userId, clinicId: undefined };
  const clinicId =
    typeof user.clinicId === 'string' && user.clinicId.trim().length > 0
      ? user.clinicId.trim()
      : undefined;
  return { userId, clinicId };
}
