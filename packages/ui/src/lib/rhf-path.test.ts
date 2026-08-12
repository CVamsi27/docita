import { describe, expect, it } from "vitest";
import { rhfPath } from "./rhf-path";

describe("rhfPath", () => {
  it("returns the path string unchanged at runtime", () => {
    expect(rhfPath("items.0.name")).toBe("items.0.name");
    expect(rhfPath("gender")).toBe("gender");
  });

  it("accepts dynamic segment strings (config-driven field names)", () => {
    const field = "dateOfBirth";
    expect(rhfPath<Record<string, unknown>>(`patient.${field}`)).toBe(
      "patient.dateOfBirth",
    );
  });
});
