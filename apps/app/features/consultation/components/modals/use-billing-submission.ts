"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useCreateInvoice,
  useUpdateInvoice,
  type InvoiceListRow,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  buildInvoiceLineItems,
  calculateBillingTotals,
  validateBillingDraft,
} from "./billing-modal-helpers";
import type { LineItem } from "./billing-modal-types";

const BILLING_DISCOUNT_TYPE_VALUES = ["PERCENTAGE", "AMOUNT"] as const;

/**
 * Owns the billing draft's tax/discount/payment inputs, the derived totals,
 * and the save-to-invoice flow (validation, synthetic tax/discount summary
 * rows, and resetting the draft back to its seeded state on success).
 *
 * When `existingInvoice` is provided the hook switches into edit mode: it
 * routes the save through `useUpdateInvoice` and keeps the line items
 * pre-populated. The `collectNow` toggle is hidden in edit mode because the
 * invoice is already issued — settlement is a desk workflow.
 */
export function useBillingSubmission({
  items,
  resetItems,
  appointmentId,
  patientId,
  existingInvoice,
  onSaved,
  onOpenChange,
}: {
  items: LineItem[];
  resetItems: () => void;
  appointmentId?: string;
  patientId?: string;
  existingInvoice?: InvoiceListRow | null;
  onSaved?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEditMode = Boolean(existingInvoice?.id);
  const initialDueDate = useMemo(() => {
    if (!existingInvoice?.dueDate) {
      return new Date().toISOString().split("T")[0];
    }
    const raw = String(existingInvoice.dueDate);
    return raw.length >= 10 ? raw.slice(0, 10) : raw;
  }, [existingInvoice?.dueDate]);

  const [dueDate, setDueDate] = useState<string>(initialDueDate);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(
    Math.abs(existingInvoice?.discountTotal ?? 0),
  );
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "AMOUNT">(
    "AMOUNT",
  );
  const [paymentMode, setPaymentMode] = useState<string>(
    existingInvoice?.paymentMethod ?? "CASH",
  );
  const [collectNow, setCollectNow] = useState<boolean>(
    existingInvoice?.status === "PAID",
  );

  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice(existingInvoice?.id ?? "");

  const calculations = useMemo(
    () => calculateBillingTotals(items, taxRate, discountValue, discountType),
    [items, taxRate, discountValue, discountType],
  );

  const handleSave = async () => {
    try {
      if (!patientId) return;

      const validationError = validateBillingDraft(items, calculations);
      if (validationError) {
        showUserFacingErrorToast(validationError);
        return;
      }

      const finalItems = buildInvoiceLineItems(
        items,
        calculations,
        taxRate,
        discountValue,
        discountType,
      );

      const notes = isEditMode
        ? existingInvoice?.notes ?? ""
        : `Generated from consultation. Payment Mode: ${paymentMode}`;
      const status = collectNow ? "PAID" : "PENDING";
      const total = Number(calculations.total.toFixed(2));

      if (isEditMode && existingInvoice?.id) {
        await updateInvoice.mutateAsync({
          id: existingInvoice.id,
          items: finalItems,
          notes,
          status,
          total,
        });
        toast.success("Invoice updated");
      } else {
        if (!appointmentId) return;
        await createInvoice.mutateAsync({
          patientId,
          appointmentId,
          items: finalItems,
          notes,
          status,
          total,
        });
        toast.success(collectNow ? "Invoice created and marked as paid" : "Invoice created");
      }

      onSaved?.();
      onOpenChange?.(false);
      resetItems();
      setTaxRate(0);
      setDiscountValue(0);
      setCollectNow(false);
    } catch {
      showUserFacingErrorToast(
        isEditMode
          ? "We could not update the invoice. Please try again."
          : "We could not create the invoice. Please try again.",
      );
    }
  };

  return {
    dueDate,
    setDueDate,
    taxRate,
    setTaxRate,
    discountValue,
    setDiscountValue,
    discountType,
    setDiscountType,
    paymentMode,
    setPaymentMode,
    collectNow,
    setCollectNow,
    calculations,
    createInvoice,
    updateInvoice,
    handleSave,
    isEditMode,
    discountTypeValues: BILLING_DISCOUNT_TYPE_VALUES,
  };
}
