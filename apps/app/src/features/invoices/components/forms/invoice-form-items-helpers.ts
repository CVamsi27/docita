import type { InvoiceLineItemFormValues } from "@workspace/types";
import { isRecord } from "@workspace/utils";

export function computeInvoiceItems(
  fields: Array<{ id: string }>,
  watchedItems: unknown[],
) {
  return fields.map((field, index) => {
    const rawItem = watchedItems[index];
    const item = isRecord(rawItem) ? rawItem : {};
    // Watched RHF values can be strings for number inputs; Number() preserves
    // the previous coercion semantics for the line-total math.
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const taxTreatment =
      typeof item.taxTreatment === "string" && item.taxTreatment
        ? item.taxTreatment
        : "EXEMPT_HEALTHCARE";
    const taxRate = Number(item.taxRate) || 0;
    const description =
      typeof item.description === "string" ? item.description : "";
    const hsnCode = typeof item.hsnCode === "string" ? item.hsnCode : "";
    const sacCode = typeof item.sacCode === "string" ? item.sacCode : "";

    return {
      id: field.id,
      description,
      quantity,
      unitPrice: price,
      taxTreatment,
      taxRate,
      hsnCode,
      sacCode,
      total:
        quantity * price +
        (taxTreatment === "TAXABLE" ? (taxRate / 100) * quantity * price : 0),
    };
  });
}

export const EMPTY_INVOICE_ITEM: InvoiceLineItemFormValues = {
  description: "",
  quantity: 1,
  price: 0,
  taxTreatment: "EXEMPT_HEALTHCARE",
  taxRate: 0,
};

export function buildInvoiceItemUpdateHandler(
  setValue: (path: string, value: unknown) => void,
  buildFieldPath: (index: number, fieldName: string) => string,
) {
  return (index: number, key: string, value: unknown) => {
    const fieldName = key === "unitPrice" ? "price" : key;
    setValue(buildFieldPath(index, fieldName), value);
    if (key === "taxTreatment" && value !== "TAXABLE") {
      setValue(buildFieldPath(index, "taxRate"), 0);
    }
  };
}
