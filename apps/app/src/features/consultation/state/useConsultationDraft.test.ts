import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consultationDraftNeedsLeaveGuard,
  hashDiagnosesForSync,
  useConsultationDraft,
} from "./useConsultationDraft";

beforeEach(() => {
  useConsultationDraft.getState().reset();
});

vi.useFakeTimers();

describe("useConsultationDraft", () => {
  it("hydrates with appointment id and seed without marking dirty", () => {
    useConsultationDraft.getState().hydrate("apt-1", {
      history: "Viral fever 3 days",
    });
    const state = useConsultationDraft.getState();
    expect(state.appointmentId).toBe("apt-1");
    expect(state.history).toBe("Viral fever 3 days");
    expect(state.dirty).toBe(false);
    expect(state.saveState).toBe("idle");
  });

  it("marks the store dirty when a field changes", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("Updated history");
    const state = useConsultationDraft.getState();
    expect(state.dirty).toBe(true);
    expect(state.saveState).toBe("dirty");
    expect(state.history).toBe("Updated history");
  });

  it("supports functional updaters for arrays", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setChiefComplaint([]);
    useConsultationDraft.getState().setChiefComplaint((prev) => [
      ...prev,
      {
        id: "c1",
        complaint: "Cough",
        durationValue: "2",
        durationUnit: "days",
        severity: "moderate",
      },
    ]);
    expect(useConsultationDraft.getState().chiefComplaint).toHaveLength(1);
  });

  it("markClean resets dirty and records savedAt", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("x");
    useConsultationDraft.getState().markClean(1_700_000_000_000);
    const state = useConsultationDraft.getState();
    expect(state.dirty).toBe(false);
    expect(state.saveState).toBe("saved");
    expect(state.lastSavedAt).toBe(1_700_000_000_000);
  });

  it("markError surfaces a message without clearing dirty", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("x");
    useConsultationDraft.getState().markError("offline");
    const state = useConsultationDraft.getState();
    expect(state.saveState).toBe("error");
    expect(state.lastError).toBe("offline");
    expect(state.dirty).toBe(true);
  });

  it("clearConsultationLeaveGuard clears guard fields without marking saved", () => {
    useConsultationDraft.getState().hydrate("apt-1", {});
    useConsultationDraft.getState().setHistory("draft text");
    useConsultationDraft.getState().clearConsultationLeaveGuard();
    const state = useConsultationDraft.getState();
    expect(state.history).toBe("draft text");
    expect(state.dirty).toBe(false);
    expect(state.saveState).toBe("idle");
    expect(state.lastError).toBe(null);
  });
});

describe("consultationDraftNeedsLeaveGuard", () => {
  it("is true when dirty, saving, or error", () => {
    expect(
      consultationDraftNeedsLeaveGuard({ dirty: true, saveState: "idle" }),
    ).toBe(true);
    expect(
      consultationDraftNeedsLeaveGuard({ dirty: false, saveState: "saving" }),
    ).toBe(true);
    expect(
      consultationDraftNeedsLeaveGuard({ dirty: false, saveState: "error" }),
    ).toBe(true);
  });

  it("is false when clean and not in-flight", () => {
    expect(
      consultationDraftNeedsLeaveGuard({ dirty: false, saveState: "idle" }),
    ).toBe(false);
    expect(
      consultationDraftNeedsLeaveGuard({ dirty: false, saveState: "saved" }),
    ).toBe(false);
    expect(
      consultationDraftNeedsLeaveGuard({ dirty: false, saveState: "dirty" }),
    ).toBe(false);
  });
});

describe("hashDiagnosesForSync", () => {
  it("is stable regardless of input order", async () => {
    const a = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "n1", isPrimary: true },
      { icdCodeId: "A02", notes: "n2", isPrimary: false },
    ]);
    const b = await hashDiagnosesForSync([
      { icdCodeId: "A02", notes: "n2", isPrimary: false },
      { icdCodeId: "A01", notes: "n1", isPrimary: true },
    ]);
    expect(a).toBe(b);
  });

  it("treats trimmed notes as equivalent", async () => {
    const a = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "hello", isPrimary: true },
    ]);
    const b = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "  hello  ", isPrimary: true },
    ]);
    expect(a).toBe(b);
  });

  it("changes when diagnoses change", async () => {
    const a = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "hello", isPrimary: true },
    ]);
    const b = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "different", isPrimary: true },
    ]);
    expect(a).not.toBe(b);
  });

  it("ignores entries without icdCodeId", async () => {
    const a = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "", isPrimary: true },
    ]);
    const b = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "", isPrimary: true },
      { notes: "no-icd", isPrimary: false },
    ]);
    expect(a).toBe(b);
  });

  it("matches backend AppointmentService SHA-256 truncation", async () => {
    const hash = await hashDiagnosesForSync([
      { icdCodeId: "A01", notes: "n1", isPrimary: true },
      { icdCodeId: "A02", notes: "n2", isPrimary: false },
    ]);
    expect(hash).toBe("38db951eea963c497338f50ed50a2e4d");
  });
});
