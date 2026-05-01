import { describe, expect, it } from "vitest";
import {
  getConsultationPersistKeysForClinic,
  getConsultationSectionsForClinic,
} from "./consultation-section-registry";

describe("consultation-section-registry", () => {
  it("returns SOAP-only sections for GENERAL clinics", () => {
    const sections = getConsultationSectionsForClinic("GENERAL");
    expect(sections.map((s) => s.id)).toEqual([
      "subjective",
      "objective",
      "assessment",
      "plan",
    ]);
  });

  it("inserts dental chart for DENTAL clinics", () => {
    const sections = getConsultationSectionsForClinic("DENTAL");
    expect(sections.map((s) => s.id)).toEqual([
      "subjective",
      "objective",
      "specialty-dental",
      "assessment",
      "plan",
    ]);
    expect(getConsultationPersistKeysForClinic("DENTAL")).toContain(
      "dentalChart",
    );
  });

  it("includes cardiology exam for CARDIOLOGY clinics", () => {
    const sections = getConsultationSectionsForClinic("CARDIOLOGY");
    expect(sections.some((s) => s.id === "specialty-cardiology")).toBe(true);
    expect(getConsultationPersistKeysForClinic("CARDIOLOGY")).toContain(
      "cardiologyExam",
    );
  });

  it("includes investigations for ORTHOPEDIC and ENT clinics", () => {
    expect(
      getConsultationSectionsForClinic("ORTHOPEDIC").some(
        (s) => s.id === "specialty-investigations",
      ),
    ).toBe(true);
    expect(
      getConsultationSectionsForClinic("ENT").some(
        (s) => s.id === "specialty-investigations",
      ),
    ).toBe(true);
  });
});
