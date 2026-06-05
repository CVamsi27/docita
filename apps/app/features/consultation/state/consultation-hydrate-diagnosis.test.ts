import { describe, expect, it } from "vitest";
import { parseDiagnosis } from "./consultation-hydrate-diagnosis";

describe("parseDiagnosis", () => {
  it("keeps structured diagnosis rows from arrays and JSON strings", () => {
    const rows = [
      { id: "dx-1", condition: "Hypertension", type: "provisional" },
      { id: "dx-2", condition: "Diabetes", type: "final" },
      { note: "ignored" },
    ];

    expect(parseDiagnosis(rows)).toHaveLength(2);
    expect(parseDiagnosis(JSON.stringify(rows))).toEqual(rows.slice(0, 2));
  });

  it("wraps legacy string diagnoses and ignores invalid values", () => {
    expect(parseDiagnosis("Migraine")).toEqual([
      {
        id: "legacy-dx",
        condition: "Migraine",
        type: "provisional",
        status: "active",
      },
    ]);
    expect(parseDiagnosis("[]")).toEqual([]);
    expect(parseDiagnosis({ condition: "not accepted outside arrays" })).toEqual([]);
    expect(parseDiagnosis("")).toEqual([]);
  });
});
