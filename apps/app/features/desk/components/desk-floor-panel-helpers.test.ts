import { patientNameOf, tokenSort, recentSort } from "./desk-floor-panel-helpers";

describe("patientNameOf", () => {
  it("returns first and last name combined", () => {
    const item = {
      patient: { firstName: "John", lastName: "Doe" },
    } as any;
    expect(patientNameOf(item)).toBe("John Doe");
  });

  it("returns only first name when last name is empty", () => {
    const item = {
      patient: { firstName: "John", lastName: "" },
    } as any;
    expect(patientNameOf(item)).toBe("John");
  });

  it("returns only last name when first name is empty", () => {
    const item = {
      patient: { firstName: "", lastName: "Doe" },
    } as any;
    expect(patientNameOf(item)).toBe("Doe");
  });

  it("returns Unknown patient when both names are missing", () => {
    const item = {
      patient: { firstName: "", lastName: "" },
    } as any;
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("returns Unknown patient when patient is undefined", () => {
    const item = { patient: undefined } as any;
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("returns Unknown patient when patient is null", () => {
    const item = { patient: null } as any;
    expect(patientNameOf(item)).toBe("Unknown patient");
  });

  it("trims whitespace from names", () => {
    const item = {
      patient: { firstName: "  John  ", lastName: "  Doe  " },
    } as any;
    expect(patientNameOf(item)).toBe("John Doe");
  });
});

describe("tokenSort", () => {
  it("sorts by token number ascending", () => {
    const a = { tokenNumber: 1 } as any;
    const b = { tokenNumber: 2 } as any;
    expect(tokenSort(a, b)).toBe(-1);
    expect(tokenSort(b, a)).toBe(1);
  });

  it("returns 0 for equal token numbers", () => {
    const a = { tokenNumber: 5 } as any;
    const b = { tokenNumber: 5 } as any;
    expect(tokenSort(a, b)).toBe(0);
  });
});

describe("recentSort", () => {
  it("sorts by completedAt descending (most recent first)", () => {
    const a = { completedAt: "2026-07-25T10:00:00Z" } as any;
    const b = { completedAt: "2026-07-25T11:00:00Z" } as any;
    expect(recentSort(a, b)).toBeGreaterThan(0);
    expect(recentSort(b, a)).toBeLessThan(0);
  });

  it("treats missing completedAt as 0", () => {
    const a = { completedAt: null } as any;
    const b = { completedAt: "2026-07-25T10:00:00Z" } as any;
    expect(recentSort(a, b)).toBeGreaterThan(0);
  });

  it("returns 0 for equal completedAt", () => {
    const ts = "2026-07-25T10:00:00Z";
    const a = { completedAt: ts } as any;
    const b = { completedAt: ts } as any;
    expect(recentSort(a, b)).toBe(0);
  });
});
