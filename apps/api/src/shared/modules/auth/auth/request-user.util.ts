type RequestUserShape = {
  id?: unknown;
  sub?: unknown;
};

export function getAuthenticatedUserId(user: unknown): string | null {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const candidate = user as RequestUserShape;
  const sub = typeof candidate.sub === 'string' ? candidate.sub.trim() : '';
  if (sub.length > 0) {
    return sub;
  }

  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  if (id.length > 0) {
    return id;
  }

  return null;
}
