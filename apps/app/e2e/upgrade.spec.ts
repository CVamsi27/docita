import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser } from "./utils/patient-helpers";
import { expectPageHeader, expectRoute } from "./utils/ui-contracts";

test.describe("Subscription billing (settings)", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  test("should display subscription billing with current plan", async ({
    page,
  }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await expectRoute(page, /\/settings/);
    await expectPageHeader(page, { title: /Upgrade|Billing|Subscription/i });
    await expect(page.getByText("Current Plan").first()).toBeVisible();
    await expect(page.getByText("Current usage")).toBeVisible();
    await expect(page.getByText("Planned Roadmap")).toHaveCount(0);
    await expect(page.getByText(/14-day|trial offer/i)).toHaveCount(0);
  });

  test("should show all four plan options with feature details", async ({
    page,
  }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Essential" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Professional" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Enterprise" }),
    ).toBeVisible();
    await expect(page.getByText("Everything in Essential, plus")).toBeVisible();
    await expect(
      page.getByText("Everything in Professional, plus"),
    ).toBeVisible();
  });

  test("should display tier cards with pricing", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: "Monthly" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Yearly" })).toBeVisible();
    await expect(
      page.getByText(/Free forever|From|Custom/).first(),
    ).toBeVisible();
  });

  test("should open contact sales from Enterprise", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await page
      .getByRole("button", { name: /Contact Sales/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(/Contact|Sales/i);
  });

  test("should show billing history button", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("button", { name: /Billing History/i }),
    ).toBeVisible();
  });

  test("should open billing history dialog", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /Billing History/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(/Billing History/i);
  });

  test("should toggle monthly/yearly pricing", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Yearly" }).click();
    await expect(page.getByRole("button", { name: "Yearly" })).toBeVisible();
  });

  test("should render billing locked page when visited directly", async ({
    page,
  }) => {
    await page.goto("/billing-locked", { waitUntil: "networkidle" });

    await expect(page.getByText(/Workspace access paused/i)).toBeVisible();
    await expect(
      page.getByText(/subscription billing must be resolved/i),
    ).toBeVisible();
  });
});
