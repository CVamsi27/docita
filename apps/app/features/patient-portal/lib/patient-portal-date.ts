export function toPortalIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}
