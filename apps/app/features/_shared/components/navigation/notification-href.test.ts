import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_CATEGORIES,
  categoryForType,
  notificationHref,
} from "./notification-href";
import type { StaffNotification } from "@/hooks/api/use-notifications";

function notif(
  type: string,
  data: Record<string, unknown> = {},
): StaffNotification {
  return {
    id: "n",
    type,
    title: "t",
    message: "m",
    priority: "NORMAL",
    isRead: false,
    readAt: null,
    deletedAt: null,
    createdAt: new Date(),
    data,
  } as unknown as StaffNotification;
}

describe("notificationHref", () => {
  it("routes appointment requests with the optional requestId", () => {
    expect(notificationHref(notif("APPOINTMENT_REQUEST_CREATED"))).toBe(
      "/appointments?requestsPanel=1",
    );
    expect(
      notificationHref(
        notif("APPOINTMENT_REQUEST_APPROVED", {
          appointmentRequestId: "req-42",
        }),
      ),
    ).toBe("/appointments?requestsPanel=1&requestId=req-42");
  });

  it("routes appointments by date when present, falls back to listing", () => {
    expect(
      notificationHref(
        notif("APPOINTMENT_CANCEL", {
          appointmentDate: "2026-05-08T10:00:00.000Z",
        }),
      ),
    ).toBe("/appointments?date=2026-05-08");
    expect(notificationHref(notif("APPOINTMENT_NO_SHOW"))).toBe(
      "/appointments",
    );
  });

  it("routes consultations to the visit detail page when an id is available", () => {
    expect(
      notificationHref(notif("CONSULTATION_SIGNED", { visitId: "v1" })),
    ).toBe("/consultation/v1");
    expect(notificationHref(notif("CONSULTATION_STARTED"))).toBe("/consultation");
  });

  it("routes prescriptions to the detail page when prescriptionId present", () => {
    expect(
      notificationHref(notif("PRESCRIPTION_SENT", { prescriptionId: "p1" })),
    ).toBe("/prescriptions/p1");
    expect(notificationHref(notif("PRESCRIPTION_FAILED"))).toBe(
      "/prescriptions",
    );
  });

  it("routes invoices to detail when invoiceId present", () => {
    expect(notificationHref(notif("INVOICE_PENDING", { invoiceId: "i1" }))).toBe(
      "/invoices/i1",
    );
    expect(notificationHref(notif("INVOICE_SENT"))).toBe("/invoices");
  });

  it("routes subscription / payment notifications to the billing settings tab", () => {
    expect(notificationHref(notif("SUBSCRIPTION_PAYMENT_DUE_SOON"))).toBe(
      "/settings?tab=subscription",
    );
    expect(notificationHref(notif("SUBSCRIPTION_PAYMENT_OVERDUE"))).toBe(
      "/settings?tab=subscription",
    );
    expect(notificationHref(notif("PAYMENT_PROVIDER_STATUS_UPDATE"))).toBe(
      "/settings?tab=subscription",
    );
  });

  it("routes member join requests to the join requests page", () => {
    expect(notificationHref(notif("MEMBER_JOIN_REQUEST"))).toBe(
      "/settings/team/join-requests",
    );
  });

  it("routes patient responses to the WhatsApp page", () => {
    expect(notificationHref(notif("PATIENT_RESPONSE"))).toBe("/whatsapp");
  });

  it("treats SYSTEM_ALERT.url as opt-in but rejects unsafe values", () => {
    expect(notificationHref(notif("SYSTEM_ALERT"))).toBeNull();
    expect(notificationHref(notif("SYSTEM_ALERT", { url: "/somewhere" }))).toBe(
      "/somewhere",
    );
    // Block protocol-relative and absolute URLs.
    expect(
      notificationHref(notif("SYSTEM_ALERT", { url: "//evil.com" })),
    ).toBeNull();
    expect(
      notificationHref(notif("SYSTEM_ALERT", { url: "https://evil.com" })),
    ).toBeNull();
  });

  it("returns null for unknown types", () => {
    expect(notificationHref(notif("UNKNOWN_TYPE_XYZ"))).toBeNull();
  });
});

describe("categoryForType", () => {
  it("maps known types into their category", () => {
    expect(categoryForType("APPOINTMENT_REQUEST_CREATED")).toBe(
      "appointment-requests",
    );
    expect(categoryForType("APPOINTMENT_NO_SHOW")).toBe("appointments");
    expect(categoryForType("CONSULTATION_SIGNED")).toBe("consultations");
    expect(categoryForType("PRESCRIPTION_SENT")).toBe("prescriptions");
    expect(categoryForType("INVOICE_PENDING")).toBe("invoices");
    expect(categoryForType("SUBSCRIPTION_PAYMENT_OVERDUE")).toBe("payments");
    expect(categoryForType("PAYMENT_PROVIDER_STATUS_UPDATE")).toBe("payments");
    expect(categoryForType("PATIENT_RESPONSE")).toBe("messages");
    expect(categoryForType("MEMBER_JOIN_REQUEST")).toBe("team");
    expect(categoryForType("SYSTEM_ALERT")).toBe("system");
  });

  it("falls back to 'system' for unknown types", () => {
    expect(categoryForType("MADE_UP_TYPE")).toBe("system");
  });
});

describe("NOTIFICATION_CATEGORIES", () => {
  it("includes the 'all' meta category and all known buckets", () => {
    const ids = NOTIFICATION_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("all");
    expect(ids).toContain("appointment-requests");
    expect(ids).toContain("appointments");
    expect(ids).toContain("consultations");
    expect(ids).toContain("prescriptions");
    expect(ids).toContain("invoices");
    expect(ids).toContain("payments");
    expect(ids).toContain("messages");
    expect(ids).toContain("team");
    expect(ids).toContain("system");
  });
});
