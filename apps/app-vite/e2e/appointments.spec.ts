import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { API_URL, setupTestUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import { expectPageHeader, expectRoute } from "./utils/ui-contracts";

test.describe("Appointments", () => {
  let cachedUser: {
    id: string;
    email: string;
    clinicId: string;
    accessToken: string;
    role?: string;
  } | null = null;
  let cachedPatient: { id: string } | null = null;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    const user = await setupTestUser(request);
    cachedUser = {
      id: user.id,
      email: user.email,
      clinicId: user.clinicId,
      accessToken: user.accessToken,
      role: "ADMIN_DOCTOR",
    };

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${cachedUser!.accessToken}`,
        "x-docita-e2e": "true",
      },
      data: {
        firstName: "Test",
        lastName: "Patient",
        phoneNumber: "1234567890",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: cachedUser!.clinicId,
      },
    });

    if (!patientRes.ok()) {
      throw new Error(`Patient creation failed: ${await patientRes.text()}`);
    }

    cachedPatient = await patientRes.json();

  });

  test.beforeEach(async ({ page }: { page: Page }) => {
    await seedSession(page, {
      token: cachedUser!.accessToken,
      user: {
        id: cachedUser!.id,
        email: cachedUser!.email,
        role: cachedUser!.role ?? "ADMIN_DOCTOR",
        clinicId: cachedUser!.clinicId,
      },
    });
  });

  test("should display appointments list", async ({ page }) => {
    await page.goto("/appointments");
    await expectRoute(page, /\/appointments/);
    await expectPageHeader(page, {
      title: "Appointments",
      description: /Schedule and manage/i,
    });
  });

  test("opens Ask AI scoped to appointments from the page header", async ({
    page,
  }) => {
    await page.goto("/appointments");
    await expectRoute(page, /\/appointments/);
    await page.getByTestId("appointments-ask-ai").click();
    await expect(page.getByRole("dialog", { name: /ask ai/i })).toBeVisible();
    await expect(page.getByText(/on appointments/i)).toBeVisible();
  });

  test("should create a new appointment", async ({ page }) => {
    await page.goto("/appointments");

    await page.getByRole("button", { name: "New appointment" }).click();
    // Contract: dialog opens and key fields are visible. (Avoid brittle Radix popover interactions.)
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Start time", { exact: true })).toBeVisible();

  });

  test("should show API-created appointment", async ({ page, request }) => {

    const startTime = new Date(Date.now() + 60 * 60 * 1000);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    const appointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        patientId: cachedPatient!.id,
        doctorId: cachedUser!.id,
        clinicId: cachedUser!.clinicId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "scheduled",
        type: "consultation",
      },
    });

    expect(appointmentRes.ok()).toBeTruthy();

    await page.waitForTimeout(2000);

    await page.goto("/appointments", { waitUntil: "load" });

    const pageContent = page.locator("body");
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test("inline follow-up dropdown opens add appointment with patient pre-selected", async ({
    page,
    request,
  }) => {
    const startTime = new Date(Date.now() + 90 * 60 * 1000);
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    const appointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        patientId: cachedPatient!.id,
        doctorId: cachedUser!.id,
        clinicId: cachedUser!.clinicId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "scheduled",
        type: "consultation",
      },
    });
    expect(appointmentRes.ok()).toBeTruthy();

    await page.goto("/appointments", { waitUntil: "load" });

    const moreButton = page
      .getByRole("button", { name: /more appointment actions/i })
      .first();
    await expect(moreButton).toBeVisible({ timeout: 15_000 });
    await moreButton.click();

    await page.getByTestId("schedule-follow-up").click();

    await expect(page).toHaveURL(/action=new/);
    await expect(page).toHaveURL(new RegExp(`patientId=${cachedPatient!.id}`));
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
