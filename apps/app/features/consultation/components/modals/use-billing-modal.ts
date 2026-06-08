"use client";

import { useDefaultValue } from "@/lib/contexts/app-config-context";
import { useBillingLineItems } from "./use-billing-line-items";
import { useBillingSubmission } from "./use-billing-submission";

/**
 * Composes the billing draft's two cohesive concerns — line-item management
 * (`useBillingLineItems`) and tax/discount/save submission
 * (`useBillingSubmission`) — into the single view-model `BillingModal` consumes.
 */
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
  const lineItems = useBillingLineItems(defaultConsultationFee);
  const submission = useBillingSubmission({
    items: lineItems.items,
    resetItems: lineItems.resetItems,
    appointmentId,
    patientId,
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
