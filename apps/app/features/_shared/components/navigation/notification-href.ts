import type { StaffNotification } from "@/hooks/api/use-notifications";

export type NotificationCategoryId =
  | "all"
  | "appointments"
  | "appointment-requests"
  | "prescriptions"
  | "invoices"
  | "payments"
  | "consultations"
  | "team"
  | "messages"
  | "system";

export type NotificationCategoryDef = {
  id: NotificationCategoryId;
  label: string;
  types?: readonly string[];
};

export const NOTIFICATION_CATEGORIES: readonly NotificationCategoryDef[] = [
  { id: "all", label: "All" },
  {
    id: "appointment-requests",
    label: "Appointment requests",
    types: [
      "APPOINTMENT_REQUEST_CREATED",
      "APPOINTMENT_REQUEST_APPROVED",
      "APPOINTMENT_REQUEST_REJECTED",
    ],
  },
  {
    id: "appointments",
    label: "Appointments",
    types: [
      "APPOINTMENT_CANCEL",
      "APPOINTMENT_DELAY",
      "APPOINTMENT_RESCHEDULED",
      "APPOINTMENT_NO_SHOW",
      "APPOINTMENT_CONFIRMED",
    ],
  },
  {
    id: "consultations",
    label: "Consultations",
    types: [
      "CONSULTATION_STARTED",
      "CONSULTATION_SIGNED",
      "CONSULTATION_PENDING_ACTION",
    ],
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    types: ["PRESCRIPTION_PENDING", "PRESCRIPTION_SENT", "PRESCRIPTION_FAILED"],
  },
  {
    id: "invoices",
    label: "Invoices",
    types: ["INVOICE_PENDING", "INVOICE_SENT", "INVOICE_FAILED"],
  },
  {
    id: "payments",
    label: "Payments & plan",
    types: [
      "SUBSCRIPTION_PAYMENT_DUE_SOON",
      "SUBSCRIPTION_PAYMENT_OVERDUE",
      "SUBSCRIPTION_PAYMENT_SUCCESS",
      "SUBSCRIPTION_PAYMENT_FAILED",
      "PAYMENT_PROVIDER_STATUS_UPDATE",
    ],
  },
  {
    id: "messages",
    label: "Messages",
    types: ["PATIENT_RESPONSE"],
  },
  {
    id: "team",
    label: "Team",
    types: ["MEMBER_JOIN_REQUEST", "MEMBER_JOIN_APPROVED", "MEMBER_JOIN_REJECTED"],
  },
  { id: "system", label: "System", types: ["SYSTEM_ALERT"] },
] as const;

export function categoryForType(type: string): NotificationCategoryId {
  for (const cat of NOTIFICATION_CATEGORIES) {
    if (cat.types?.includes(type)) return cat.id;
  }
  return "system";
}

function readString(data: unknown, key: string): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isSafeRelativeUrl(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return true;
}

/**
 * Resolve a notification to a target URL. Returns null when nothing actionable
 * is available (caller should render the row as non-clickable).
 */
export function notificationHref(n: StaffNotification): string | null {
  const type = String(n.type);
  const data = n.data ?? {};

  switch (type) {
    case "APPOINTMENT_REQUEST_CREATED":
    case "APPOINTMENT_REQUEST_APPROVED":
    case "APPOINTMENT_REQUEST_REJECTED": {
      const requestId =
        readString(data, "appointmentRequestId") ?? readString(data, "requestId");
      const params = new URLSearchParams({ requestsPanel: "1" });
      if (requestId) params.set("requestId", requestId);
      return `/appointments?${params.toString()}`;
    }

    case "APPOINTMENT_CANCEL":
    case "APPOINTMENT_DELAY":
    case "APPOINTMENT_RESCHEDULED":
    case "APPOINTMENT_NO_SHOW":
    case "APPOINTMENT_CONFIRMED": {
      const date = readString(data, "appointmentDate") ?? readString(data, "date");
      if (date) {
        return `/appointments?date=${encodeURIComponent(date.slice(0, 10))}`;
      }
      return "/appointments";
    }

    case "CONSULTATION_STARTED":
    case "CONSULTATION_SIGNED":
    case "CONSULTATION_PENDING_ACTION": {
      const visitId =
        readString(data, "visitId") ??
        readString(data, "consultationId") ??
        readString(data, "id");
      return visitId ? `/consultation/${visitId}` : "/consultation";
    }

    case "PRESCRIPTION_PENDING":
    case "PRESCRIPTION_SENT":
    case "PRESCRIPTION_FAILED": {
      const id = readString(data, "prescriptionId") ?? readString(data, "id");
      return id ? `/prescriptions/${id}` : "/prescriptions";
    }

    case "INVOICE_PENDING":
    case "INVOICE_SENT":
    case "INVOICE_FAILED": {
      const id = readString(data, "invoiceId") ?? readString(data, "id");
      return id ? `/invoices/${id}` : "/invoices";
    }

    case "SUBSCRIPTION_PAYMENT_DUE_SOON":
    case "SUBSCRIPTION_PAYMENT_OVERDUE":
    case "SUBSCRIPTION_PAYMENT_SUCCESS":
    case "SUBSCRIPTION_PAYMENT_FAILED":
    case "PAYMENT_PROVIDER_STATUS_UPDATE":
      return "/settings?tab=subscription";

    case "MEMBER_JOIN_REQUEST":
    case "MEMBER_JOIN_APPROVED":
    case "MEMBER_JOIN_REJECTED":
      return "/settings/team/join-requests";

    case "PATIENT_RESPONSE": {
      const date = readString(data, "appointmentDate") ?? readString(data, "date");
      if (date) {
        return `/appointments?date=${encodeURIComponent(date.slice(0, 10))}`;
      }
      return "/appointments";
    }

    case "SYSTEM_ALERT": {
      const url = readString(data, "url");
      return url && isSafeRelativeUrl(url) ? url : null;
    }

    default:
      return null;
  }
}
