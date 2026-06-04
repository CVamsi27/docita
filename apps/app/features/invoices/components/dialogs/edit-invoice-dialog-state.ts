import type { Invoice, InvoiceItem } from "@workspace/types";

export type EditableInvoiceItemField = "description" | "quantity" | "price";

const invoiceStatusByInput: Record<string, Invoice["status"]> = {
  PAID: "PAID",
  PENDING: "PENDING",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
};

const itemFieldUpdaters: Record<
  EditableInvoiceItemField,
  (item: InvoiceItem, value: string | number) => InvoiceItem
> = {
  description: updateDescription,
  quantity: updateQuantity,
  price: updatePrice,
};

export function createBlankInvoiceItem(): InvoiceItem {
  return { description: "", quantity: 1, price: 0 };
}

export function removeInvoiceItem(
  items: InvoiceItem[],
  index: number,
): InvoiceItem[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

export function updateInvoiceItems(
  items: InvoiceItem[],
  index: number,
  field: EditableInvoiceItemField,
  value: string | number,
): InvoiceItem[] {
  return items.map((item, itemIndex) =>
    itemIndex === index ? updateInvoiceItem(item, field, value) : item,
  );
}

export function calculateInvoiceTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

export function parseInvoiceStatus(
  nextStatus: string,
): Invoice["status"] | null {
  return invoiceStatusByInput[nextStatus.toUpperCase()] ?? null;
}

function updateInvoiceItem(
  item: InvoiceItem,
  field: EditableInvoiceItemField,
  value: string | number,
): InvoiceItem {
  return itemFieldUpdaters[field](item, value);
}

function updateDescription(
  item: InvoiceItem,
  value: string | number,
): InvoiceItem {
  return typeof value === "string" ? { ...item, description: value } : item;
}

function updateQuantity(
  item: InvoiceItem,
  value: string | number,
): InvoiceItem {
  return typeof value === "number" ? { ...item, quantity: value } : item;
}

function updatePrice(item: InvoiceItem, value: string | number): InvoiceItem {
  return typeof value === "number" ? { ...item, price: value } : item;
}
