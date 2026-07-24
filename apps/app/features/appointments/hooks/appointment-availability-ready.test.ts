import { computeAvailabilitySlotsReady } from "./appointment-availability-ready";

describe("computeAvailabilitySlotsReady", () => {
  const date = new Date();

  it("returns true when all conditions are met", () => {
    expect(
      computeAvailabilitySlotsReady(true, date, "doc-1", true, false),
    ).toBe(true);
  });

  it("returns false when open is false", () => {
    expect(
      computeAvailabilitySlotsReady(false, date, "doc-1", true, false),
    ).toBe(false);
  });

  it("returns false when open is undefined", () => {
    expect(
      computeAvailabilitySlotsReady(undefined, date, "doc-1", true, false),
    ).toBe(false);
  });

  it("returns false when selectedDate is undefined", () => {
    expect(
      computeAvailabilitySlotsReady(true, undefined, "doc-1", true, false),
    ).toBe(false);
  });

  it("returns false when watchedDoctorId is undefined", () => {
    expect(
      computeAvailabilitySlotsReady(true, date, undefined, true, false),
    ).toBe(false);
  });

  it("returns false when slotsQuerySuccess is false", () => {
    expect(
      computeAvailabilitySlotsReady(true, date, "doc-1", false, false),
    ).toBe(false);
  });

  it("returns false when slotsQueryError is true", () => {
    expect(
      computeAvailabilitySlotsReady(true, date, "doc-1", true, true),
    ).toBe(false);
  });

  it("returns false when all optional params are missing", () => {
    expect(
      computeAvailabilitySlotsReady(undefined, undefined, undefined, false, false),
    ).toBe(false);
  });
});
