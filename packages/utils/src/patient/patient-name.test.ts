import { describe, expect, it } from "vitest";
import { getPatientFullName } from "./patient-name.js";

describe("getPatientFullName", () => {
  it("joins trimmed patient name parts", () => {
    expect(
      getPatientFullName({
        firstName: "  Ada ",
        middleName: " M. ",
        lastName: " Lovelace  ",
      }),
    ).toBe("Ada M. Lovelace");
  });

  it("uses the fallback when no name part is available", () => {
    expect(getPatientFullName({ firstName: " " }, "Patient")).toBe("Patient");
    expect(getPatientFullName(undefined, "Patient")).toBe("Patient");
  });
});
