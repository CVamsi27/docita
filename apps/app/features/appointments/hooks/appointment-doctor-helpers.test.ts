import { describe, expect, it } from "vitest";
import {
  buildCurrentUserForAppointment,
  computeFilteredDoctors,
  findNextAvailableDoctor,
  resolveDefaultDoctorId,
  toUnavailableIdSet,
} from "./appointment-doctor-helpers";

describe("appointment doctor helpers", () => {
  it("keeps unavailable doctors out of selectable results", () => {
    const unavailableIds = toUnavailableIdSet(["doctor-2"]);
    const doctors = [{ id: "doctor-1" }, { id: "doctor-2" }];

    expect(computeFilteredDoctors(doctors, unavailableIds)).toEqual([
      { id: "doctor-1" },
    ]);
  });

  it("resolves the preferred doctor when available", () => {
    const unavailableIds = toUnavailableIdSet(["doctor-2"]);

    expect(
      resolveDefaultDoctorId({
        defaultDoctorId: "doctor-1",
        unavailableIds,
        user: { id: "doctor-3", role: "DOCTOR" },
        filteredDoctors: [{ id: "doctor-4" }],
      }),
    ).toBe("doctor-1");
  });

  it("falls back from unavailable selections to the next doctor", () => {
    const unavailableIds = toUnavailableIdSet(["doctor-1"]);

    expect(
      findNextAvailableDoctor("doctor-1", unavailableIds, [{ id: "doctor-2" }]),
    ).toBe("doctor-2");
  });

  it("normalizes auth users for appointment defaults", () => {
    expect(
      buildCurrentUserForAppointment({
        id: "doctor-1",
        clinicId: null,
        role: "DOCTOR",
      }),
    ).toEqual({ id: "doctor-1", clinicId: "", role: "DOCTOR" });
  });
});
