"use client";

import { useInventoryItem } from "@/hooks/api/use-inventory";
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
  const rawData = rawItem as Record<string, unknown> | null | undefined;

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
        expiryDate: rawData.expiryDate as string | undefined,
        movements: (rawData.movements as InventoryMovement[]) || [],
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
