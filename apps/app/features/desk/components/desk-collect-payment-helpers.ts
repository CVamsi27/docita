import type {
  DeskRecordInvoiceSettlementBody,
  Invoice,
  UserRole,
} from "@workspace/types";

export function isOpenDeskInvoice(
  inv: Invoice,
): inv is Invoice & {
  status: "PENDING" | "PARTIALLY_PAID" | "OVERDUE";
} {
  const s = inv.status;
  return s === "PENDING" || s === "PARTIALLY_PAID" || s === "OVERDUE";
}

export type DeskPaymentMethod = DeskRecordInvoiceSettlementBody["paymentMethod"];

export const PAYMENT_CHANNEL_OPTIONS: {
  value: DeskPaymentMethod;
  label: string;
}[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD_POS", label: "Card (POS / swipe machine)" },
  { value: "UPI_QR", label: "UPI / QR (e.g. PhonePe)" },
  { value: "PINELABS", label: "Pine Labs terminal" },
  { value: "OTHER_TERMINAL", label: "Other card terminal" },
  { value: "OTHER_ONLINE", label: "Other online payment" },
];

export const ROLES_CAN_RECORD_PAYMENT: ReadonlySet<UserRole> = new Set([
  "ADMIN",
  "RECEPTIONIST",
  "ADMIN_DOCTOR",
]);
