import { describe, expect, it } from "vitest";
import type { AppointmentListItem } from "@workspace/data-access";
import { buildPatientPortalSnapshot } from "./patient-portal-snapshot";

const now = new Date("2026-06-04T09:00:00.000Z").getTime();

describe("patient portal snapshot", () => {
  it("returns an empty snapshot without a patient id", () => {
    expect(buildPatientPortalSnapshot([appointment()], false, now)).toEqual({
      upcomingAppointments: [],
      activePrescriptions: [],
      outstandingInvoices: [],
    });
  });

  it("maps upcoming appointments and skips inactive past visits", () => {
    const snapshot = buildPatientPortalSnapshot(
      [
        appointment({ id: "past", startTime: "2026-06-03T09:00:00.000Z" }),
        appointment({ id: "cancelled", status: "CANCELLED" }),
        appointment({ id: "future", startTime: "2026-06-05T10:00:00.000Z" }),
      ],
      true,
      now,
    );

    expect(snapshot.upcomingAppointments).toEqual([
      {
        id: "future",
        doctorName: "Dr Rao",
        clinicName: "Central Clinic",
        scheduledAt: "2026-06-05T10:00:00.000Z",
        status: "PENDING",
      },
    ]);
  });

  it("deduplicates unpaid invoices and maps prescription status", () => {
    const withInvoice = appointment({
      id: "appt-invoice",
      status: "COMPLETED",
      invoice: {
        id: "inv-1",
        patientId: "patient-1",
        currency: "INR",
        items: [],
        total: 500,
        status: "OVERDUE",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
      prescription: {
        id: "rx-1",
        patientId: "patient-1",
        medications: [],
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    });

    const snapshot = buildPatientPortalSnapshot(
      [
        withInvoice,
        appointment({
          id: "duplicate-invoice",
          invoice: withInvoice.invoice,
        }),
      ],
      true,
      now,
    );

    expect(snapshot.outstandingInvoices).toEqual([
      {
        id: "inv-1",
        amount: 500,
        currency: "INR",
        dueAt: "2026-06-01T00:00:00.000Z",
        status: "OVERDUE",
      },
    ]);
    expect(snapshot.activePrescriptions).toEqual([
      {
        id: "rx-1",
        title: "Prescription",
        prescribedBy: "Dr Rao",
        issuedAt: "2026-06-01T00:00:00.000Z",
        status: "COMPLETED",
      },
    ]);
  });
});

function appointment(
  overrides: Partial<AppointmentListItem> = {},
): AppointmentListItem {
  return {
    id: "appt-1",
    clinicId: "clinic-1",
    patientId: "patient-1",
    doctorId: "doctor-1",
    startTime: "2026-06-05T09:00:00.000Z",
    endTime: "2026-06-05T09:15:00.000Z",
    status: "SCHEDULED",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    version: 1,
    doctor: { id: "doctor-1", name: "Dr Rao" },
    clinicName: "Central Clinic",
    ...overrides,
  };
}
