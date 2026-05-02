import { describe, expect, it } from "vitest";
import {
  getConsultationPersistKeysForClinic,
  getConsultationSectionsForClinic,
} from "./consultation-section-registry";

describe("consultation-section-registry", () => {
  it("includes investigations for GENERAL clinics when investigations feature is enabled", () => {
    const sections = getConsultationSectionsForClinic("GENERAL");
    expect(sections.map((s) => s.id)).toEqual([
      "subjective",
      "objective",
      "specialty-investigations",
      "assessment",
      "plan",
    ]);
    expect(getConsultationPersistKeysForClinic("GENERAL")).toContain(
      "investigations",
    );
  });

  it("omits objective for DENTAL when examination feature is disabled", () => {
    const sections = getConsultationSectionsForClinic("DENTAL");
    expect(sections.map((s) => s.id)).toEqual([
      "subjective",
      "specialty-dental",
      "specialty-investigations",
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
