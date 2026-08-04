import type { LineItem } from "./billing-modal-types";

type BillingDiscountType = "PERCENTAGE" | "AMOUNT";

interface BillingCalculations {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
}

/** Builds the single-row default draft seeded with the clinic's consultation fee. */
export function buildDefaultLineItems(consultationFee: number): LineItem[] {
  return [{ description: "Consultation Fee", quantity: 1, price: consultationFee }];
}

/**
 * Keeps an untouched "Consultation Fee" row in sync with the clinic's default
 * fee (e.g. when the admin changes it while the modal is open). Returns the
 * same array reference when nothing should change, so callers can use it
 * directly inside a `setItems((prev) => ...)` updater without extra renders.
 */
export function syncDefaultFeeItem(items: LineItem[], defaultFee: number): LineItem[] {
  if (items.length !== 1) return items;
  const first = items[0];
  if (!first || first.description !== "Consultation Fee") return items;
  if (first.quantity !== 1) return items;
  if (first.price === defaultFee) return items;
  return [{ ...first, price: defaultFee }];
}

/** Computes the subtotal/tax/discount/total breakdown for the current draft. */
export function calculateBillingTotals(
  items: LineItem[],
  taxRate: number,
  discountValue: number,
  discountType: BillingDiscountType,
): BillingCalculations {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const discountAmount =
    discountType === "PERCENTAGE" ? subtotal * (discountValue / 100) : discountValue;
  const total = Math.max(0, subtotal + taxAmount - discountAmount);

  return { subtotal, taxAmount, discountAmount, total };
}

/** Returns a user-facing validation message, or `null` when the draft can be saved. */
export function validateBillingDraft(
  items: LineItem[],
  calculations: BillingCalculations,
): string | null {
  const validItems = items.filter((item) => item.description.trim() !== "");
  if (validItems.length === 0) {
    return "Add at least one billing item before saving the invoice";
  }
  if (calculations.discountAmount > calculations.subtotal) {
    return "Discount cannot exceed the subtotal";
  }
  return null;
}

/**
 * Builds the final invoice line items: the user's valid rows plus synthetic
 * "Tax" / "Discount" summary rows when those amounts are non-zero.
 */
export function buildInvoiceLineItems(
  items: LineItem[],
  calculations: BillingCalculations,
  taxRate: number,
  discountValue: number,
  discountType: BillingDiscountType,
): LineItem[] {
  const finalItems = items.filter((item) => item.description.trim() !== "");

  if (calculations.taxAmount > 0) {
    finalItems.push({
      description: `Tax (${taxRate}%)`,
      quantity: 1,
      price: Number(calculations.taxAmount.toFixed(2)),
    });
  }

  if (calculations.discountAmount > 0) {
    finalItems.push({
      description: `Discount (${discountType === "PERCENTAGE" ? `${discountValue}%` : "Flat"})`,
      quantity: 1,
      price: -Number(calculations.discountAmount.toFixed(2)),
    });
  }

  return finalItems;
}
