"use client";

import { useMemo } from "react";
import type { InvoiceListRow } from "@workspace/data-access";
import { useDefaultValue } from "@/lib/contexts/app-config-context";
import { useBillingLineItems } from "./use-billing-line-items";
import { useBillingSubmission } from "./use-billing-submission";
import type { LineItem } from "./billing-modal-types";

function buildSeedLineItems(invoice: InvoiceListRow | null | undefined): LineItem[] {
  if (!invoice?.items?.length) return [];
  return invoice.items
    .filter((item) => !isSyntheticRow(item.description))
    .map((item) => ({
      description: item.description,
      quantity: item.quantity,
      price: item.price,
    }));
}

function isSyntheticRow(description: string | undefined): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  return lower.startsWith("tax") || lower.startsWith("discount");
}

/**
 * Composes the billing draft's two cohesive concerns — line-item management
 * (`useBillingLineItems`) and tax/discount/save submission
 * (`useBillingSubmission`) — into the single view-model `BillingModal` consumes.
 *
 * When `existingInvoice` is supplied the draft is seeded from the persisted
 * line items and the submission switches into update mode.
 */
export function useBillingModal({
  appointmentId,
  patientId,
  existingInvoice,
  onSaved,
  onOpenChange,
}: {
  appointmentId?: string;
  patientId?: string;
  existingInvoice?: InvoiceListRow | null;
  onSaved?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const defaultConsultationFee = useDefaultValue("consultationFee");
  const seedItems = useMemo(
    () => buildSeedLineItems(existingInvoice),
    [existingInvoice],
  );
  const lineItems = useBillingLineItems(
    defaultConsultationFee,
    seedItems.length > 0 ? seedItems : undefined,
  );
  const submission = useBillingSubmission({
    items: lineItems.items,
    resetItems: lineItems.resetItems,
    appointmentId,
    patientId,
    existingInvoice,
    onSaved,
    onOpenChange,
  });

  return {
    items: lineItems.items,
    addItem: lineItems.addItem,
    updateItem: lineItems.updateItem,
    removeItem: lineItems.removeItem,
    ...submission,
  };
}
