import { describe, expect, it } from "vitest";
import { serializeDraftForSession } from "./consultation-autosave-helpers";
import {
  applyConsultationSessionDraft,
  consultationDraftSessionSchema,
} from "./consultation-hydrate-helpers";
import { DEFAULT_CONSULTATION_DRAFT_STATE } from "./consultation-draft-helpers";

const medication = {
  name: "Amoxicillin",
  dosage: "500mg",
  frequency: "TID",
  duration: "5 days",
  route: "PO",
  instructions: "After food",
};

describe("consultation session draft prescription round-trip", () => {
  it("persists prescriptions and restores them on hydrate", () => {
    // Serialize a draft that contains unsaved prescriptions.
    const payload = serializeDraftForSession({
      ...DEFAULT_CONSULTATION_DRAFT_STATE,
      appointmentId: "appt_1",
      prescriptions: [medication],
    });
    expect(payload).not.toBeNull();

    // The persisted payload must round-trip through the restore schema
    // (previously prescriptions were written but dropped here).
    const parsed = consultationDraftSessionSchema.safeParse(
      JSON.parse(payload as string),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.prescriptions).toEqual([medication]);

    // And applying the session draft carries them onto the store state.
    const restored = applyConsultationSessionDraft(
      { ...DEFAULT_CONSULTATION_DRAFT_STATE },
      parsed.data,
    );
    expect(restored.prescriptions).toEqual([medication]);
  });

  it("keeps existing prescriptions when the session omits them", () => {
    const restored = applyConsultationSessionDraft(
      { ...DEFAULT_CONSULTATION_DRAFT_STATE, prescriptions: [medication] },
      { savedAt: Date.now() },
    );
    expect(restored.prescriptions).toEqual([medication]);
  });
});
