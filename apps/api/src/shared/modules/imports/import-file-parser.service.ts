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

export type TabularRow = Array<string | number | Date | undefined>;

@Injectable()
export class ImportFileParserService {
  private readonly supportedImportExtensions = new Set(['.csv', '.xlsx']);

  getCell(row: unknown, index: number): string | number | Date | undefined {
    if (!Array.isArray(row)) {
      return undefined;
    }

    const value = row[index];
    return typeof value === 'string' || typeof value === 'number'
      ? value
      : undefined;
  }

  sanitizeCellValue(value: unknown): string | number | Date | undefined {
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (value && typeof value === 'object') {
      const candidate = readExcelCellObject(value);
      if (!candidate) {
        return String(value);
      }

      if (candidate.result !== undefined) {
        return this.sanitizeCellValue(candidate.result);
      }

      if (typeof candidate.text === 'string') {
        return candidate.text;
      }

      if (Array.isArray(candidate.richText)) {
        return candidate.richText
          .map((segment) => segment.text ?? '')
          .join('')
          .trim();
      }
    }

    if (value == null) {
      return undefined;
    }

    return String(value);
  }

  isRowEmpty(row: Array<string | number | Date | undefined>): boolean {
    return row.every(
      (cell) => cell === undefined || String(cell).trim().length === 0,
    );
  }

  getImportExtension(filePath: string): '.csv' | '.xlsx' {
    const extension = extname(filePath).toLowerCase();
    if (extension === '.xls') {
      throw new BadRequestException(
        'Legacy .xls files are no longer supported. Please upload .xlsx or .csv.',
      );
    }

    if (extension === '.csv') {
      return '.csv';
    }
    if (extension === '.xlsx') {
      return '.xlsx';
    }

    throw new BadRequestException('Only .xlsx and .csv files are allowed.');
  }

  async parseCsvRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const csvContent = await readFile(filePath, 'utf-8');
    const result = Papa.parse<Array<string | number | Date | undefined>>(
      csvContent,
      {
        skipEmptyLines: 'greedy',
      },
    );

    if (result.errors.length > 0) {
      throw new BadRequestException(
        `Failed to parse CSV: ${result.errors[0].message}`,
      );
    }

    return result.data
      .map((row) =>
        row.map((cell) => {
          const sanitized = this.sanitizeCellValue(cell);
          return sanitized === '' ? undefined : sanitized;
        }),
      )
      .filter((row) => !this.isRowEmpty(row));
  }

  async parseXlsxRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Spreadsheet does not contain any sheets');
    }

    const rows: Array<Array<string | number | Date | undefined>> = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const normalized = extractWorksheetRowCells(row.values)
        .map((cell) => this.sanitizeCellValue(cell))
        .map((cell) => (cell === '' ? undefined : cell));

      while (
        normalized.length > 0 &&
        (normalized[normalized.length - 1] === undefined ||
          String(normalized[normalized.length - 1]).trim() === '')
      ) {
        normalized.pop();
      }

      if (!this.isRowEmpty(normalized)) {
        rows.push(normalized);
      }
    });

    return rows;
  }

  async parseTabularRows(
    filePath: string,
  ): Promise<Array<Array<string | number | Date | undefined>>> {
    const extension = this.getImportExtension(filePath);
    if (extension === '.csv') {
      return this.parseCsvRows(filePath);
    }
    return this.parseXlsxRows(filePath);
  }

  toHeaderString(value: string | number | Date | undefined): string {
    if (value === undefined) {
      return '';
    }

    return String(value).trim();
  }

  mapDataRows(
    headers: string[],
    dataRows: Array<Array<string | number | Date | undefined>>,
  ): ExcelRow[] {
    return dataRows.map((row) => {
      const mapped: ExcelRow = {};
      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        const value = row[index];
        if (value !== undefined && String(value).trim() !== '') {
          mapped[header] = value;
        }
      });
      return mapped;
    });
  }

  getBulkImportExtension(fileName: string): '.csv' | '.xlsx' {
    const extension = extname(fileName).toLowerCase();
    if (extension === '.xls') {
      throw new BadRequestException(
        'Legacy .xls files are no longer supported. Please upload .xlsx or .csv.',
      );
    }
    if (extension === '.xlsx') {
      return '.xlsx';
    }
    if (extension === '.csv' || extension === '') {
      return '.csv';
    }
    throw new BadRequestException(
      'Bulk import supports .csv and .xlsx files only.',
    );
  }

  parseCsvBufferToRecords(buffer: Buffer): BulkImportRow[] {
    const csvData = buffer.toString('utf-8');
    const result = Papa.parse<Record<string, unknown>>(csvData, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      throw new BadRequestException(
        `Failed to parse CSV: ${result.errors[0]?.message ?? 'unknown error'}`,
      );
    }

    return result.data
      .map((row) => normalizeBulkImportRow(row))
      .filter((row) => Object.keys(row).length > 0);
  }

  async parseXlsxBufferToRecords(buffer: Buffer): Promise<BulkImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    // ExcelJS typings expect Node Buffer; runtime accepts Uint8Array from our Buffer input.
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Spreadsheet does not contain any sheets');
    }

    const tabularRows: Array<Array<string | number | Date | undefined>> = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const cells = row.values as unknown[];
      const normalized = cells
        .slice(1)
        .map((cell) => this.sanitizeCellValue(cell))
        .map((cell) => (cell === '' ? undefined : cell));

      while (
        normalized.length > 0 &&
        (normalized[normalized.length - 1] === undefined ||
          String(normalized[normalized.length - 1]).trim() === '')
      ) {
        normalized.pop();
      }

      if (!this.isRowEmpty(normalized)) {
        tabularRows.push(normalized);
      }
    });

    if (tabularRows.length < 2) {
      throw new BadRequestException(
        'Spreadsheet must have a header row and at least one data row',
      );
    }

    const headers = tabularRows[0].map((value) => this.toHeaderString(value));
    if (headers.filter((header) => header.length > 0).length === 0) {
      throw new BadRequestException('Header row is empty');
    }

    return this.mapDataRows(headers, tabularRows.slice(1)).map((row) =>
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
      if (rows.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }
      return rows;
    }

    const rows = await this.parseXlsxBufferToRecords(buffer);
    if (rows.length === 0) {
      throw new BadRequestException('Spreadsheet has no data rows');
    }
    return rows;
  }

  generateCsvHeaderLine(headers: string[]): string {
    return Papa.unparse([headers], { quotes: false });
  }
}
