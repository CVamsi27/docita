import { readExcelCellObject } from './excel-cell-value';
import type { ExcelRow } from './import-types';

export type TabularRow = Array<string | number | Date | undefined>;

export function getCell(
  row: unknown,
  index: number,
): string | number | Date | undefined {
  if (!Array.isArray(row)) return undefined;
  const value = row[index];
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : undefined;
}

export function sanitizeCellValue(
  value: unknown,
): string | number | Date | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value instanceof Date) return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value && typeof value === 'object') {
    const candidate = readExcelCellObject(value);
    if (!candidate) return String(value);
    if (candidate.result !== undefined)
      return sanitizeCellValue(candidate.result);
    if (typeof candidate.text === 'string') return candidate.text;
    if (Array.isArray(candidate.richText))
      return candidate.richText
        .map((s) => s.text ?? '')
        .join('')
        .trim();
  }
  if (value == null) return undefined;
  return String(value);
}

export function isRowEmpty(
  row: Array<string | number | Date | undefined>,
): boolean {
  return row.every(
    (cell) => cell === undefined || String(cell).trim().length === 0,
  );
}

export function toHeaderString(
  value: string | number | Date | undefined,
): string {
  return value === undefined ? '' : String(value).trim();
}

export function mapDataRows(
  headers: string[],
  dataRows: Array<Array<string | number | Date | undefined>>,
): ExcelRow[] {
  return dataRows.map((row) => {
    const mapped: ExcelRow = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index];
      if (value !== undefined && String(value).trim() !== '')
        mapped[header] = value;
    });
    return mapped;
  });
}

export function trimTrailingEmptyCells(
  normalized: Array<string | number | Date | undefined>,
): void {
  while (
    normalized.length > 0 &&
    (normalized[normalized.length - 1] === undefined ||
      String(normalized[normalized.length - 1]).trim() === '')
  ) {
    normalized.pop();
  }
}

export function extractNormalizedRow(
  rawCells: unknown[],
): Array<string | number | Date | undefined> {
  const normalized = rawCells.map((cell) => {
    const s = sanitizeCellValue(cell);
    return s === '' ? undefined : s;
  });
  trimTrailingEmptyCells(normalized);
  return normalized;
}
