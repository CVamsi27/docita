import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import Papa from 'papaparse';
import type { BulkImportRow } from './import-types';
import {
  getCell,
  sanitizeCellValue,
  isRowEmpty,
  toHeaderString,
  mapDataRows,
  type TabularRow,
} from './import-row-utils';
import { parseCsvRows, parseCsvBufferToRecords } from './csv-row-parser';
import {
  parseXlsxRows,
  parseXlsxBufferToRecords,
} from './xlsx-worksheet-parser';

@Injectable()
export class ImportFileParserService {
  getCell(row: unknown, index: number) {
    return getCell(row, index);
  }
  sanitizeCellValue(value: unknown) {
    return sanitizeCellValue(value);
  }
  isRowEmpty(row: TabularRow) {
    return isRowEmpty(row);
  }
  toHeaderString(value: string | number | Date | undefined) {
    return toHeaderString(value);
  }
  mapDataRows(headers: string[], dataRows: TabularRow[]) {
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

  async parseCsvRows(filePath: string): Promise<TabularRow[]> {
    return parseCsvRows(filePath);
  }

  async parseXlsxRows(filePath: string): Promise<TabularRow[]> {
    return parseXlsxRows(filePath);
  }

  async parseTabularRows(filePath: string): Promise<TabularRow[]> {
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
    return parseCsvBufferToRecords(buffer);
  }

  async parseXlsxBufferToRecords(buffer: Buffer): Promise<BulkImportRow[]> {
    return parseXlsxBufferToRecords(buffer);
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
