import { isRecord } from "@workspace/utils";
import type { ItemDetail } from "./InventoryItemDetailsUI";
import { toInventoryMovements } from "./inventory-item-movement-mapper";

export function toInventoryItemDetail(rawItem: unknown): ItemDetail | null {
  const rawData = isRecord(rawItem) ? rawItem : null;
  if (!rawData) return null;
  const expiryDate = stringField(rawData.expiryDate);
  return {
    name: textValue(rawData.name),
    category: textValue(rawData.category),
    sku: textValue(rawData.sku),
    quantity: numberValue(rawData.quantity),
    minQuantity: numberValue(rawData.minQuantity),
    unit: textValue(rawData.unit),
    purchasePrice: numberValue(rawData.purchasePrice),
    sellingPrice: numberValue(rawData.sellingPrice),
    movements: toInventoryMovements(rawData.movements),
    ...(expiryDate ? { expiryDate } : {}),
  };
}

function textValue(value: unknown): string {
  return String(value ?? "");
}

function numberValue(value: unknown): number {
  return Number(value ?? 0);
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
