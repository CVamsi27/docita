import { Injectable, BadRequestException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { extname } from 'path';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { BulkImportRow, ExcelRow } from './import-types';
import { normalizeBulkImportRow } from './import-row-normalizer';
import {
  extractWorksheetRowCells,
  readExcelCellObject,
} from './excel-cell-value';
import { loadWorkbookXlsx } from './xlsx-load-boundary';

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

function trimTrailingEmptyCells(
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

function extractNormalizedRow(
  rawCells: unknown[],
): Array<string | number | Date | undefined> {
  const normalized = rawCells.map((cell) => {
    const s = sanitizeCellValue(cell);
    return s === '' ? undefined : s;
  });
  trimTrailingEmptyCells(normalized);
  return normalized;
}

@Injectable()
export class ImportFileParserService {
  getCell(row: unknown, index: number) {
    return getCell(row, index);
  }
  sanitizeCellValue(value: unknown) {
    return sanitizeCellValue(value);
  }
  isRowEmpty(row: Array<string | number | Date | undefined>) {
    return isRowEmpty(row);
  }
  toHeaderString(value: string | number | Date | undefined) {
    return toHeaderString(value);
  }
  mapDataRows(
    headers: string[],
    dataRows: Array<Array<string | number | Date | undefined>>,
  ) {
    return mapDataRows(headers, dataRows);
  }

  getImportExtension(filePath: string): '.csv' | '.xlsx' {
    const extension = extname(filePath).toLowerCase();
    if (extension === '.xls')
      throw new BadRequestException(
        'Legacy .xls files are no longer supported. Please upload .xlsx or .csv.',
      );
    if (extension === '.csv') return '.csv';
    if (extension === '.xlsx') return '.xlsx';
    throw new BadRequestException('Only .xlsx and .csv files are allowed.');
  }

  async parseCsvRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const csvContent = await readFile(filePath, 'utf-8');
    const result = Papa.parse<Array<string | number | Date | undefined>>(
      csvContent,
      { skipEmptyLines: 'greedy' },
    );
    if (result.errors.length > 0)
      throw new BadRequestException(
        `Failed to parse CSV: ${result.errors[0].message}`,
      );
    return result.data
      .map((row) =>
        row.map((cell) => {
          const s = sanitizeCellValue(cell);
          return s === '' ? undefined : s;
        }),
      )
      .filter((row) => !isRowEmpty(row));
  }

  async parseXlsxRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    if (!worksheet)
      throw new BadRequestException('Spreadsheet does not contain any sheets');
    const rows: Array<Array<string | number | Date | undefined>> = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const normalized = extractNormalizedRow(
        extractWorksheetRowCells(row.values),
      );
      if (!isRowEmpty(normalized)) rows.push(normalized);
    });
    return rows;
  }

  async parseTabularRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const extension = this.getImportExtension(filePath);
    return extension === '.csv'
      ? this.parseCsvRows(filePath)
      : this.parseXlsxRows(filePath);
  }

  getBulkImportExtension(fileName: string): '.csv' | '.xlsx' {
    const extension = extname(fileName).toLowerCase();
    if (extension === '.xls')
      throw new BadRequestException(
        'Legacy .xls files are no longer supported. Please upload .xlsx or .csv.',
      );
    if (extension === '.xlsx') return '.xlsx';
    if (extension === '.csv' || extension === '') return '.csv';
    throw new BadRequestException(
      'Bulk import supports .csv and .xlsx files only.',
    );
  }

  parseCsvBufferToRecords(buffer: Buffer): BulkImportRow[] {
    const csvData = buffer.toString('utf-8');
    const result = Papa.parse<Record<string, unknown>>(csvData, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });
    if (result.errors.length > 0)
      throw new BadRequestException(
        `Failed to parse CSV: ${result.errors[0]?.message ?? 'unknown error'}`,
      );
    return result.data
      .map((row) => normalizeBulkImportRow(row))
      .filter((row) => Object.keys(row).length > 0);
  }

  async parseXlsxBufferToRecords(buffer: Buffer): Promise<BulkImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await loadWorkbookXlsx(workbook, buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet)
      throw new BadRequestException('Spreadsheet does not contain any sheets');
    const tabularRows: Array<Array<string | number | Date | undefined>> = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const cells = Array.isArray(row.values) ? row.values : [];
      const normalized = extractNormalizedRow(cells.slice(1));
      if (!isRowEmpty(normalized)) tabularRows.push(normalized);
    });
    if (tabularRows.length < 2)
      throw new BadRequestException(
        'Spreadsheet must have a header row and at least one data row',
      );
    const headers = tabularRows[0].map(toHeaderString);
    if (headers.filter((h) => h.length > 0).length === 0)
      throw new BadRequestException('Header row is empty');
    return mapDataRows(headers, tabularRows.slice(1)).map((row) =>
      normalizeBulkImportRow(row),
    );
  }

  async parseBulkImportBuffer(
    fileName: string,
    buffer: Buffer,
  ): Promise<BulkImportRow[]> {
    const extension = this.getBulkImportExtension(fileName);
    if (extension === '.csv') {
      const rows = this.parseCsvBufferToRecords(buffer);
      if (rows.length === 0) throw new BadRequestException('CSV file is empty');
      return rows;
    }
    const rows = await this.parseXlsxBufferToRecords(buffer);
    if (rows.length === 0)
      throw new BadRequestException('Spreadsheet has no data rows');
    return rows;
  }

  generateCsvHeaderLine(headers: string[]): string {
    return Papa.unparse([headers], { quotes: false });
  }
}
