import type ExcelJS from 'exceljs';

/** ExcelJS `load` accepts a Node `Buffer` directly; this helper exists so callers
 *  can keep a single import boundary for the XLSX parse path.
 *  The `as ArrayBuffer` is unavoidable: exceljs's `Buffer extends ArrayBuffer`
 *  interface is incompatible with @types/node's generic `Buffer<ArrayBufferLike>`
 *  under TS 6.0; see SUPPRESSION_LEDGER.md §2 (Prisma/AWS/JSON bucket). */
// check-as-cast-density: allow-file — exceljs Buffer<ArrayBufferLike> ↔ ArrayBuffer coercion at the XLSX load boundary
export async function loadWorkbookXlsx(
  workbook: ExcelJS.Workbook,
  buffer: Buffer<ArrayBufferLike>,
): Promise<void> {
  // exceljs bundles its own `Buffer extends ArrayBuffer` interface, which is
  // incompatible with @types/node's generic `Buffer<ArrayBufferLike>` (TS 6.0).
  // Slice only the view's bytes into a plain ArrayBuffer to satisfy exceljs's
  // type; buffer.buffer can be a larger shared backing store (SharedArrayBuffer
  // also satisfies the cast target, and its slice() is equally valid here).
  await workbook.xlsx.load(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer,
  );
}
