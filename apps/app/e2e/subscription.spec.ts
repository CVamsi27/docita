import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser } from "./utils/patient-helpers";

test.describe("Subscription & Billing", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  test("should display subscription status on upgrade page", async ({
    page,
  }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await expect(page.locator("h1")).toContainText(/Upgrade|Plan/i);
    await expect(page.getByText("Current Plan").first()).toBeVisible();
    await expect(page.getByText("Current usage")).toBeVisible();
  });

  test("should display all tier options", async ({ page }) => {
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
  });

  test("should show professional and enterprise feature details", async ({
    page,
  }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await expect(page.getByText("Everything in Essential, plus")).toBeVisible();
    await expect(
      page.getByText("Everything in Professional, plus"),
    ).toBeVisible();
    await expect(
      page.getByText(/Best for multi-doctor clinics/i),
    ).toBeVisible();
    await expect(page.getByText(/Best for hospitals/i)).toBeVisible();
  });

  test("should show billing history", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /Billing History/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(/Billing History/i);
  });

  test("should open plan confirmation from a paid plan", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await page
      .getByRole("button", { name: /Upgrade|Select Plan|Downgrade/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(/plan/i);
  });

  test("should display FAQ section", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await page.getByRole("tab", { name: "FAQ" }).click();
    await expect(page.getByText(/FAQ|Frequently Asked/i).first()).toBeVisible();
  });

  test("should display contact sales button", async ({ page }) => {
    await page.goto("/settings?tab=subscription", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("button", { name: /Contact Sales/i }).first(),
    ).toBeVisible();
  });

  test("should render billing locked page when visited directly", async ({
    page,
  }) => {
    await page.goto("/billing-locked", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: /Workspace access paused/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/subscription billing must be resolved/i),
    ).toBeVisible();
  });
});
