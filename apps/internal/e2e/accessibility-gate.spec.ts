import { expect, test } from "@playwright/test";
import {
  assertAccessibleViolations,
  requireInternalSession,
  scanAuditRoute,
} from "./utils/accessibility-audit";

const fixture = (content: string) =>
  `<!doctype html><html lang="en"><head><title>Audit fixture</title></head><body><main><h1>Audit fixture</h1>${content}</main></body></html>`;

test("audit rejects an absent authentication fixture", () => {
  expect(() => requireInternalSession(null)).toThrow();
});

test("audit allows a healthy rendered route", async ({ page }) => {
  await page.route("http://audit.test/healthy", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture("<p>Ready</p>") }),
  );
  await page.goto("http://audit.test/healthy");
  const violations = await scanAuditRoute(page, "/healthy", "Audit fixture");
  expect(() => assertAccessibleViolations(violations)).not.toThrow();
});

test("audit fails when axe finds an unlabelled input", async ({ page }) => {
  await page.route("http://audit.test/broken", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: fixture('<input type="text">'),
    }),
  );
  await page.goto("http://audit.test/broken");
  const violations = await scanAuditRoute(page, "/broken", "Audit fixture");
  expect(() => assertAccessibleViolations(violations)).toThrow(/label/);
});

test("audit rejects a login redirect instead of scanning the protected page", async ({
  page,
}) => {
  await page.route("http://audit.test/login", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture("<p>Login</p>") }),
  );
  await page.goto("http://audit.test/login");
  await expect(
    scanAuditRoute(page, "/dashboard", "Dashboard"),
  ).rejects.toThrow();
});
