import { describe, expect, it } from "vitest";
import {
  buildConsultationRoute,
  getConsultationTabIds,
  legacyTabToSectionId,
  normalizeConsultationTab,
  resolveConsultationSectionFromUrl,
} from "./consultationTabRouting";

describe("consultationTabRouting", () => {
  it("normalizes legacy query tab values", () => {
    expect(normalizeConsultationTab("observations")).toBe("chief-complaint");
    expect(normalizeConsultationTab("vitals")).toBe("examination");
    expect(normalizeConsultationTab("prescription")).toBe("treatment");
    expect(normalizeConsultationTab("invoice")).toBe("treatment");
  });

  it("falls back to chief complaint for unknown tabs", () => {
    expect(normalizeConsultationTab("unknown-tab")).toBe("chief-complaint");
    expect(normalizeConsultationTab(undefined)).toBe("chief-complaint");
  });

  it("supports specialty tabs only for matching clinic type", () => {
    expect(normalizeConsultationTab("dental-chart", "DENTAL")).toBe(
      "dental-chart",
    );
    expect(normalizeConsultationTab("dental-chart", "GENERAL")).toBe(
      "chief-complaint",
    );
    expect(getConsultationTabIds("PEDIATRIC")).toContain("growth-chart");
  });

  it("builds prescription edit route to plan section", () => {
    const route = buildConsultationRoute("apt-1", {
      tab: "treatment",
      from: "prescription",
    });

    expect(route).toBe("/consultation/apt-1?section=plan&from=prescription");
  });

  it("maps legacy tab to section id", () => {
    expect(legacyTabToSectionId("treatment")).toBe("plan");
    expect(legacyTabToSectionId("dental-chart", "DENTAL")).toBe(
      "specialty-dental",
    );
    expect(resolveConsultationSectionFromUrl(null, "prescription")).toBe(
      "plan",
    );
    expect(resolveConsultationSectionFromUrl("assessment", null)).toBe(
      "assessment",
    );
  });
});

