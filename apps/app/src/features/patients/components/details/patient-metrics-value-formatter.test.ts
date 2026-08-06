import { describe, expect, it } from "vitest";
import type { MetricRecordValueResponse } from "@workspace/types";
import { extractValue } from "./patient-metrics-value-formatter";

function value(partial: Partial<MetricRecordValueResponse>): MetricRecordValueResponse {
  return partial as MetricRecordValueResponse;
}

describe("extractValue", () => {
  it("returns an em dash for an empty list", () => {
    expect(extractValue([])).toBe("—");
  });

  it("prefers valueString", () => {
    expect(extractValue([value({ valueString: "190/90" })])).toBe("190/90");
  });

  it("renders numeric values", () => {
    expect(extractValue([value({ valueNumber: 98.6 })])).toBe("98.6");
  });

  it("renders booleans as Yes/No", () => {
    expect(extractValue([value({ valueBoolean: true })])).toBe("Yes");
    expect(extractValue([value({ valueBoolean: false })])).toBe("No");
  });

  it("renders option labels", () => {
    expect(
      extractValue([value({ option: { label: "Mild", value: "mild" } })]),
    ).toBe("Mild");
  });

  it("joins multiple values with a comma", () => {
    expect(
      extractValue([
        value({ valueString: "A+" }),
        value({ valueString: "Rhesus positive" }),
      ]),
    ).toBe("A+, Rhesus positive");
  });
});
