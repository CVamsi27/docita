import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { BulkImportRow } from './import-types';
import { normalizeBulkImportRow } from './import-row-normalizer';
import {
  extractNormalizedRow,
  isRowEmpty,
  toHeaderString,
  mapDataRows,
} from './import-row-utils';
import type { TabularRow } from './import-types';
import { extractWorksheetRowCells } from './excel-cell-value';
import { loadWorkbookXlsx } from './xlsx-load-boundary';

export async function parseXlsxRows(filePath: string): Promise<TabularRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet)
    throw new BadRequestException('Spreadsheet does not contain any sheets');
  const rows: TabularRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const normalized = extractNormalizedRow(
      extractWorksheetRowCells(row.values),
    );
    if (!isRowEmpty(normalized)) rows.push(normalized);
  });
  return rows;
}

export async function parseXlsxBufferToRecords(
  buffer: Buffer,
): Promise<BulkImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await loadWorkbookXlsx(workbook, buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet)
    throw new BadRequestException('Spreadsheet does not contain any sheets');
  const tabularRows: TabularRow[] = [];
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
