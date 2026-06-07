import { BadRequestException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import Papa from 'papaparse';
import type { BulkImportRow, TabularRow } from './import-types';
import { normalizeBulkImportRow } from './import-row-normalizer';
import { sanitizeCellValue, isRowEmpty } from './import-row-utils';

export async function parseCsvRows(filePath: string): Promise<TabularRow[]> {
  const csvContent = await readFile(filePath, 'utf-8');
  const result = Papa.parse<TabularRow>(csvContent, {
    skipEmptyLines: 'greedy',
  });
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

export function parseCsvBufferToRecords(buffer: Buffer): BulkImportRow[] {
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
