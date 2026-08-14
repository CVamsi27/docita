import { readExcelCellObject } from '../excel-cell-value';

export type ExcelCellValue = string | number | Date | undefined;

export function getCell(row: unknown, index: number): ExcelCellValue {
  if (!Array.isArray(row)) return undefined;
  const value = row[index];
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : undefined;
}

export function sanitizeCellValue(value: unknown): ExcelCellValue {
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
        .map((s: { text?: string }) => s.text ?? '')
        .join('')
        .trim();
  }
  if (value == null) return undefined;
  return String(value);
}

export function isRowEmpty(row: ExcelCellValue[]): boolean {
  return row.every(
    (cell) => cell === undefined || String(cell).trim().length === 0,
  );
}

export function toHeaderString(value: ExcelCellValue): string {
  return value === undefined ? '' : String(value).trim();
}
