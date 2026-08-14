import type { ExcelRow } from '../import-types';
import { type ExcelCellValue, sanitizeCellValue } from './excel-cell-parsers';

export function mapDataRows(
  headers: string[],
  dataRows: Array<ExcelCellValue[]>,
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

export function trimTrailingEmptyCells(normalized: ExcelCellValue[]): void {
  while (
    normalized.length > 0 &&
    (normalized[normalized.length - 1] === undefined ||
      String(normalized[normalized.length - 1]).trim() === '')
  ) {
    normalized.pop();
  }
}

export function extractNormalizedRow(rawCells: unknown[]): ExcelCellValue[] {
  const normalized = rawCells.map((cell) => {
    const s = sanitizeCellValue(cell);
    return s === '' ? undefined : s;
  });
  trimTrailingEmptyCells(normalized);
  return normalized;
}
