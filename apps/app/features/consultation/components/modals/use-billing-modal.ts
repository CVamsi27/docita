"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useCreateInvoice } from "@workspace/data-access";
import { useDefaultValue } from "@/lib/contexts/app-config-context";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import type { LineItem } from "./billing-modal-types";

const BILLING_DISCOUNT_TYPE_VALUES = ["PERCENTAGE", "AMOUNT"] as const;

export function useBillingModal({
  appointmentId,
  patientId,
  onSaved,
  onOpenChange,
}: {
  appointmentId?: string;
  patientId?: string;
  onSaved?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const defaultConsultationFee = useDefaultValue("consultationFee");
  const [hasCustomizedDefaultFee, setHasCustomizedDefaultFee] = useState(false);
  const [items, setItems] = useState<LineItem[]>(() => [
    {
      description: "Consultation Fee",
      quantity: 1,
      price: defaultConsultationFee,
    },
  ]);
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

  useEffect(() => {
    if (hasCustomizedDefaultFee) {
      return;
    }

    setItems((prev) => {
      if (prev.length !== 1) return prev;
      const first = prev[0];
      if (!first || first.description !== "Consultation Fee") return prev;
      if (first.quantity !== 1) return prev;
      if (first.price === defaultConsultationFee) return prev;
      return [{ ...first, price: defaultConsultationFee }];
    });
  }, [defaultConsultationFee, hasCustomizedDefaultFee]);

  const calculations = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    const taxAmount = subtotal * (taxRate / 100);

    let discountAmount = 0;
    if (discountType === "PERCENTAGE") {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }

    const total = Math.max(0, subtotal + taxAmount - discountAmount);

    return { subtotal, taxAmount, discountAmount, total };
  }, [items, taxRate, discountValue, discountType]);

  const resetForm = () => {
    setItems([
      {
        description: "Consultation Fee",
        quantity: 1,
        price: defaultConsultationFee,
      },
    ]);
    setHasCustomizedDefaultFee(false);
    setTaxRate(0);
    setDiscountValue(0);
  };

  const handleSave = async () => {
    try {
      if (!appointmentId || !patientId) return;

      const validItems = items.filter((i) => i.description.trim() !== "");

      if (validItems.length === 0) {
        showUserFacingErrorToast(
          "Add at least one billing item before saving the invoice",
        );
        return;
      }

      if (calculations.discountAmount > calculations.subtotal) {
        showUserFacingErrorToast("Discount cannot exceed the subtotal");
        return;
      }

      const finalItems = [...validItems];

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
      resetForm();
    } catch {
      showUserFacingErrorToast(
        "We could not create the invoice. Please try again.",
      );
    }
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

  return {
    items,
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
    addItem,
    updateItem,
    removeItem,
    discountTypeValues: BILLING_DISCOUNT_TYPE_VALUES,
  };
}
