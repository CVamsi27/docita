import { describe, expect, it } from "vitest";
import { resolveAskAiScopeFromPathname } from "./resolve-ask-ai-scope-from-pathname";

describe("resolveAskAiScopeFromPathname", () => {
  it("maps today routes", () => {
    expect(resolveAskAiScopeFromPathname("/today")).toEqual({
      id: "today",
      label: "on today's workspace",
    });
  });

  it("maps appointments routes", () => {
    expect(resolveAskAiScopeFromPathname("/appointments")).toMatchObject({
      id: "appointments",
      label: "on appointments",
    });
  });

  it("maps patient detail routes", () => {
    expect(resolveAskAiScopeFromPathname("/patients/pat-123")).toEqual({
      id: "patient:pat-123",
      label: "on this patient",
      payload: { kind: "patient", patientId: "pat-123" },
    });
  });

  it("maps consultation workspace routes", () => {
    const scope = resolveAskAiScopeFromPathname("/consultation/appt-abc12345");
    expect(scope?.id).toBe("consultation:appt-abc12345");
    expect(scope?.label).toBe("on Consultation #appt-abc");
  });

  it("returns undefined for unscoped routes", () => {
    expect(resolveAskAiScopeFromPathname("/settings")).toBeUndefined();
  });
});
