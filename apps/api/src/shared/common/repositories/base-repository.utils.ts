export function extractId(item: unknown): string | undefined {
  if (!item || typeof item !== 'object' || !('id' in item)) {
    return undefined;
  }

  const id = item.id;
  return typeof id === 'string' ? id : undefined;
}

export function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}
