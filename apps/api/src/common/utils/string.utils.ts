/**
 * Safely parse a query-string pagination integer, returning undefined when the
 * value is absent or non-numeric (avoids passing NaN to Prisma take/skip).
 */
export function parsePaginationInt(
  value: string | undefined,
  opts?: { min?: number; max?: number },
): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  const min = opts?.min ?? 0;
  const max = opts?.max ?? 10_000;
  return Math.min(Math.max(parsed, min), max);
}

export class StringUtils {
  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static slugify(str: string): string {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  static sanitize(str: string): string {
    if (!str) return '';
    return str.replace(/<[^>]*>?/gm, '');
  }

  static randomString(length: number = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
