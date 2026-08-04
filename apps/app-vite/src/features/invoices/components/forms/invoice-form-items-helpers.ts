import type { InvoiceLineItemFormValues } from "@workspace/types";

export function computeInvoiceItems(
  fields: Array<{ id: string }>,
  watchedItems: unknown[],
) {
  return fields.map((field, index) => {
    const item = (watchedItems[index] ?? {}) as Record<string, unknown>;
    const quantity = (item.quantity as number) || 0;
    const price = (item.price as number) || 0;
    const taxTreatment = (item.taxTreatment as string) || "EXEMPT_HEALTHCARE";
    const taxRate = (item.taxRate as number) || 0;

    return {
      id: field.id,
      description: (item.description as string) ?? "",
      quantity,
      unitPrice: price,
      taxTreatment,
      taxRate,
      hsnCode: (item.hsnCode as string) ?? "",
      sacCode: (item.sacCode as string) ?? "",
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
