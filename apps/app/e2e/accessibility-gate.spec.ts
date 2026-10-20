import { expect, test } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";
import { assertAccessibleViolations } from "./utils/accessibility-audit";

const fixture = (content: string) =>
  `<!doctype html><html lang="en"><head><title>Audit fixture</title></head><body><main><h1>Audit fixture</h1>${content}</main></body></html>`;

test("clinician audit accepts a healthy rendered fixture", async ({ page }) => {
  await page.setContent(fixture("<p>Ready</p>"));
  await injectAxe(page);
  const violations = await getViolations(page);
  expect(() => assertAccessibleViolations(violations)).not.toThrow();
});

test("clinician audit rejects a real unlabelled input finding", async ({
  page,
}) => {
  await page.setContent(fixture('<input type="text">'));
  await injectAxe(page);
  const violations = await getViolations(page);
  expect(() => assertAccessibleViolations(violations)).toThrow(/label/);
});
