import { describe, expect, it } from "vitest";
import { hasRequiredMappings } from "./excel-import-helpers";

describe("hasRequiredMappings", () => {
  it("is true only when both firstName and phoneNumber are mapped", () => {
    expect(
      hasRequiredMappings({ A: "firstName", B: "phoneNumber" }),
    ).toBe(true);
  });

  it("is false when phoneNumber is missing", () => {
    expect(hasRequiredMappings({ A: "firstName", B: "email" })).toBe(false);
  });

  it("is false when firstName is missing", () => {
    expect(hasRequiredMappings({ A: "phoneNumber", B: "lastName" })).toBe(
      false,
    );
  });

  it("is false for an empty mapping", () => {
    expect(hasRequiredMappings({})).toBe(false);
  });

  it("ignores which excel column supplies each required field", () => {
    expect(
      hasRequiredMappings({ ColX: "phoneNumber", ColY: "firstName" }),
    ).toBe(true);
  });
});
