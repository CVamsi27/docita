import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import { useAppointmentOpenInvoice } from "./use-appointment-open-invoice";

interface UseConsultationBillingFlowInput {
  appointmentId: string;
  canCreateInvoice: boolean;
  patientId?: string;
}

/**
 * Owns the consultation header's billing-dialog flow — open state, the
 * permission-gated auto-close effect, the post-save query invalidation, and
 * the lookup for an existing open invoice so the modal can default into
 * edit-mode instead of always creating a new invoice.
 *
 * Extracted from `ConsultationPageHeaderUI` so the dialog lifecycle lives
 * independent of the header's render wiring.
 */
export function useConsultationBillingFlow({
  appointmentId,
  canCreateInvoice,
  patientId,
}: UseConsultationBillingFlowInput) {
  const queryClient = useQueryClient();
  const [billingOpen, setBillingOpen] = useState(false);
  const { invoice: existingInvoice, isLoading: existingLoading } =
    useAppointmentOpenInvoice(
      canCreateInvoice ? appointmentId : undefined,
      patientId,
    );

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
    queryClient.invalidateQueries({
      queryKey: queryKeys.invoices.all(),
    });
  };

  return {
    billingOpen,
    setBillingOpen,
    handleBillingSaved,
    existingInvoice,
    existingInvoiceLoading: existingLoading,
  };
}
