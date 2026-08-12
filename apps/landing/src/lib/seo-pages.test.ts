import { describe, expect, it } from "vitest";
import { getSeoLandingPage, seoLandingPages } from "./seo-pages";

describe("seo-pages", () => {
  it("finds a page by slug", () => {
    const page = getSeoLandingPage("clinic-management-software-india");

    expect(page).toBeDefined();
    expect(page!.title).toContain("Docita");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getSeoLandingPage("no-such-page")).toBeUndefined();
  });

  it("keeps slugs unique across the catalogue", () => {
    const slugs = seoLandingPages.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("fills every required field for every page", () => {
    for (const page of seoLandingPages) {
      expect(page.keyword.trim().length).toBeGreaterThan(0);
      expect(page.title.trim().length).toBeGreaterThan(0);
      expect(page.description.trim().length).toBeGreaterThan(0);
      expect(page.h1.trim().length).toBeGreaterThan(0);
      expect(page.intro.trim().length).toBeGreaterThan(0);
      expect(page.primaryUseCase.trim().length).toBeGreaterThan(0);
      expect(page.fit.length).toBeGreaterThan(0);
      expect(page.sections.length).toBeGreaterThan(0);
      expect(page.relatedSlugs.length).toBeGreaterThan(0);
    }
  });

  it("only references related slugs that exist in the catalogue", () => {
    const known = new Set(seoLandingPages.map((page) => page.slug));
    for (const page of seoLandingPages) {
      for (const related of page.relatedSlugs) {
        expect(known.has(related), `missing related slug "${related}"`).toBe(true);
      }
    }
  });
});
