import { describe, it, expect } from "vitest";
import {
  getInternalClinicTypeDisplay,
  CLINIC_TYPE_DESCRIPTIONS,
} from "./clinic-display";

describe("CLINIC_TYPE_DESCRIPTIONS", () => {
  it("contains GENERAL description", () => {
    expect(CLINIC_TYPE_DESCRIPTIONS.GENERAL).toBe("Multi-specialty facility");
  });

  it("contains DENTAL description", () => {
    expect(CLINIC_TYPE_DESCRIPTIONS.DENTAL).toBe("Dentistry & Orthodontics");
  });

  it("contains CARDIOLOGY description", () => {
    expect(CLINIC_TYPE_DESCRIPTIONS.CARDIOLOGY).toBe("Heart Specialist");
  });

  it("contains all expected specialty keys", () => {
    const keys = Object.keys(CLINIC_TYPE_DESCRIPTIONS);
    expect(keys).toContain("GENERAL");
    expect(keys).toContain("DENTAL");
    expect(keys).toContain("PEDIATRIC");
    expect(keys).toContain("ORTHOPEDIC");
    expect(keys).toContain("CARDIOLOGY");
    expect(keys).toContain("DERMATOLOGY");
    expect(keys).toContain("ENT");
    expect(keys).toContain("GYNECOLOGY");
    expect(keys).toContain("OPHTHALMOLOGY");
    expect(keys).toContain("PSYCHIATRY");
    expect(keys).toContain("SPECIALTY");
  });
});

describe("getInternalClinicTypeDisplay", () => {
  it("returns GENERAL display for undefined input", () => {
    const result = getInternalClinicTypeDisplay(undefined);
    expect(result.name).toBeDefined();
    expect(result.className).toBe("badge-muted");
  });

  it("returns GENERAL display for GENERAL type", () => {
    const result = getInternalClinicTypeDisplay("GENERAL");
    expect(result.className).toBe("badge-muted");
  });

  it("returns DENTAL display with badge-info class", () => {
    const result = getInternalClinicTypeDisplay("DENTAL");
    expect(result.className).toBe("badge-info");
  });

  it("returns CARDIOLOGY display with badge-danger class", () => {
    const result = getInternalClinicTypeDisplay("CARDIOLOGY");
    expect(result.className).toBe("badge-danger");
  });

  it("returns PEDIATRIC display with tier-intelligence class", () => {
    const result = getInternalClinicTypeDisplay("PEDIATRIC");
    expect(result.className).toBe("tier-intelligence");
  });

  it("returns ORTHOPEDIC display with tier-core class", () => {
    const result = getInternalClinicTypeDisplay("ORTHOPEDIC");
    expect(result.className).toBe("tier-core");
  });

  it("normalizes lowercase input to uppercase", () => {
    const result = getInternalClinicTypeDisplay("dental");
    expect(result.className).toBe("badge-info");
  });

  it("falls back to GENERAL for unknown type", () => {
    const result = getInternalClinicTypeDisplay("UNKNOWN_TYPE");
    expect(result.name).toContain("General");
    expect(result.className).toBe("badge-muted");
  });

  it("falls back to GENERAL for empty string", () => {
    const result = getInternalClinicTypeDisplay("");
    expect(result.className).toBe("badge-muted");
  });

  it("returns an object with name and className properties", () => {
    const result = getInternalClinicTypeDisplay("ENT");
    expect(typeof result.name).toBe("string");
    expect(typeof result.className).toBe("string");
  });
});
