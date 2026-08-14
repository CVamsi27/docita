import { describe, expect, it } from "vitest";
import { buildFaqPageStructuredData, HOMEPAGE_FAQS } from "./faqs";

describe("faqs", () => {
  it("builds FAQPage JSON-LD with one Question/Answer per entry", () => {
    const data = buildFaqPageStructuredData("https://docita.work");

    expect(data["@type"]).toBe("FAQPage");
    expect(data.url).toBe("https://docita.work");
    const entities = data.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(HOMEPAGE_FAQS.length);

    for (const [index, faq] of HOMEPAGE_FAQS.entries()) {
      const entity = entities[index];
      expect(entity["@type"]).toBe("Question");
      expect(entity.name).toBe(faq.q);
      expect((entity.acceptedAnswer as Record<string, unknown>).text).toBe(
        faq.a,
      );
    }
  });

  it("keeps every FAQ question unique and non-empty", () => {
    const questions = HOMEPAGE_FAQS.map((faq) => faq.q);
    expect(new Set(questions).size).toBe(questions.length);
    for (const question of questions) {
      expect(question.trim().length).toBeGreaterThan(0);
    }
  });

  it("answers every question with non-empty copy", () => {
    for (const faq of HOMEPAGE_FAQS) {
      expect(faq.a.trim().length).toBeGreaterThan(0);
    }
  });
});
