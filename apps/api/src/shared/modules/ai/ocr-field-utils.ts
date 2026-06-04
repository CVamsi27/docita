export const toOcrString = (value: string | number | undefined): string =>
  value !== undefined && value !== null ? String(value) : '';

export function truthyArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}
