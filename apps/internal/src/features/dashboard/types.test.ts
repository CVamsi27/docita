import { describe, it, expect } from "vitest";
import { defaultDashboardStats, defaultDashboardTrends } from "./types";

describe("defaultDashboardStats", () => {
  it("has all fields initialized to zero", () => {
    expect(defaultDashboardStats).toEqual({
      clinics: 0,
      users: 0,
      doctors: 0,
      patients: 0,
      invoices: 0,
      prescriptions: 0,
    });
  });

  it("does not include a trends property", () => {
    expect(defaultDashboardStats.trends).toBeUndefined();
  });
});

describe("defaultDashboardTrends", () => {
  it("has all trend fields initialized to zero", () => {
    expect(defaultDashboardTrends).toEqual({
      clinicsThisMonth: 0,
      usersThisMonth: 0,
      doctorsThisMonth: 0,
      patientsThisMonth: 0,
      invoicesPercentChange: 0,
      prescriptionsPercentChange: 0,
    });
  });
});
