"use client";

import { useInventoryItem } from "@workspace/data-access";
import { InventoryItemDetailsUI } from "./InventoryItemDetailsUI";
import { toInventoryItemDetail } from "./inventory-item-details-mapper";

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
  const item = toInventoryItemDetail(rawItem);

  return (
    <InventoryItemDetailsUI
      open={open}
      item={item}
      isLoading={isLoading}
      onOpenChange={onOpenChange}
    />
  );
}

