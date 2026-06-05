import type { AppointmentListItem } from "@workspace/data-access";
import type { PatientPortalSnapshot } from "@/features/patient-portal/types/patient-portal-types";
import { toPortalIsoString } from "./patient-portal-date";

type PortalInvoiceStatus = "PENDING" | "PAID" | "OVERDUE";
type AppointmentWithInvoice = AppointmentListItem & {
  invoice: NonNullable<AppointmentListItem["invoice"]> & { id: string };
};

const invoiceStatusByInput: Record<string, PortalInvoiceStatus> = {
  PAID: "PAID",
  OVERDUE: "OVERDUE",
};

export function buildOutstandingPortalInvoices(
  items: AppointmentListItem[],
): PatientPortalSnapshot["outstandingInvoices"] {
  const invoiceMap = new Map(
    items
      .filter(hasOutstandingInvoice)
      .map((item) => [item.invoice.id, toOutstandingInvoice(item)]),
  );
  return Array.from(invoiceMap.values());
}

function hasOutstandingInvoice(
  item: AppointmentListItem,
): item is AppointmentWithInvoice {
  return (
    Boolean(item.invoice?.id) &&
    mapInvoiceStatus(item.invoice?.status) !== "PAID"
  );
}

function toOutstandingInvoice(
  item: AppointmentWithInvoice,
): PatientPortalSnapshot["outstandingInvoices"][number] {
  return {
    id: item.invoice.id,
    amount: item.invoice.total || 0,
    currency: item.invoice.currency,
    dueAt: toPortalIsoString(item.invoice.createdAt ?? item.startTime),
    status: mapInvoiceStatus(item.invoice.status),
  };
}

function mapInvoiceStatus(status: string | undefined): PortalInvoiceStatus {
  return invoiceStatusByInput[(status || "").toUpperCase()] ?? "PENDING";
}
