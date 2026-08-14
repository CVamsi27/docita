import { describe, expect, it } from "vitest";
import { isNewClinicDashboard } from "./is-new-clinic-dashboard";

describe("isNewClinicDashboard", () => {
  it("returns true when all stats are zero", () => {
    expect(
      isNewClinicDashboard({
        totalPatients: 0,
        todayAppointments: 0,
        activePrescriptions: 0,
      }),
    ).toBe(true);
  });

  it("returns false when there are patients", () => {
    expect(
      isNewClinicDashboard({
        totalPatients: 1,
        todayAppointments: 0,
        activePrescriptions: 0,
      }),
    ).toBe(false);
  });

  it("returns false when there are appointments", () => {
    expect(
      isNewClinicDashboard({
        totalPatients: 0,
        todayAppointments: 5,
        activePrescriptions: 0,
      }),
    ).toBe(false);
  });

  it("returns false when there are prescriptions", () => {
    expect(
      isNewClinicDashboard({
        totalPatients: 0,
        todayAppointments: 0,
        activePrescriptions: 2,
      }),
    ).toBe(false);
  });
});
