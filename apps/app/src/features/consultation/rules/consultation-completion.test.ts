import { describe, expect, it } from "vitest";
import type { Appointment } from "@workspace/types";
import { resolveConsultationCompletionSnapshot } from "./consultation-completion";

describe("resolveConsultationCompletionSnapshot", () => {
  const baseAppointment = {
    chiefComplaint: "Saved complaint",
    diagnoses: [{ code: "A00", description: "Saved diagnosis" }],
    vitalSign: { pulse: 72 },
  } as Appointment;

  it("prefers unsaved draft chief complaint and diagnosis", () => {
    const snapshot = resolveConsultationCompletionSnapshot(baseAppointment, {
      chiefComplaint: [
        { id: "1", complaint: "Draft complaint", duration: "2 days" },
      ],
      diagnosis: [
        {
          id: "dx-1",
          condition: "Draft diagnosis",
          type: "provisional",
          status: "active",
        },
      ],
    });

    expect(snapshot.chiefComplaint).toContain("Draft complaint");
    expect(snapshot.hasDiagnosis).toBe(true);
    expect(snapshot.hasVitals).toBe(true);
  });

  it("falls back to persisted appointment fields when draft is empty", () => {
    const snapshot = resolveConsultationCompletionSnapshot(baseAppointment, {
      chiefComplaint: [],
      diagnosis: [],
    });

    expect(snapshot.chiefComplaint).toBe("Saved complaint");
    expect(snapshot.hasDiagnosis).toBe(true);
    expect(snapshot.hasVitals).toBe(true);
  });
});
