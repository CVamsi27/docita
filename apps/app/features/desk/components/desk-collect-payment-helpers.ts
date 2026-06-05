import type {
  DeskCollectibleInvoiceStatus,
  DeskRecordInvoiceSettlementBody,
  UserRole,
} from "@workspace/types";
import { DESK_COLLECTIBLE_INVOICE_STATUSES } from "@workspace/types";

const deskCollectibleInvoiceStatuses: ReadonlySet<string> = new Set(
  DESK_COLLECTIBLE_INVOICE_STATUSES,
);

export function isOpenDeskInvoice<T extends { status: string }>(
  inv: T,
): inv is T & {
  status: DeskCollectibleInvoiceStatus;
} {
  return deskCollectibleInvoiceStatuses.has(inv.status);
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
