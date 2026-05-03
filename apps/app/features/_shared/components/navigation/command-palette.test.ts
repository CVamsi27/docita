import { describe, expect, it } from "vitest";

import { QUICK_ACTIONS } from "./command-palette";

describe("command-palette QUICK_ACTIONS", () => {
  it("uses /patients?action=new for the new-patient quick action", () => {
    const newPatient = QUICK_ACTIONS.find((action) => action.id === "new-patient");

    expect(newPatient).toBeDefined();
    expect(newPatient?.href).toBe("/patients?action=new");
    expect(newPatient?.kind).toBe("navigate");
  });

  it("uses /appointments?action=new for the new-appointment quick action", () => {
    const newAppt = QUICK_ACTIONS.find(
      (action) => action.id === "new-appointment",
    );

    expect(newAppt).toBeDefined();
    expect(newAppt?.href).toBe("/appointments?action=new");
  });

  it("includes clinic-day jump actions with read access where appropriate", () => {
    const today = QUICK_ACTIONS.find((a) => a.id === "today-schedule");
    expect(today?.href).toBe("/today");
    expect(today?.accessMode).toBe("read");

    const coding = QUICK_ACTIONS.find((a) => a.id === "coding-queue");
    expect(coding?.href).toBe("/coding-queue");
    expect(coding?.accessMode).toBe("read");

    const followUps = QUICK_ACTIONS.find((a) => a.id === "follow-ups-board");
    expect(followUps?.href).toBe("/follow-ups");
    expect(followUps?.accessMode).toBe("read");
  });

  it("declares a start-consultation action without a static href", () => {
    const startConsultation = QUICK_ACTIONS.find(
      (action) => action.id === "start-consultation",
    );

    expect(startConsultation).toBeDefined();
    expect(startConsultation?.kind).toBe("start-consultation");
    expect(startConsultation?.href).toBeUndefined();
  });

  it("exposes a stable id and shortcut surface for each navigable quick action", () => {
    const navigable = QUICK_ACTIONS.filter((action) => action.kind === "navigate");
    expect(navigable.length).toBeGreaterThan(0);
    for (const action of navigable) {
      expect(typeof action.id).toBe("string");
      expect(action.id.length).toBeGreaterThan(0);
      expect(typeof action.href).toBe("string");
      expect(action.href!.startsWith("/")).toBe(true);
    }
  });
});
