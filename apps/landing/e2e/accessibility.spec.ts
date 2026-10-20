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
  await expect(h1).toContainText("A calmer clinic day.");
});

test("product screenshot filter tabs move with arrow keys", async ({
  page,
}) => {
  await page.goto("/product");

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
  await page.goto("/product");

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
  await page.goto("/pricing");

  // Scroll to the pricing section so the toggles are visible
  const pricingHeading = page.getByRole("heading", {
    name: /plans for/i,
  });
  await pricingHeading.scrollIntoViewIfNeeded();
  await expect(pricingHeading).toBeVisible();

  // --- Plan mode toggle (Full / Front Desk / Core) ---
  const planModeGroup = page.getByRole("group", { name: "Plan mode" });
  await expect(planModeGroup).toBeVisible();
  await page.waitForFunction(() => {
    const button = document.querySelector(
      '[role="group"][aria-label="Plan mode"] button',
    );
    return Boolean(
      button && Object.keys(button).some((key) => key.startsWith("__react")),
    );
  });

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
  await page.goto("/pricing");

  // Scroll to the plan picker section
  const planPickerHeading = page.getByRole("heading", {
    name: /Which plan actually fits/i,
  });
  await planPickerHeading.scrollIntoViewIfNeeded();
  await expect(planPickerHeading).toBeVisible();

  const practiceOptions = page
    .getByRole("group", { name: "Practice size" })
    .getByRole("button");
  const workOptions = page
    .getByRole("group", { name: "Type of work" })
    .getByRole("button");
  for (const options of [practiceOptions, workOptions]) {
    expect(await options.count()).toBeGreaterThanOrEqual(2);
    await options.first().focus();
    await expect(options.first()).toBeFocused();
  }
});

test("product FAQ expands with the keyboard", async ({ page }) => {
  await page.goto("/product#faq");
  const question = page.getByRole("button", {
    name: "How fast can my facility actually go live?",
  });
  await question.scrollIntoViewIfNeeded();
  await expect(
    page.locator('astro-island[component-export="FaqCtaSection"]'),
  ).not.toHaveAttribute("ssr", "");
  await question.focus();
  await question.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText(/Discovery call on day zero/)).toBeVisible();
  await question.press("Enter");
  await expect(question).toHaveAttribute("aria-expanded", "false");
});

test("marketing detail pages have one primary heading and a skip link", async ({
  page,
}) => {
  for (const route of ["/product", "/pricing"]) {
    await page.goto(route);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toHaveCount(1);
    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();
    await skipLink.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  }
});
