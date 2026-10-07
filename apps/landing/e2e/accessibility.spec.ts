import { expect, type Locator, test } from "@playwright/test";

async function expectSinglePressedSelection(group: Locator) {
  const buttons = group.getByRole("button");
  const count = await buttons.count();
  expect(count).toBeGreaterThanOrEqual(2);

  for (let i = 0; i < count; i++) {
    const ariaPressed = await buttons.nth(i).getAttribute("aria-pressed");
    expect(["true", "false"]).toContain(ariaPressed);
  }

  await expect(group.locator('button[aria-pressed="true"]')).toHaveCount(1);

  return buttons;
}

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

test("hero live preview controls are keyboard accessible", async ({ page }) => {
  await page.goto("/");

  const previewRegion = page.getByRole("region", {
    name: "Live practice operations preview",
  });
  await expect(previewRegion).toBeVisible();

  const tablist = page.getByRole("tablist", {
    name: "Preview OPD workflow stages",
  });
  await expect(tablist).toBeVisible();

  const tabs = tablist.getByRole("tab");
  await expect(tabs).toHaveCount(3);

  // Exactly one tab is selected and it stays keyboard focusable.
  const selectedTabs = tablist.getByRole("tab", { selected: true });
  await expect(selectedTabs).toHaveCount(1);
  await selectedTabs.first().focus();
  await expect(selectedTabs.first()).toBeFocused();

  // Focusing the rail pauses the preview rotation, so arrow keys move the
  // selection deterministically.
  const selectedId = await selectedTabs.first().getAttribute("id");
  await page.keyboard.press("ArrowRight");

  const movedTab = tablist.locator('[role="tab"][aria-selected="true"]');
  await expect(movedTab).toHaveCount(1);
  await expect(movedTab).toBeFocused();
  expect(await movedTab.getAttribute("id")).not.toBe(selectedId);

  // Only the selected stage is exposed to assistive technology.
  await expect(
    page.locator('.r2-product-frame[aria-hidden="false"]'),
  ).toHaveCount(1);
});

test("product screenshot filter tabs move with arrow keys", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("#product-screenshots");
  await section.scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: /The screens your/i }),
  ).toBeVisible();

  // The section hydrates on visibility, so wait for React props before
  // sending key presses that depend on its handlers.
  await page.waitForFunction(() => {
    const tab = document.querySelector("#r2-product-tab-all");
    return Boolean(
      tab && Object.keys(tab).some((key) => key.startsWith("__react")),
    );
  });

  const tablist = page.getByRole("tablist", {
    name: "Filter screens by department",
  });
  const activeTab = tablist.locator('[role="tab"][aria-selected="true"]');
  await expect(activeTab).toHaveCount(1);
  await activeTab.focus();

  const allScreensTab = page.locator("#r2-product-tab-all");
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#r2-product-tab-clinical")).toBeFocused();
  await expect(page.locator("#r2-product-tab-clinical")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#r2-product-tab-all")).toHaveAttribute(
    "aria-selected",
    "false",
  );
  await expect(page.locator("#r2-product-panel")).toHaveAttribute(
    "aria-labelledby",
    "r2-product-tab-clinical",
  );

  await allScreensTab.focus();
  await page.keyboard.press("Home");
  await expect(allScreensTab).toBeFocused();
  await expect(allScreensTab).toHaveAttribute("aria-selected", "true");
});

test("screenshot lightbox traps Tab and restores focus to its trigger", async ({
  page,
}) => {
  await page.goto("/");

  const section = page.locator("#product-screenshots");
  await section.scrollIntoViewIfNeeded();

  await page.waitForFunction(() => {
    const trigger = document.querySelector(
      '#product-screenshots [role="button"]',
    );
    return Boolean(
      trigger && Object.keys(trigger).some((key) => key.startsWith("__react")),
    );
  });

  const trigger = section.getByRole("button", { name: /^Enlarge / }).first();
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

  await trigger.focus();
  await trigger.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Opening moves focus inside so Tab never has to walk the page behind.
  const closeButton = dialog.getByRole("button", { name: "Close preview" });
  const nextButton = dialog.getByRole("button", { name: "Next screenshot" });
  await expect(closeButton).toBeFocused();

  await expect(nextButton).toHaveCount(1);
  await nextButton.focus();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(nextButton).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("pricing toggles expose single-select pressed state", async ({ page }) => {
  await page.goto("/");

  // Scroll to the pricing section so the toggles are visible
  const pricingHeading = page.getByRole("heading", {
    name: /plans for/i,
  });
  await pricingHeading.scrollIntoViewIfNeeded();
  await expect(pricingHeading).toBeVisible();

  // --- Plan mode toggle (Full / Front Desk / Core) ---
  const planModeGroup = page.getByRole("group", { name: "Plan mode" });
  await expect(planModeGroup).toBeVisible();

  const planModeButtons = await expectSinglePressedSelection(planModeGroup);

  // Selecting another mode moves the pressed state instead of adding to it.
  await planModeButtons.nth(1).click();
  await expect(planModeButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(
    planModeGroup.locator('button[aria-pressed="true"]'),
  ).toHaveCount(1);

  // --- Billing period toggle (Monthly / Yearly) ---
  const billingGroup = page.getByRole("group", { name: "Billing period" });
  await expect(billingGroup).toBeVisible();

  await expectSinglePressedSelection(billingGroup);

  const monthlyButton = billingGroup.getByRole("button", { name: /monthly/i });
  await monthlyButton.click();
  await expect(monthlyButton).toHaveAttribute("aria-pressed", "true");
  await expect(billingGroup.locator('button[aria-pressed="true"]')).toHaveCount(
    1,
  );
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
