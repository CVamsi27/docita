"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";

interface UseConsultationBillingFlowInput {
  appointmentId: string;
  canCreateInvoice: boolean;
}

/**
 * Owns the consultation header's billing-dialog flow — open state, the
 * permission-gated auto-close effect, and the post-save query invalidation.
 * Extracted from `ConsultationPageHeaderUI` so the dialog lifecycle lives
 * independent of the header's render wiring.
 */
export function useConsultationBillingFlow({
  appointmentId,
  canCreateInvoice,
}: UseConsultationBillingFlowInput) {
  const queryClient = useQueryClient();
  const [billingOpen, setBillingOpen] = useState(false);

  useEffect(() => {
    if (!canCreateInvoice) {
      setBillingOpen(false);
    }
  }, [canCreateInvoice]);

  const handleBillingSaved = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.appointments.detail(appointmentId),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all() });
  };

  return { billingOpen, setBillingOpen, handleBillingSaved };
}
