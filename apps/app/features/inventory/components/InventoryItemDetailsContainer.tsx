"use client";

import { useInventoryItem } from "@/hooks/api/use-inventory";
import {
  InventoryItemDetailsUI,
  InventoryItem,
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
  // Transform the raw API data to our typed structure
  const item: InventoryItem | null = rawItem
    ? {
        name: rawItem.name,
        category: rawItem.category,
        sku: (rawItem as Record<string, unknown>).sku as string,
        quantity: rawItem.quantity,
        minQuantity: rawItem.minQuantity,
        unit: rawItem.unit,
        purchasePrice: (rawItem as Record<string, unknown>)
          .purchasePrice as number,
        sellingPrice: (rawItem as Record<string, unknown>)
          .sellingPrice as number,
        expiryDate: rawItem.expiryDate,
        movements: rawItem.movements as InventoryMovement[],
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

// Alias for import compatibility
export { InventoryItemDetailsContainer as InventoryItemDetails };
