type RequestUserShape = {
  id?: unknown;
  sub?: unknown;
  clinicId?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
