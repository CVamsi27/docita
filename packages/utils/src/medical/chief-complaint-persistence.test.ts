import { describe, expect, it } from "vitest";
import {
  formatChiefComplaintSummary,
  parseChiefComplaintsFromAppointmentData,
  serializeChiefComplaintsForPatch,
} from "./chief-complaint-persistence.js";

describe("chief-complaint-persistence", () => {
  it("serializes rows with clinical notes and round-trips through parse", () => {
    const json = serializeChiefComplaintsForPatch([
      {
        id: "a",
        complaint: "Headache",
        durationValue: "2",
        durationUnit: "days",
        severity: "moderate",
        notes: "Worse in morning",
      },
    ]);
    expect(json.startsWith("[")).toBe(true);
    const rows = parseChiefComplaintsFromAppointmentData({
      chiefComplaint: json,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.complaint).toBe("Headache");
    expect(rows[0]?.notes).toBe("Worse in morning");
  });

  it("formats JSON chief complaint for display", () => {
    const raw = serializeChiefComplaintsForPatch([
      { complaint: "Cough", notes: "Productive" },
      { complaint: "Fever", notes: "" },
    ]);
    expect(formatChiefComplaintSummary(raw)).toBe(
      "Cough (Productive); Fever",
    );
  });

  it("returns empty string from serialize when nothing to persist", () => {
    expect(serializeChiefComplaintsForPatch([])).toBe("");
    expect(
      serializeChiefComplaintsForPatch([
        { complaint: "", notes: "  " },
      ]),
    ).toBe("");
  });
});
