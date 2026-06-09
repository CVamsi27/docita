import type { OCRInvoiceLineForm } from "@/features/ocr/types";

/** A blank invoice line row used to seed the editor when no rows exist yet. */
export function createEmptyInvoiceLine(): OCRInvoiceLineForm {
  return {
    description: "",
    quantity: "",
    unitPrice: "",
    total: "",
  };
}

/**
 * Apply a partial patch to the row at `index`, accounting for the
 * "no rows yet" placeholder state where `items` is still empty.
 */
export function patchInvoiceLineAt(
  items: OCRInvoiceLineForm[],
  rows: OCRInvoiceLineForm[],
  index: number,
  patch: Partial<OCRInvoiceLineForm>,
): OCRInvoiceLineForm[] | null {
  const row = rows[index];
  if (!row) return null;

  const nextRow = { ...row, ...patch };
  if (items.length === 0) {
    return [nextRow];
  }

  const next = [...items];
  next[index] = { ...next[index], ...patch };
  return next;
}

/** Append a new blank row, seeding from `rows` when `items` is still empty. */
export function addInvoiceLine(
  items: OCRInvoiceLineForm[],
  rows: OCRInvoiceLineForm[],
): OCRInvoiceLineForm[] {
  if (items.length === 0) {
    return [...rows, createEmptyInvoiceLine()];
  }
  return [...items, createEmptyInvoiceLine()];
}

/** Remove the row at `index`; a no-op (returns an empty list) for the placeholder state. */
export function removeInvoiceLine(
  items: OCRInvoiceLineForm[],
  index: number,
): OCRInvoiceLineForm[] {
  if (items.length === 0) return [];
  return items.filter((_, i) => i !== index);
}
