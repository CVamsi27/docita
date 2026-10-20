import { expect, test, type Page } from "@playwright/test";
import {
  API_URL,
  applyUserSession,
  fetchUserSession,
  setupTestUser,
  type UserData,
  type UserSessionTokens,
} from "./utils/patient-helpers";
import { expectNoHorizontalOverflow } from "./utils/mobile-layout";
import { DPDP_NOTICE_VERSION } from "@workspace/types";

const DPDP_CONSENT_PAYLOAD = {
  accepted: true,
  noticeVersion: DPDP_NOTICE_VERSION,
  givenByName: "X01 Flow Patient",
} as const;

/**
 * X01 browser evidence: authenticated flows — clinical-form validation,
 * invoice/payment, and documents — at 360/768/1440 CSS pixels, with keyboard
 * focus and announced errors. All records are seeded through the API from one
 * shared onboarded clinic user, so the runs are deterministic.
 */
const VIEWPORTS = [
  { name: "360px mobile", width: 360, height: 800 },
  { name: "768px tablet", width: 768, height: 1024 },
  { name: "1440px desktop", width: 1440, height: 900 },
] as const;

const PATIENT_NAME = { firstName: "X01", lastName: "Flow Patient" };

let user: UserData;
let patientId: string;
let sessionTokens: UserSessionTokens;

/** The dialog under test reports its first invalid control's error through aria-describedby. */
async function readDescribedError(page: Page, describedBy: string) {
  for (const id of describedBy.split(/\s+/).filter(Boolean)) {
    const node = page.locator(`[id="${id}"]`);
    if ((await node.count()) > 0) {
      await expect(node).toBeVisible();
      return (await node.innerText()).trim();
    }
  }
  return "";
}

function isFocusInsideDialog(page: Page) {
  return page.evaluate(
    () => document.activeElement?.closest('[role="dialog"]') !== null,
  );
}

test.describe("X01 authenticated flows", () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
    // One login for the whole suite: /auth/login is throttled to 5/min.
    sessionTokens = await fetchUserSession(request, user);

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        ...PATIENT_NAME,
        phoneNumber: `97${Math.floor(Math.random() * 1e8)
          .toString()
          .padStart(8, "0")}`,
        gender: "FEMALE",
        dateOfBirth: "1991-02-03",
        clinicId: user.clinicId,
        dpdpConsent: DPDP_CONSENT_PAYLOAD,
      },
    });
    expect(
      patientRes.ok(),
      `patient seed failed: ${patientRes.status()} ${await patientRes.text()}`,
    ).toBeTruthy();
    patientId = (await patientRes.json()).id;

    const invoiceRes = await request.post(`${API_URL}/invoices`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        patientId,
        total: 4200,
        status: "PENDING",
        items: [{ description: "Consultation", quantity: 1, price: 4200 }],
      },
    });
    expect(
      invoiceRes.ok(),
      `invoice seed failed: ${invoiceRes.status()} ${await invoiceRes.text()}`,
    ).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await applyUserSession(page, user, sessionTokens);
  });

  for (const viewport of VIEWPORTS) {
    test.describe(`clinical form at ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      test("invalid add-patient submit marks the first bad field and describes its error", async ({
        page,
      }) => {
        await page.goto("/patients", { waitUntil: "domcontentloaded" });
        await expect(
          page.getByTestId("patients-add-trigger"),
        ).toBeVisible({ timeout: 30_000 });
        await expectNoHorizontalOverflow(page);

        await page.getByTestId("patients-add-trigger").click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        // The submit stays disabled until the DPDP attestation is checked, so
        // consent cannot mask the required-field validation under test. The
        // checkbox is driven by keyboard because the form item overlays its
        // hit area, and this doubles as the keyboard-reachability check.
        const consent = dialog.getByRole("checkbox").first();
        await consent.focus();
        await expect(consent).toBeFocused();
        await page.keyboard.press("Space");
        await dialog.getByRole("button", { name: /^Add Patient$/ }).click();

        const firstInvalid = dialog.locator('[aria-invalid="true"]').first();
        await expect(firstInvalid).toBeVisible();

        const describedBy = await firstInvalid.getAttribute("aria-describedby");
        expect(
          describedBy,
          "the invalid field must reference its error message",
        ).toBeTruthy();
        const errorText = await readDescribedError(
          page,
          describedBy ?? "",
        );
        expect(
          errorText,
          "the referenced error message must be visible",
        ).not.toBe("");

        // The bad field stays keyboard reachable and announces on focus.
        await firstInvalid.focus();
        await expect(firstInvalid).toBeFocused();
      });
    });

    test.describe(`invoices at ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      test("invoice list loads with a keyboard-reachable primary action", async ({
        page,
      }) => {
        await page.goto("/invoices", { waitUntil: "domcontentloaded" });

        const createInvoice = page.getByRole("button", {
          name: /Create Invoice/i,
        });
        await expect(createInvoice).toBeVisible({ timeout: 30_000 });
        // Below 768px the list is a card list, above it a real table; both
        // render the seeded record, so assert on the visible copy.
        await expect(
          page.getByText("X01 Flow Patient").filter({ visible: true }).first(),
        ).toBeVisible();
        await expect(
          page.getByText("₹4,200.00").filter({ visible: true }).first(),
        ).toBeVisible();
        await expectNoHorizontalOverflow(page);

        await createInvoice.focus();
        await expect(createInvoice).toBeFocused();
      });
    });

    test.describe(`documents at ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      test("renders the documents empty state and keeps the keyboard path to main", async ({
          page,
        }) => {
          await page.goto("/documents", { waitUntil: "domcontentloaded" });
          // There is no seedable upload route (only /uploads/session), and the
          // search bar only renders with rows, so this asserts the empty-state
          // contract plus keyboard reachability into the page.
          await expect(
            page.getByRole("heading", { name: "Documents", level: 1 }),
          ).toBeVisible({ timeout: 30_000 });
          await expect(page.getByText("No documents yet")).toBeVisible();
          await expectNoHorizontalOverflow(page);

          // The empty state carries no focusable control of its own, so this
          // asserts the page is keyboard-navigable: tabbing from the top of the
          // document must land on visible, named controls (page chrome and the
          // persistent Ask AI / consultation actions).
          await page.locator("body").click({ position: { x: 2, y: 2 } });
          const focusedNames: string[] = [];
          for (let i = 0; i < 12; i++) {
            await page.keyboard.press("Tab");
            const name = await page.evaluate(() => {
              const el = document.activeElement;
              if (!(el instanceof HTMLElement) || el === document.body) {
                return null;
              }
              return (
                el.getAttribute("aria-label") ??
                el.textContent?.trim().slice(0, 40) ??
                ""
              );
            });
            if (name !== null && name !== "") {
              focusedNames.push(name);
            }
          }
          expect(
            focusedNames.length,
            "tabbing must reach named controls",
          ).toBeGreaterThan(0);
          expect(
            focusedNames.some((name) => /consultation|navigation|palette|ask/i.test(name)),
            `expected a named action in the tab order, got: ${focusedNames.join(" | ")}`,
          ).toBe(true);
        });
    });
  }

  test.describe("record payment dialog", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("opens from the desk and keeps keyboard focus while open", async ({
      page,
    }) => {
      await page.goto("/desk/collect-payment", {
        waitUntil: "domcontentloaded",
      });
      const search = page.getByPlaceholder(
        "Search patient by name or phone",
      );
      await expect(search).toBeVisible({ timeout: 30_000 });
      await search.fill("X01");
      await page
        .getByRole("button", { name: /Select X01 Flow Patient/i })
        .click();

      const collect = page.getByRole("button", { name: /^Collect$/ });
      await expect(collect).toBeVisible({ timeout: 15_000 });
      await collect.click();

      const dialog = page.getByRole("dialog", {
        name: /Record desk payment/i,
      });
      await expect(dialog).toBeVisible();

      expect(
        await isFocusInsideDialog(page),
        "focus must move into the payment dialog",
      ).toBe(true);
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        expect(
          await isFocusInsideDialog(page),
          "focus must stay trapped inside the payment dialog",
        ).toBe(true);
      }

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });
  });
});
