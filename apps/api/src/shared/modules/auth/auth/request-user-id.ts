import { isRecord } from '@workspace/utils';

/**
 * Resolve the authenticated user id from a request user object.
 *
 * Accepts the loose shape of `req.user` (or any unknown payload) and returns
 * the best-effort user id, or `null` when the payload is missing a usable
 * identifier. The audit + clinic context helpers rely on this for stable
 * user attribution across the API.
 */
export function getAuthenticatedUserId(user: unknown): string | null {
  if (!isRecord(user)) return null;

  const sub = typeof user.sub === 'string' ? user.sub.trim() : '';
  if (sub.length > 0) return sub;

  const id = typeof user.id === 'string' ? user.id.trim() : '';
  if (id.length > 0) return id;

  return null;
}
