/** Pure OCR field-mapping helpers — no React hooks. */
import { importInvoiceDraftSchema, type OcrImportCommitRequest } from "@workspace/types";
import type { OCRInvoiceForm } from "@/features/ocr/types";

export function emptyOcrInvoiceForm(): OCRInvoiceForm {
  return { saveAsPending: false, grandTotal: "", subtotal: "", taxTotal: "", items: [] };
}

export function parseMoneyInput(raw: string): number {
  const t = raw.replace(/,/g, "").trim();
  if (t.length === 0) return Number.NaN;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function mapOcrFieldsToInvoiceForm(fields: unknown): OCRInvoiceForm {
  const empty = emptyOcrInvoiceForm();
  if (!fields || typeof fields !== "object") return empty;
  const invUnknown = (fields as { invoice?: unknown }).invoice;
  if (!invUnknown || typeof invUnknown !== "object" || invUnknown === null) return empty;
  const inv = invUnknown as Record<string, unknown>;
  const itemsRaw = inv.items;
  const items: OCRInvoiceForm["items"] = [];
  if (Array.isArray(itemsRaw)) {
    for (const row of itemsRaw) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const description = typeof r.description === "string" ? r.description : String(r.description ?? "");
      const quantity = typeof r.quantity === "number" && Number.isFinite(r.quantity) ? String(r.quantity) : String(r.quantity ?? "");
      const unitPrice = typeof r.unitPrice === "number" && Number.isFinite(r.unitPrice) ? String(r.unitPrice) : String(r.unitPrice ?? "");
      const total = typeof r.total === "number" && Number.isFinite(r.total) ? String(r.total) : String(r.total ?? "");
      items.push({ description, quantity, unitPrice, total });
    }
  }
  const numStr = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? String(v) : "";
  let grandTotal = numStr(inv.total);
  if (!grandTotal && items.length > 0) {
    let sum = 0; let any = false;
    for (const it of items) {
      const t = parseMoneyInput(it.total);
      if (Number.isFinite(t)) { sum += t; any = true; }
    }
    if (any) grandTotal = String(sum);
  }
  return { saveAsPending: false, grandTotal, subtotal: numStr(inv.subtotal), taxTotal: numStr(inv.tax), items };
}

export function buildInvoiceDraftForCommit(
  invoice: OCRInvoiceForm,
): OcrImportCommitRequest["invoiceDraft"] | undefined {
  if (!invoice.saveAsPending) return undefined;
  const parsedItems = invoice.items
    .map((row) => {
      const description = row.description.trim();
      if (description.length === 0) return null;
      const quantity = parseMoneyInput(row.quantity);
      const unitPrice = parseMoneyInput(row.unitPrice);
      let total = parseMoneyInput(row.total);
      if (!Number.isFinite(total) && Number.isFinite(quantity) && Number.isFinite(unitPrice)) {
        total = quantity * unitPrice;
      }
      if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(total) || total < 0) {
        return null;
      }
      return { description, quantity, unitPrice, total };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const grandTotal = parseMoneyInput(invoice.grandTotal);
  const subtotalRaw = parseMoneyInput(invoice.subtotal);
  const taxRaw = parseMoneyInput(invoice.taxTotal);
  const draft = {
    grandTotal,
    subtotal: Number.isFinite(subtotalRaw) ? subtotalRaw : undefined,
    taxTotal: Number.isFinite(taxRaw) ? taxRaw : undefined,
    items: parsedItems,
  };
  const parsed = importInvoiceDraftSchema.safeParse(draft);
  if (!parsed.success) return undefined;
  return parsed.data;
}
