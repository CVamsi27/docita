import { describe, expect, it } from "vitest";

import {
  getAppointmentStatusLabel,
  getInvoiceStatusLabel,
  getPrescriptionStatusLabel,
  summarizePortalSnapshot,
} from "./patient-portal-rules";

describe("patient portal rules", () => {
  it("maps statuses to user-friendly labels", () => {
    expect(getAppointmentStatusLabel("CONFIRMED")).toBe("Confirmed");
    expect(getPrescriptionStatusLabel("ACTIVE")).toBe("Active");
    expect(getInvoiceStatusLabel("OVERDUE")).toBe("Overdue");
  });

  it("summarizes counts from portal snapshot", () => {
    const summary = summarizePortalSnapshot({
      upcomingAppointments: [
        {
          id: "apt_1",
          clinicName: "Sunrise Clinic",
          doctorName: "Dr. Rao",
          scheduledAt: "2026-02-22T10:30:00.000Z",
          status: "CONFIRMED",
        },
      ],
      activePrescriptions: [],
      outstandingInvoices: [
        {
          id: "inv_1",
          amount: 1500,
          dueAt: "2026-02-20T00:00:00.000Z",
          status: "PENDING",
        },
      ],
    });

    expect(summary).toEqual({
      appointmentCount: 1,
      prescriptionCount: 0,
      outstandingInvoiceCount: 1,
    });
  });
});
