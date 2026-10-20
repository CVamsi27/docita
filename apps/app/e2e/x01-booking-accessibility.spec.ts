import { expect, test, type Page } from "@playwright/test";

/**
 * X01 browser evidence: public booking flow.
 *
 * The flow is exercised against mocked public APIs so the evidence is
 * deterministic and independent of a seeded clinic: layout at 360/768/1440,
 * keyboard operation, a blocked step that announces its reason, and an
 * announced load failure with recovery.
 */
const REFERRAL = "e2e-x01-booking";

const VIEWPORTS = [
  { name: "360px mobile", width: 360, height: 800 },
  { name: "768px tablet", width: 768, height: 1024 },
  { name: "1440px desktop", width: 1440, height: 900 },
] as const;

const CLINIC_JSON = {
  id: "clinic-e2e-x01",
  name: "E2E X01 Booking Clinic",
  referralCode: REFERRAL,
  timezone: "Asia/Kolkata",
  facilityLabel: "CLINIC" as const,
  phone: "+91 9876543210",
};

const DOCTORS_JSON = {
  doctors: [
    { id: "doc-e2e-x01", name: "Dr. E2E Physician", specialization: null },
  ],
};

const SLOTS_JSON = {
  slots: [] as unknown[],
  slotListEmptyReason: "NO_WEEKLY_HOURS" as const,
};

async function mockPublicBookingApis(page: Page) {
  await page.route(
    (url) =>
      url.pathname.includes(`/public/booking/clinics/${REFERRAL}`) &&
      !url.pathname.includes("/doctors") &&
      !url.pathname.includes("/slots"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(CLINIC_JSON),
      });
    },
  );
  await page.route(
    (url) =>
      url.pathname.includes(`/public/booking/clinics/${REFERRAL}/doctors`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DOCTORS_JSON),
      });
    },
  );
  await page.route(
    (url) => url.pathname.includes(`/public/booking/clinics/${REFERRAL}/slots`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SLOTS_JSON),
      });
    },
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(
    overflow,
    "the booking page must not scroll horizontally at this viewport",
  ).toBeLessThanOrEqual(1);
}

for (const viewport of VIEWPORTS) {
  test.describe(`booking at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("loads the clinic booking page without horizontal overflow", async ({
      page,
    }) => {
      await mockPublicBookingApis(page);
      await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

      await expect(
        page.getByRole("heading", { name: CLINIC_JSON.name }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('[aria-label="Booking page"]')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    test("announces a clinic load failure with an alert and a retry action", async ({
      page,
    }) => {
      await page.route(
        `**/public/booking/clinics/${REFERRAL}`,
        async (route) => {
          await route.fulfill({ status: 500, body: "{}" });
        },
      );
      await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("alert")).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole("button", { name: /Try again/i }),
      ).toBeVisible();
    });
  });
}

test.describe("booking keyboard and blocked-step evidence", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test("mobile Continue is keyboard focusable and advances with Enter", async ({
    page,
  }) => {
    await mockPublicBookingApis(page);
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    const continueButton = page.getByRole("button", { name: /^Continue$/ });
    await expect(continueButton).toBeVisible({ timeout: 30_000 });
    await expect(continueButton).toBeEnabled({ timeout: 30_000 });
    await continueButton.focus();
    await expect(continueButton).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: /Your contact details/i }),
    ).toBeVisible();
  });

  test("blocked mobile Continue is programmatically associated with its reason", async ({
    page,
  }) => {
    await mockPublicBookingApis(page);
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    const continueButton = page.getByRole("button", { name: /^Continue$/ });
    await expect(continueButton).toBeVisible({ timeout: 30_000 });
    await continueButton.click();
    await expect(
      page.getByRole("heading", { name: /Your contact details/i }),
    ).toBeVisible();

    // The contact step also renders the phone-check "Continue" control, so the
    // dock's blocked control is the one that carries the reason association.
    const dockContinue = page
      .locator("button[aria-describedby]")
      .filter({ hasText: /^Continue$/ });
    await expect(dockContinue).toBeDisabled();
    const describedBy = await dockContinue.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const reason = page.locator(`[id="${describedBy}"]`);
    await expect(reason).toHaveText(/Enter your first and last name/i);
  });

  test("blocked wide-layout submit is programmatically associated with its reason", async ({
    page,
  }) => {
    await mockPublicBookingApis(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    const submit = page.getByRole("button", { name: /Send visit request/i });
    await expect(submit).toBeVisible({ timeout: 30_000 });
    await expect(submit).toBeDisabled();

    const describedBy = await submit.getAttribute("aria-describedby");
    expect(
      describedBy,
      "the disabled submit must reference the step it is waiting on",
    ).toBeTruthy();

    const reason = page.locator(`[id="${describedBy}"]`);
    await expect(reason).toBeVisible();
    await expect(reason).toHaveText(/Enter your first and last name/i);
  });

  for (const viewport of [VIEWPORTS[1], VIEWPORTS[2]] as const) {
    test(`form field receives keyboard focus at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await mockPublicBookingApis(page);
      await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

      const phoneField = page.getByLabel(/Phone number/i);
      await expect(phoneField).toBeVisible({ timeout: 30_000 });
      await phoneField.focus();
      await expect(phoneField).toBeFocused();

      // An incomplete request cannot submit; the evidence records that the
      // disabled state is real, not that the control is keyboard-reachable
      // before the visitor has supplied the required details.
      const submit = page.getByRole("button", {
        name: /Send visit request/i,
      });
      await expect(submit).toBeVisible();
      await expect(submit).toBeDisabled();
    });
  }
});
