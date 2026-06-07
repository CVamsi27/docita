import { isRecord } from '@workspace/utils';

export { getMonitoringUserContext } from './monitoring-user-context';

export function getAuthenticatedUserId(user: unknown): string | null {
  if (!isRecord(user)) return null;

  const sub = typeof user.sub === 'string' ? user.sub.trim() : '';
  if (sub.length > 0) return sub;

  const id = typeof user.id === 'string' ? user.id.trim() : '';
  if (id.length > 0) return id;

  return null;
}
