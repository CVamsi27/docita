import { expect, test } from "@playwright/test";

const REFERRAL = "e2e-public-booking";
const CLINIC_JSON = {
  id: "clinic-e2e-public-booking",
  name: "E2E Public Booking Clinic",
  referralCode: REFERRAL,
  timezone: "Asia/Kolkata",
  facilityLabel: "CLINIC" as const,
  phone: "+91 9876543210",
};
const DOCTORS_JSON = {
  doctors: [
    { id: "doc-e2e-1", name: "Dr. E2E Physician", specialization: null },
  ],
};
const SLOTS_JSON = {
  slots: [] as unknown[],
  slotListEmptyReason: "NO_WEEKLY_HOURS" as const,
};

async function mockPublicBookingApis(page: import("@playwright/test").Page) {
  await page.route(
    (url) =>
      url.pathname.includes(`/public/booking/clinics/${REFERRAL}`) &&
      !url.pathname.includes("/doctors") &&
      !url.pathname.includes("/slots") &&
      !url.pathname.includes("/phone-check"),
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
  // The contact step gates the demographic fields behind a phone check;
  // mock a new patient so first/last name, DOB, and consent render.
  await page.route(
    (url) =>
      url.pathname.includes(`/public/booking/clinics/${REFERRAL}/phone-check`),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ requiresOtp: false }),
      });
    },
  );
}

/** Open the date-of-birth picker and select the first day of the current month. */
async function fillDateOfBirth(page: import("@playwright/test").Page) {
  await page.locator("#pb-date-of-birth").click();
  const firstOfMonth = await page.evaluate(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}-01`;
  });
  // The day cell (td) and its inner button share data-day; click the button.
  await page.locator(`button[data-day="${firstOfMonth}"]`).click();
  await expect(page.locator("#pb-date-of-birth")).toHaveText(
    /\d{2} \w{3} \d{4}/,
  );
}

test.describe("Public booking /book/[referralCode]", () => {
  test("shows clinic hero title when the clinic loads (desktop layout)", async ({
    page,
  }) => {
    await mockPublicBookingApis(page);
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: CLINIC_JSON.name }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[aria-label="Booking page"]')).toBeVisible();
  });

  test("surfaces error retry when the clinic request fails", async ({
    page,
  }) => {
    await page.route(`**/public/booking/clinics/${REFERRAL}`, async (route) => {
      await route.fulfill({ status: 500, body: "{}" });
    });
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(/This booking link is not valid/i)).toBeVisible(
      { timeout: 30_000 },
    );
    await expect(
      page.getByRole("button", { name: /Try again/i }),
    ).toBeVisible();
  });

  test("tablet viewport uses wide layout with summary rail", async ({
    page,
  }) => {
    await mockPublicBookingApis(page);
    await page.setViewportSize({ width: 820, height: 1100 });
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    // The desktop summary rail is the page's complementary landmark, named from
    // the existing summaryPeek.ariaLabel key (X01 finding F-X01-4).
    await expect(
      page.getByRole("complementary", { name: /Your request summary/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Prefer to call/i)).toHaveCount(0);
    // No mobile bottom dock in the wide layout: its summary peek is absent and
    // the only forward control left is the inline phone-check control, which
    // names its own action rather than "Continue".
    await expect(
      page.getByRole("button", { name: /^Your visit:/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Continue$/ })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: /Check phone number/i }),
    ).toHaveCount(1);
  });

  test("mobile wizard shows progress and scheduling context", async ({
    page,
  }) => {
    await mockPublicBookingApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("progressbar")).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("button", { name: /^Continue$/ }),
    ).toBeVisible();
    // The dock's summary peek announces its current selection inline
    // ("Your visit: …") instead of the former fixed "Your request summary"
    // accessible name.
    await expect(
      page.getByRole("button", { name: /^Your visit:/ }),
    ).toBeVisible();
  });

  test("mobile wizard Edit returns to visit step", async ({ page }) => {
    await mockPublicBookingApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: /^Continue$/ })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await expect(
      page.getByRole("heading", { name: /Your contact details/i }),
    ).toBeVisible();

    // Demographic fields are gated behind the phone check: fill the phone,
    // run the check (mocked to a new patient), then the fields appear.
    await page.getByLabel(/Phone number/i).fill("+91 9876543210");
    // The phone check and the wizard dock used to both be named "Continue";
    // the phone check now names its own action so the two are distinguishable.
    await page
      .getByRole("button", { name: /Check phone number/i })
      .click();
    await expect(page.getByLabel(/First name/i)).toBeVisible();

    await page.getByLabel(/First name/i).fill("E2E");
    await page.getByLabel(/Last name/i).fill("Patient");
    await fillDateOfBirth(page);
    await page.locator("#pb-dpdp-consent").click();

    const dockContinue = page.getByRole("button", { name: /^Continue$/ });
    await expect(dockContinue).toBeEnabled();
    await dockContinue.click();
    await expect(
      page.getByRole("heading", { name: /Review and send/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).first().click();
    await expect(
      page.getByRole("heading", { name: /Doctor, date, and time/i }),
    ).toBeVisible();
  });

  test("mobile bottom action explains blocked contact step and enables after details", async ({
    page,
  }) => {
    await mockPublicBookingApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: /^Continue$/ })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await expect(
      page.getByRole("heading", { name: /Your contact details/i }),
    ).toBeVisible();

    // The wizard dock is the only control named "Continue" on the contact
    // step; the phone check names its own action.
    const dockContinue = page.getByRole("button", { name: /^Continue$/ });
    await expect(dockContinue).toBeDisabled();
    await expect(
      page.getByText(/Enter your first and last name/i),
    ).toBeVisible();

    await page.getByLabel(/Phone number/i).fill("+91 9876543210");
    await page
      .getByRole("button", { name: /Check phone number/i })
      .click();
    await expect(page.getByLabel(/First name/i)).toBeVisible();

    await page.getByLabel(/First name/i).fill("E2E");
    await page.getByLabel(/Last name/i).fill("Patient");
    await fillDateOfBirth(page);
    await page.locator("#pb-dpdp-consent").click();

    await expect(dockContinue).toBeEnabled();
    await dockContinue.click();
    await expect(
      page.getByRole("heading", { name: /Review and send/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send visit request/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Check phone number/i }),
    ).toHaveCount(0);
  });

  test("submit control is focusable for keyboard users", async ({ page }) => {
    await mockPublicBookingApis(page);
    await page.goto(`/book/${REFERRAL}`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: CLINIC_JSON.name }),
    ).toBeVisible({ timeout: 30_000 });

    const submit = page.getByRole("button", { name: /Send visit request/i });
    await expect(submit).toBeVisible();
    const tabIndex = await submit.evaluate((el) =>
      el instanceof HTMLElement ? el.tabIndex : -1,
    );
    expect(tabIndex).not.toBe(-1);
  });
});
