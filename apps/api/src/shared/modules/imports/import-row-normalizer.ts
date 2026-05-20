import { DATE_FORMATS, formatDate } from '@workspace/utils';

export function normalizeImportPhoneNumber(
  phone: string | number | undefined,
): string {
  if (!phone) return '';

  const normalized = phone.toString().replace(/\D/g, '');

  if (normalized.length === 10) {
    return normalized;
  }
  if (normalized.length === 11 && normalized.startsWith('1')) {
    return normalized.substring(1);
  }
  if (normalized.length === 12 && normalized.startsWith('91')) {
    return normalized.substring(2);
  }

  return normalized;
}

export function cleanImportName(name: string | number | undefined): string {
  if (!name) return '';
  return name
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(
      (word: string) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');
}

export function cleanImportEmail(
  email: string | number | undefined,
): string | undefined {
  if (!email) return undefined;

  const cleaned = email.toString().trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(cleaned) ? cleaned : undefined;
}

export function parseImportDate(
  dateStr: string | number | Date | undefined,
): Date | null {
  if (!dateStr) return null;

  if (dateStr instanceof Date) {
    return dateStr;
  }

  if (typeof dateStr === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + dateStr * 86400000);
  }

  const str = dateStr.toString().trim();

  const isoDate = new Date(str);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

export function formatImportDateMedium(date: Date): string {
  return formatDate(date, DATE_FORMATS.DATE_MEDIUM);
}

export function readImportRowString(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = row[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

export function readImportRowOptionalString(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  return readImportRowString(row, key);
}

export function readImportRowRequiredString(
  row: Record<string, unknown>,
  key: string,
): string {
  const value = readImportRowString(row, key);
  if (!value) {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

export function normalizeBulkImportRow(
  row: Record<string, unknown>,
): Record<string, string | number | boolean | null | undefined> {
  const normalized: Record<
    string,
    string | number | boolean | null | undefined
  > = {};
  for (const [key, value] of Object.entries(row)) {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        normalized[trimmedKey] = trimmed;
      }
      continue;
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      normalized[trimmedKey] = value;
    }
  }
  return normalized;
}
