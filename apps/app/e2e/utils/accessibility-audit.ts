import { expect } from "@playwright/test";
import type { getViolations } from "axe-playwright";

export function assertAccessibleViolations(
  violations: Awaited<ReturnType<typeof getViolations>>,
) {
  expect(
    violations
      .filter(({ impact }) => impact === "serious" || impact === "critical")
      .map(({ id }) => id),
    "Serious and critical accessibility violations",
  ).toEqual([]);
}
