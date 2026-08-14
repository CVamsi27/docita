import { describe, expect, it } from "vitest";
import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "./motion-prefs";

describe("motion-prefs", () => {
  describe("landingFadeUpVariants", () => {
    it("hides content below the fold and fades it up when motion is allowed", () => {
      const variants = landingFadeUpVariants(false);

      expect(variants.hidden).toEqual({ opacity: 0, y: 16 });
      expect(variants.visible.opacity).toBe(1);
      expect(variants.visible.y).toBe(0);
      expect(variants.visible.transition.type).toBe("spring");
    });

    it("renders content fully visible with a zero-duration transition under reduced motion", () => {
      const variants = landingFadeUpVariants(true);

      expect(variants.hidden).toEqual({ opacity: 1, y: 0 });
      expect(variants.visible).toEqual({
        opacity: 1,
        y: 0,
        transition: { duration: 0 },
      });
    });

    it("treats null (undecided) preference as motion allowed", () => {
      const variants = landingFadeUpVariants(null);

      expect(variants.hidden).toEqual({ opacity: 0, y: 16 });
      expect(variants.visible.transition.type).toBe("spring");
    });
  });

  describe("landingStaggerContainer", () => {
    it("applies the requested stagger and child delay when motion is allowed", () => {
      const container = landingStaggerContainer(false, 0.07, 0.04);

      expect(container.visible.transition).toEqual({
        staggerChildren: 0.07,
        delayChildren: 0.04,
      });
    });

    it("defaults delayChildren to 0 when omitted", () => {
      const container = landingStaggerContainer(false, 0.1);

      expect(container.visible.transition.delayChildren).toBe(0);
    });

    it("zeroes both stagger and delay under reduced motion so nothing waits", () => {
      const container = landingStaggerContainer(true, 0.07, 0.04);

      expect(container.visible.transition).toEqual({
        staggerChildren: 0,
        delayChildren: 0,
      });
    });
  });

  it("exposes a once-only viewport preset with a -10% margin", () => {
    expect(landingInViewViewport).toEqual({
      once: true,
      margin: "-10%",
      amount: 0.2,
    });
  });
});
