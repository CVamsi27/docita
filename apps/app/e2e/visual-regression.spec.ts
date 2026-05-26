import { expect, test } from "@playwright/test";

/**
 * Visual regression baseline for the (tools)/visual-test/* primitive
 * pages. Each route renders a curated set of UI primitives with no
 * real data, so they are deterministic snapshot candidates.
 *
 * Runs only when NEXT_PUBLIC_ENABLE_VISUAL_TESTS=true (the gate in
 * apps/app/app/(tools)/layout.tsx). In CI we set this for the
 * visual-regression job only.
 *
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.3 item 28.
 */

const VISUAL_ROUTES = [
  { path: "/visual-test/ui-contract", name: "ui-contract" },
  { path: "/visual-test/status-badge", name: "status-badge" },
  { path: "/visual-test/stats-card", name: "stats-card" },
  { path: "/visual-test/origin-primitives", name: "origin-primitives" },
  { path: "/visual-test/doctor-workflow", name: "doctor-workflow" },
] as const;

const VISUAL_TESTS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_VISUAL_TESTS === "true" ||
  process.env.RUN_VISUAL_REGRESSION === "true";

test.describe("visual regression — (tools)/visual-test", () => {
  test.skip(!VISUAL_TESTS_ENABLED, "Set NEXT_PUBLIC_ENABLE_VISUAL_TESTS=true");

  for (const { path, name } of VISUAL_ROUTES) {
    test(`snapshot ${name}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      // Disable animations so screenshots are stable.
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            transition-duration: 0s !important;
            scroll-behavior: auto !important;
          }
        `,
      });
      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});
