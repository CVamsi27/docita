"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreateInvoice } from "@workspace/data-access";
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
 */
export function useBillingSubmission({
  items,
  resetItems,
  appointmentId,
  patientId,
  onSaved,
  onOpenChange,
}: {
  items: LineItem[];
  resetItems: () => void;
  appointmentId?: string;
  patientId?: string;
  onSaved?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "AMOUNT">(
    "AMOUNT",
  );
  const [paymentMode, setPaymentMode] = useState<string>("CASH");

  const createInvoice = useCreateInvoice();

  const calculations = useMemo(
    () => calculateBillingTotals(items, taxRate, discountValue, discountType),
    [items, taxRate, discountValue, discountType],
  );

  const handleSave = async () => {
    try {
      if (!appointmentId || !patientId) return;

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

      await createInvoice.mutateAsync({
        patientId,
        appointmentId,
        items: finalItems,
        notes: `Generated from consultation. Payment Mode: ${paymentMode}`,
        status: "PENDING",
        total: Number(calculations.total.toFixed(2)),
      });

      toast.success("Invoice created");
      onSaved?.();
      onOpenChange?.(false);
      resetItems();
      setTaxRate(0);
      setDiscountValue(0);
    } catch {
      showUserFacingErrorToast(
        "We could not create the invoice. Please try again.",
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
    calculations,
    createInvoice,
    handleSave,
    discountTypeValues: BILLING_DISCOUNT_TYPE_VALUES,
  };
}
