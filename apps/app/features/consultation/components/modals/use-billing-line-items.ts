"use client";

import { useEffect, useState } from "react";
import { buildDefaultLineItems, syncDefaultFeeItem } from "./billing-modal-helpers";
import type { LineItem } from "./billing-modal-types";

/**
 * Owns the billing draft's line-item rows: the seeded "Consultation Fee" row
 * (kept in sync with the clinic's default fee until the user edits its price),
 * and the add/update/remove mutations the line-item editor drives.
 */
export function useBillingLineItems(defaultConsultationFee: number) {
  const [hasCustomizedDefaultFee, setHasCustomizedDefaultFee] = useState(false);
  const [items, setItems] = useState<LineItem[]>(() =>
    buildDefaultLineItems(defaultConsultationFee),
  );

  useEffect(() => {
    if (hasCustomizedDefaultFee) return;
    setItems((prev) => syncDefaultFeeItem(prev, defaultConsultationFee));
  }, [defaultConsultationFee, hasCustomizedDefaultFee]);

  const resetItems = () => {
    setItems(buildDefaultLineItems(defaultConsultationFee));
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
