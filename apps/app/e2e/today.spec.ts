import { expect, test } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";
import {
  applyUserSession,
  fetchUserSession,
  reuseSharedGeneralClinicUser,
} from "./utils/patient-helpers";
import {
  expectDashboardQueueSectionReady,
  expectProtectedWorkspaceLoaded,
  expectRoute,
  isDashboardQueueSectionVisible,
} from "./utils/ui-contracts";

test.describe("Today workspace", () => {
  let user: Awaited<ReturnType<typeof reuseSharedGeneralClinicUser>> | null =
    null;

  let tokens: Awaited<ReturnType<typeof fetchUserSession>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await reuseSharedGeneralClinicUser(request);
    tokens = await fetchUserSession(request, user);
  });

  test.beforeEach(async ({ page }) => {
    if (!user || !tokens) throw new Error("User session not initialized");
    await applyUserSession(page, user, tokens);
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
  });

  test("should load today workspace with header and queue band", async ({
    page,
  }) => {
    await expectRoute(page, /\/today/);
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Today", exact: true, level: 1 }),
    ).toBeVisible();
    await expectDashboardQueueSectionReady(page);
    await expect(
      page.getByRole("button", { name: "Refresh data" }),
    ).toBeVisible();
    if (await isDashboardQueueSectionVisible(page)) {
      await expect(
        page.getByRole("heading", { name: "Queue", exact: true, level: 2 }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("Start with your first patient", { exact: true }),
      ).toBeVisible();
    }
  });

  test("opens the Ask AI overlay scoped to today from the page header", async ({
    page,
  }) => {
    await expectDashboardQueueSectionReady(page);
    const trigger = page.getByTestId("today-ask-ai");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole("dialog", { name: /ask ai/i })).toBeVisible();
    await expect(page.getByText(/on today's workspace/i)).toBeVisible();
    const dialog = page.getByRole("dialog", { name: /ask ai/i });
    await expect
      .poll(() =>
        dialog.evaluate((element) =>
          element
            .getAnimations({ subtree: true })
            .every((animation) => animation.playState !== "running"),
        ),
      )
      .toBe(true);
    await expect(
      page.getByText("AI suggestions are not medical advice.", { exact: true }),
    ).toBeVisible();
    await injectAxe(page);
    await checkA11y(page, undefined, {
      includedImpacts: ["serious", "critical"],
    });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: /ask ai/i }),
    ).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
  test("shows schedule failures and recovers through the visible retry action", async ({
    page,
  }) => {
    const appointmentUrl = /\/api\/v1\/appointments\?date=/;
    await page.route(appointmentUrl, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          type: "about:blank",
          title: "Service Unavailable",
          status: 503,
          detail: "Schedule temporarily unavailable",
        }),
      }),
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    const error = page.getByText("We could not load today's workspace", {
      exact: true,
    });
    await expect(error).toBeVisible({ timeout: 35_000 });
    await expect(
      page.getByText("Start with your first patient", { exact: true }),
    ).not.toBeVisible();
    const retry = page.getByRole("button", { name: /try again/i });
    await expect(retry).toBeVisible();
    await injectAxe(page);
    await checkA11y(page, undefined, {
      includedImpacts: ["serious", "critical"],
    });
    await page.unroute(appointmentUrl);
    await retry.click();
    await expect(error).not.toBeVisible();
    await expectDashboardQueueSectionReady(page);
    await injectAxe(page);
    await checkA11y(page, undefined, {
      includedImpacts: ["serious", "critical"],
    });
  });
});
