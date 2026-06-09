"use client";

import { useMemo } from "react";
import { useInvoices, type InvoiceListRow } from "@workspace/data-access";

/**
 * Returns the most recent open invoice for an appointment, if one exists.
 * Used by the consultation billing modal to default into edit-mode when a
 * doctor opens billing for a visit that already has a pending invoice.
 *
 * "Open" means the invoice is in `PENDING` or `PARTIALLY_PAID` status — we
 * surface those because the doctor may want to add a missing line item, fix
 * a price, or apply an additional discount. `PAID`/`CANCELLED`/`OVERDUE`
 * invoices are not editable from this entry point.
 */
export function useAppointmentOpenInvoice(
  appointmentId: string | undefined,
  patientId: string | undefined,
): {
  invoice: InvoiceListRow | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useInvoices({
    patientId: patientId || undefined,
    status: "PENDING",
    limit: 20,
  });

  const invoice = useMemo(() => {
    if (!appointmentId || !data?.length) return null;
    const match = data.find(
      (row) => row.appointmentId === appointmentId && isEditableStatus(row.status),
    );
    return match ?? null;
  }, [appointmentId, data]);

  return { invoice, isLoading };
}

function isEditableStatus(status: string | undefined): boolean {
  return status === "PENDING" || status === "PARTIALLY_PAID";
}
