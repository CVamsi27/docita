import type { APIRequestContext, Page } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";
import { expect, test as base } from "@playwright/test";
import {
  createPatientRequestSchema,
  DPDP_NOTICE_VERSION,
  listPatientsResponseSchema,
  patientResponseSchema,
} from "@workspace/types";
import {
  API_URL,
  createUniqueClientIp,
  loginUser,
  patientDetailPath,
  setupTestUser,
  type UserData,
} from "./utils/patient-helpers";

const test = base.extend<{ doctor: UserData }>({
  doctor: async ({ request }, provideFixture) => {
    await provideFixture(
      await setupTestUser(request, {
        "X-Forwarded-For": createUniqueClientIp(),
      }),
    );
  },
});

async function createPatient(
  request: APIRequestContext,
  doctor: UserData,
  firstName: string,
) {
  const response = await request.post(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${doctor.accessToken}` },
    data: createPatientRequestSchema.parse({
      firstName,
      lastName: "Patient",
      phoneNumber: "9896543411",
      gender: "FEMALE",
      dateOfBirth: "1990-05-15",
      clinicId: doctor.clinicId,
      dpdpConsent: {
        accepted: true,
        noticeVersion: DPDP_NOTICE_VERSION,
        relation: "SELF",
      },
    }),
  });
  expect(
    response.ok(),
    `Patient fixture returned HTTP ${response.status()}`,
  ).toBe(true);
  const patient = patientResponseSchema.parse(await response.json());
  expect(patient.clinicId).toBe(doctor.clinicId);
  return patient;
}

async function openPatients(page: Page, doctor: UserData) {
  await loginUser(page, doctor);
  await page.goto("/patients");
  await expect(page).toHaveURL(/\/patients$/);
  await expect(
    page.getByRole("main").getByRole("heading", {
      level: 1,
      name: "Patients",
      exact: true,
    }),
  ).toBeVisible();
}

async function openAddPatient(page: Page) {
  await page
    .getByRole("main")
    .getByRole("button", { name: "Add Patient", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add New Patient" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Patient Management", () => {
  test("creates a patient with consent and persists the selected identity", async ({
    page,
    request,
    doctor,
  }) => {
    await openPatients(page, doctor);
    await expect(
      page.getByText("No patients yet", { exact: true }),
    ).toBeVisible();
    const dialog = await openAddPatient(page);
    await dialog.getByLabel(/First Name/).fill("John");
    await dialog.getByLabel(/Last Name/).fill("Patient");
    await dialog.getByLabel("Phone", { exact: true }).fill("9996543410");
    await dialog.getByRole("combobox", { name: /Gender/ }).click();
    await page.getByRole("option", { name: "Female", exact: true }).click();
    await dialog.getByLabel(/Date of Birth/).click();
    const calendar = page.locator('[data-slot="calendar"]');
    await calendar
      .getByRole("combobox", { name: "Choose the Year" })
      .selectOption("1990");
    await calendar
      .getByRole("combobox", { name: "Choose the Month" })
      .selectOption("4");
    await calendar.locator('button[data-day="1990-05-15"]').click();
    const save = dialog.getByRole("button", {
      name: "Add Patient",
      exact: true,
    });
    await expect(save).toBeDisabled();
    await dialog.getByRole("checkbox", { name: /I confirm DPDP/ }).check();
    await expect(save).toBeEnabled();
    const savedResponse = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith("/patients"),
    );
    await save.click();
    const response = await savedResponse;
    expect(response.ok()).toBe(true);
    const saved = patientResponseSchema.parse(await response.json());
    expect(saved).toMatchObject({
      firstName: "John",
      lastName: "Patient",
      gender: "FEMALE",
      clinicId: doctor.clinicId,
    });
    expect(new Date(saved.dateOfBirth ?? "").toISOString().slice(0, 10)).toBe(
      "1990-05-15",
    );
    await expect(dialog).not.toBeVisible();
    await expect(
      page
        .getByText("John Patient", { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    const persistedResponse = await request.get(
      `${API_URL}/patients/${saved.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );
    expect(persistedResponse.ok()).toBe(true);
    expect(
      patientResponseSchema.parse(await persistedResponse.json()),
    ).toMatchObject({
      id: saved.id,
      firstName: "John",
      lastName: "Patient",
      gender: "FEMALE",
      clinicId: doctor.clinicId,
      dateOfBirth: saved.dateOfBirth,
    });
  });

  test("opens the saved patient from the list", async ({
    page,
    request,
    doctor,
  }) => {
    const patient = await createPatient(request, doctor, "Jane");
    await openPatients(page, doctor);
    await page
      .getByText("Jane Patient", { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/patients/${patient.id}$`));
    await expect(
      page
        .getByRole("main")
        .getByRole("heading", { name: "Patient, Jane", level: 1 }),
    ).toBeVisible();
  });

  test("searches patients and recovers from an empty search", async ({
    page,
    request,
    doctor,
  }) => {
    await createPatient(request, doctor, "Searchable");
    await openPatients(page, doctor);
    const search = page.getByPlaceholder("Enter name or phone");
    await expect(search).toBeVisible();
    await search.fill("Searchable");
    await expect(
      page
        .getByText("Searchable Patient", { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await search.fill("NoSuchPatient");
    await expect(
      page
        .getByText("No patients found", { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText("Searchable Patient", { exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(search).toHaveValue("");
    await expect(
      page
        .getByText("Searchable Patient", { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  test("requires consent and displays field errors without saving", async ({
    page,
    doctor,
  }) => {
    await openPatients(page, doctor);
    const dialog = await openAddPatient(page);
    const save = dialog.getByRole("button", {
      name: "Add Patient",
      exact: true,
    });
    await expect(save).toBeDisabled();
    await dialog.getByRole("checkbox", { name: /I confirm DPDP/ }).check();
    await save.click();
    await expect(
      dialog.getByText("Enter the patient's first name", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Enter the patient's last name", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Date of birth must be in the past", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByLabel(/First Name/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    const response = await page.request.get(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });
    expect(response.ok()).toBe(true);
    expect(
      listPatientsResponseSchema.parse(await response.json()),
    ).toMatchObject({ items: [], total: 0 });
  });

  test("isolates patient records between clinics in the API and UI", async ({
    page,
    request,
    doctor,
  }) => {
    const patient = await createPatient(request, doctor, "ClinicA");
    const otherDoctor = await setupTestUser(request, {
      "X-Forwarded-For": createUniqueClientIp(),
    });
    expect(otherDoctor.clinicId).not.toBe(doctor.clinicId);
    const denied = await request.get(`${API_URL}/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${otherDoctor.accessToken}` },
    });
    expect([403, 404]).toContain(denied.status());
    await openPatients(page, otherDoctor);
    await expect(
      page.getByText("No patients yet", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("ClinicA Patient", { exact: true }),
    ).toHaveCount(0);
    const response = await request.get(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${otherDoctor.accessToken}` },
    });
    expect(response.ok()).toBe(true);
    expect(
      listPatientsResponseSchema.parse(await response.json()),
    ).toMatchObject({ items: [], total: 0 });
  });

  test("shows a list failure and recovers after retry", async ({
    page,
    request,
    doctor,
  }) => {
    await createPatient(request, doctor, "Recovery");
    await loginUser(page, doctor);
    const patientsList = /\/api\/v1\/patients(?:\?.*)?$/;
    await page.route(patientsList, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      await route.fulfill({
        status: 503,
        contentType: "application/problem+json",
        body: JSON.stringify({
          title: "Service Unavailable",
          status: 503,
          detail: "Patients temporarily unavailable",
        }),
      });
    });
    await page.goto("/patients");
    const retry = page.getByRole("button", { name: /retry|try again/i });
    await expect(retry).toBeVisible({ timeout: 35_000 });
    await expect(
      page.getByText("No patients yet", { exact: true }),
    ).toHaveCount(0);
    await page.unroute(patientsList);
    await retry.click();
    await expect(
      page
        .getByText("Recovery Patient", { exact: true })
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  test("opens contextual AI and restores focus to the patient action", async ({
    page,
    request,
    doctor,
  }) => {
    const patient = await createPatient(request, doctor, "AskAi");
    await loginUser(page, doctor);
    await page.goto(patientDetailPath(patient.id));
    await expect(
      page.getByRole("heading", { name: "Patient, AskAi", level: 1 }),
    ).toBeVisible();
    const action = page.getByTestId("patient-ask-ai");
    await expect(action).toBeVisible();
    await injectAxe(page);
    expect(await getViolations(page, '[data-testid="patient-ask-ai"]')).toEqual(
      [],
    );
    await action.click();
    const dialog = page.getByRole("dialog", { name: /ask ai/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/on AskAi Patient/i)).toBeVisible();
    await expect(
      dialog.getByText(/AI suggestions are not medical advice/i),
    ).toBeVisible();
    await expect
      .poll(() =>
        dialog.evaluate((element) =>
          element
            .getAnimations({ subtree: true })
            .every((animation) => animation.playState !== "running"),
        ),
      )
      .toBe(true);
    expect(await getViolations(page, '[role="dialog"]')).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(action).toBeFocused();
  });
});
