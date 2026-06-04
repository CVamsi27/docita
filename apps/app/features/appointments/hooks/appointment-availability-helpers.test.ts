import { describe, expect, it } from "vitest";
import {
  computeAvailabilitySlotsReady,
  computeBlockingSlotsFromAppointments,
  computeIsResolvingDefaultSlot,
  shouldUpdatePreselectedPatient,
} from "./appointment-availability-helpers";

describe("appointment availability helpers", () => {
  it("maps appointments into blocking slots", () => {
    expect(
      computeBlockingSlotsFromAppointments([
        {
          startTime: "2026-06-04T09:00:00.000Z",
          endTime: "2026-06-04T09:30:00.000Z",
          status: "scheduled",
          extra: "ignored",
        },
      ]),
    ).toEqual([
      {
        startTime: "2026-06-04T09:00:00.000Z",
        endTime: "2026-06-04T09:30:00.000Z",
        status: "scheduled",
      },
    ]);
  });

  it("reports availability readiness only after slots load successfully", () => {
    const selectedDate = new Date("2026-06-04T00:00:00.000Z");

    expect(
      computeAvailabilitySlotsReady(
        true,
        selectedDate,
        "doctor-1",
        true,
        false,
      ),
    ).toBe(true);
    expect(
      computeAvailabilitySlotsReady(true, selectedDate, "doctor-1", true, true),
    ).toBe(false);
  });

  it("reports default slot resolution while a doctor-date query is pending", () => {
    const selectedDate = new Date("2026-06-04T00:00:00.000Z");

    expect(
      computeIsResolvingDefaultSlot(
        true,
        selectedDate,
        "doctor-1",
        false,
        false,
      ),
    ).toBe(true);
    expect(
      computeIsResolvingDefaultSlot(
        true,
        selectedDate,
        "doctor-1",
        false,
        true,
      ),
    ).toBe(false);
  });

  it("keeps dirty patient choices when a preset changes", () => {
    expect(
      shouldUpdatePreselectedPatient(true, "patient-2", "patient-1", false),
    ).toBe(true);
    expect(
      shouldUpdatePreselectedPatient(true, "patient-2", "patient-1", true),
    ).toBe(false);
  });
});
