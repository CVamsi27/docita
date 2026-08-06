import { useEffect, useState } from "react";
import { buildDefaultLineItems, syncDefaultFeeItem } from "./billing-modal-helpers";
import type { LineItem } from "./billing-modal-types";

/**
 * Owns the billing draft's line-item rows: the seeded "Consultation Fee" row
 * (kept in sync with the clinic's default fee until the user edits its price),
 * and the add/update/remove mutations the line-item editor drives.
 *
 * Pass `seedItems` to load the draft from an existing invoice when editing
 * (e.g. when a doctor opens billing for a visit that already has a pending
 * invoice). The fee-sync effect is bypassed while seeded rows are present.
 */
export function useBillingLineItems(
  defaultConsultationFee: number,
  seedItems?: LineItem[],
) {
  const [hasCustomizedDefaultFee, setHasCustomizedDefaultFee] = useState(false);
  const [items, setItems] = useState<LineItem[]>(() =>
    seedItems?.length
      ? seedItems.map(cloneSeedRow)
      : buildDefaultLineItems(defaultConsultationFee),
  );
  const [hasSeedItems] = useState(Boolean(seedItems?.length));

  useEffect(() => {
    if (hasCustomizedDefaultFee || hasSeedItems) return;
    setItems((prev) => syncDefaultFeeItem(prev, defaultConsultationFee));
  }, [defaultConsultationFee, hasCustomizedDefaultFee, hasSeedItems]);

  const resetItems = () => {
    setItems(
      seedItems?.length
        ? seedItems.map(cloneSeedRow)
        : buildDefaultLineItems(defaultConsultationFee),
    );
    setHasCustomizedDefaultFee(false);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, price: 0 }]);
  };

  const updateItem = (
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    if (
      index === 0 &&
      newItems[index]?.description === "Consultation Fee" &&
      field === "price"
    ) {
      setHasCustomizedDefaultFee(true);
    }
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  return { items, addItem, updateItem, removeItem, resetItems };
}

function cloneSeedRow(item: LineItem): LineItem {
  return {
    description: item.description,
    quantity: item.quantity,
    price: item.price,
  };
}
