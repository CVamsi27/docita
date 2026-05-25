// check-as-cast-density: allow-file — ExcelJS `xlsx.load` typings disagree with Node `Buffer`
import type ExcelJS from 'exceljs';

type XlsxLoadInput = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];

/** ExcelJS `load` typings disagree with Node `Buffer`; keep the cast in one place. */
export async function loadWorkbookXlsx(
  workbook: ExcelJS.Workbook,
  buffer: Buffer,
): Promise<void> {
  await workbook.xlsx.load(buffer as unknown as XlsxLoadInput);
}
