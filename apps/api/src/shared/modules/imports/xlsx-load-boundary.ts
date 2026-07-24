import type ExcelJS from 'exceljs';

/** ExcelJS `load` accepts a Node `Buffer` directly; this helper exists so callers
 *  can keep a single import boundary for the XLSX parse path. */
export async function loadWorkbookXlsx(
  workbook: ExcelJS.Workbook,
  buffer: Buffer,
): Promise<void> {
  await workbook.xlsx.load(buffer);
}
