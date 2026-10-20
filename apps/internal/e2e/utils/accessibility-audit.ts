import { expect, type Page } from "@playwright/test";
import { tokenIssueResponseSchema } from "@workspace/types";
import { getViolations, injectAxe } from "axe-playwright";

export function requireInternalSession(payload: unknown) {
  const session = tokenIssueResponseSchema.parse(payload);
  if (session.user.role !== "INTERNAL") {
    throw new Error(
      "Accessibility audit requires an authenticated INTERNAL user",
    );
  }
  return session;
}

export async function scanAuditRoute(
  page: Page,
  pathname: string,
  heading: string,
) {
  await expect(page).toHaveURL((url) => url.pathname === pathname);
  await expect(
    page.getByRole("heading", { name: heading, exact: true }).first(),
  ).toBeVisible();
  await injectAxe(page);
  return getViolations(page);
}

export function assertAccessibleViolations(
  violations: Awaited<ReturnType<typeof getViolations>>,
) {
  const blocking = violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  expect(
    blocking.map((violation) => violation.id),
    "Serious and critical accessibility violations",
  ).toEqual([]);
}
