"use client";

import { useInventoryItem } from "@workspace/data-access";
import { isRecord } from "@workspace/utils";
import {
  InventoryItem,
  InventoryItemDetailsUI,
  InventoryMovement,
} from "./InventoryItemDetailsUI";

interface InventoryItemDetailsContainerProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryItemDetailsContainer({
  itemId,
  open,
  onOpenChange,
}: InventoryItemDetailsContainerProps) {
  const { data: rawItem, isLoading } = useInventoryItem(itemId || "");
  const rawData =
    rawItem && typeof rawItem === "object" && !Array.isArray(rawItem)
      ? Object.fromEntries(Object.entries(rawItem))
      : null;

  const movements = Array.isArray(rawData?.movements)
    ? rawData.movements
        .map((entry): InventoryMovement | null => {
          if (!isRecord(entry)) return null;
          if (
            typeof entry.id !== "string" ||
            typeof entry.type !== "string" ||
            typeof entry.quantity !== "number"
          ) {
            return null;
          }
          const createdAt =
            entry.createdAt instanceof Date
              ? entry.createdAt.toISOString()
              : typeof entry.createdAt === "string"
                ? entry.createdAt
                : null;
          if (!createdAt) return null;
          return {
            id: entry.id,
            type: entry.type,
            quantity: entry.quantity,
            createdAt,
            notes: typeof entry.notes === "string" ? entry.notes : undefined,
          };
        })
        .filter((entry): entry is InventoryMovement => entry !== null)
    : [];

  const item: InventoryItem | null = rawData
    ? {
        name: String(rawData.name || ""),
        category: String(rawData.category || ""),
        sku: String(rawData.sku || ""),
        quantity: Number(rawData.quantity || 0),
        minQuantity: Number(rawData.minQuantity || 0),
        unit: String(rawData.unit || ""),
        purchasePrice: Number(rawData.purchasePrice || 0),
        sellingPrice: Number(rawData.sellingPrice || 0),
        expiryDate:
          typeof rawData.expiryDate === "string"
            ? rawData.expiryDate
            : undefined,
        movements,
      }
    : null;

  return (
    <InventoryItemDetailsUI
      open={open}
      item={item}
      isLoading={isLoading}
      onOpenChange={onOpenChange}
    />
  );
}

export { InventoryItemDetailsContainer as InventoryItemDetails };
