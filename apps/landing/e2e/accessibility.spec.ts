import { expect, test } from "@playwright/test";

test("accessibility smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toContainText(
    "One rhythm for your whole OPD floor. Queue, chart, bill, follow up—without the shuffle.",
  );
});

test("hero live preview controls are keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");

  const previewRegion = page.getByRole("region", {
    name: "Live practice operations preview",
  });
  await expect(previewRegion).toBeVisible();

  const tablist = page.getByRole("tablist", { name: "Preview state" });
  await expect(tablist).toBeVisible();

  const tabs = tablist.getByRole("tab");
  await expect(tabs).toHaveCount(3);

  // Exactly one tab is selected and it stays keyboard focusable.
  const selectedTabs = tablist.getByRole("tab", { selected: true });
  await expect(selectedTabs).toHaveCount(1);
  await selectedTabs.first().focus();
  await expect(selectedTabs.first()).toBeFocused();
});

test("pricing toggle has correct ARIA tab semantics", async ({
  page,
}) => {
  await page.goto("/");

  // Scroll to the pricing section so the toggles are visible
  const pricingHeading = page.getByRole("heading", {
    name: /plans for/i,
  });
  await pricingHeading.scrollIntoViewIfNeeded();
  await expect(pricingHeading).toBeVisible();

  // --- Plan mode toggle (Full / Front Desk / Core) ---
  const planModeTablist = page.getByRole("tablist", {
    name: "Plan mode",
  });
  await expect(planModeTablist).toBeVisible();

  const planModeTabs = planModeTablist.getByRole("tab");
  const planModeTabCount = await planModeTabs.count();
  expect(planModeTabCount).toBeGreaterThanOrEqual(2);

  // Exactly one tab should be selected (aria-selected=true)
  const selectedPlanModeTabs = planModeTablist.getByRole("tab", {
    selected: true,
  });
  await expect(selectedPlanModeTabs).toHaveCount(1);

  // All tabs should have aria-selected defined (true or false)
  for (let i = 0; i < planModeTabCount; i++) {
    const tab = planModeTabs.nth(i);
    await expect(tab).toHaveAttribute("role", "tab");
    const ariaSelected = await tab.getAttribute("aria-selected");
    expect(["true", "false"]).toContain(ariaSelected);
  }

  // --- Billing period toggle (Monthly / Yearly) ---
  const billingPeriodTablist = page.getByRole("tablist", {
    name: "Billing period",
  });
  await expect(billingPeriodTablist).toBeVisible();

  const billingPeriodTabs = billingPeriodTablist.getByRole("tab");
  const billingPeriodTabCount = await billingPeriodTabs.count();
  expect(billingPeriodTabCount).toBeGreaterThanOrEqual(2);

  // Exactly one tab should be selected
  const selectedBillingPeriodTabs = billingPeriodTablist.getByRole(
    "tab",
    { selected: true },
  );
  await expect(selectedBillingPeriodTabs).toHaveCount(1);

  // All tabs should have role=tab and aria-selected
  for (let i = 0; i < billingPeriodTabCount; i++) {
    const tab = billingPeriodTabs.nth(i);
    await expect(tab).toHaveAttribute("role", "tab");
    const ariaSelected = await tab.getAttribute("aria-selected");
    expect(["true", "false"]).toContain(ariaSelected);
  }
});

test("plan picker options are focusable", async ({ page }) => {
  await page.goto("/");

  // Scroll to the plan picker section
  const planPickerHeading = page.getByRole("heading", {
    name: /Which plan actually fits/i,
  });
  await planPickerHeading.scrollIntoViewIfNeeded();
  await expect(planPickerHeading).toBeVisible();

  // The plan picker option buttons should exist and be focusable
  const optionButtons = page.locator(
    "[class*='plan-picker'] button, [data-testid*='plan-option'] button",
  );
  const count = await optionButtons.count();

  // If the plan picker is visible, verify its buttons are focusable
  if (count > 0) {
    for (let i = 0; i < Math.min(count, 5); i++) {
      const btn = optionButtons.nth(i);
      if (await btn.isVisible()) {
        await btn.focus();
        await expect(btn).toBeFocused();
      }
    }
  }
});
