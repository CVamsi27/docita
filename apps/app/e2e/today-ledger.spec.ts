import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  appointmentResponseSchema,
  patientResponseSchema,
  DPDP_NOTICE_VERSION,
} from "@workspace/types";
import {
  API_URL,
  setupTestUser,
  fetchUserSession,
  applyUserSession,
} from "./utils/patient-helpers";

test.describe("Today record ledger", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>>;
  let session: Awaited<ReturnType<typeof fetchUserSession>>;
  const appointments: string[] = [];

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request, { "x-ledger-fixture": randomUUID() });
    const headers = {
      Authorization: `Bearer ${user.accessToken}`,
      "x-docita-e2e": "true",
    };
    for (const [index, name] of ["Current", "Waiting"].entries()) {
      const patientResponse = await request.post(`${API_URL}/patients`, {
        headers,
        data: {
          firstName: "Ledger",
          lastName: name,
          phoneNumber: `97${Math.floor(Math.random() * 100000000)
            .toString()
            .padStart(8, "0")}`,
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          clinicId: user.clinicId,
          dpdpConsent: {
            accepted: true,
            noticeVersion: DPDP_NOTICE_VERSION,
            givenByName: `Ledger ${name}`,
          },
        },
      });
      expect(patientResponse.ok()).toBeTruthy();
      const patient = patientResponseSchema
        .pick({ id: true })
        .strip()
        .parse(await patientResponse.json());
      const start = new Date(Date.now() + index * 30 * 60_000);
      const response = await request.post(`${API_URL}/appointments`, {
        headers,
        data: {
          patientId: patient.id,
          doctorId: user.id,
          clinicId: user.clinicId,
          startTime: start.toISOString(),
          endTime: new Date(start.getTime() + 15 * 60_000).toISOString(),
          type: "consultation",
          status: "scheduled",
        },
      });
      expect(response.ok()).toBeTruthy();
      appointments.push(
        appointmentResponseSchema
          .pick({ id: true })
          .required()
          .strip()
          .parse(await response.json()).id,
      );
    }
    const response = await request.post(
      `${API_URL}/appointments/${appointments[0]}/start-consultation`,
      { headers },
    );
    expect(response.ok()).toBeTruthy();
    session = await fetchUserSession(request, user);
  });

  test.beforeEach(async ({ page }) => {
    await applyUserSession(page, user, session);
    await page.goto("/today");
    await expect(
      page.getByRole("heading", { name: "Queue", exact: true }),
    ).toBeVisible();
  });

  test("preview keeps the current encounter and restores mobile focus", async ({
    page,
  }) => {
    let starts = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/start-consultation")
      )
        starts++;
    });
    const view = page
      .getByRole("button", {
        name: "View appointment: Ledger Waiting",
        exact: true,
      })
      .filter({ visible: true });
    await view.click();
    const narrow = (page.viewportSize()?.width ?? 0) < 1280;
    const context = narrow
      ? page.getByRole("dialog", { name: "Selected appointment", exact: true })
      : page.getByRole("complementary", {
          name: "Selected appointment",
          exact: true,
        });
    await expect(
      context.getByRole("heading", { name: "Ledger Waiting", exact: true }),
    ).toBeVisible();
    await expect(
      context.getByRole("link", { name: "Continue consultation", exact: true }),
    ).toHaveCount(0);
    if (narrow) {
      await page.keyboard.press("Escape");
      await expect(context).not.toBeVisible();
      await expect(view).toBeFocused();
    } else {
      await context.getByRole("button", { name: /^Current visit/ }).click();
    }
    const current = page
      .getByRole("link", { name: "Continue consultation", exact: true })
      .filter({ visible: true });
    await expect(current).toHaveAttribute(
      "href",
      `/consultation/${appointments[0]}`,
    );
    expect(starts).toBe(0);
    await expect(
      page.getByRole("link", { name: "Start consultation", exact: true }),
    ).toHaveCount(0);
  });

  test("primary action and status retain semantic fills in both themes", async ({
    page,
  }) => {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.reload();
      await expect
        .poll(() =>
          page
            .locator("html")
            .evaluate((element) => element.classList.contains("dark")),
        )
        .toBe(theme === "dark");
      const action = page
        .getByRole("link", { name: "Continue consultation", exact: true })
        .filter({ visible: true });
      await expect(action).toBeVisible();
      const fill = await action.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          actual: style.backgroundColor,
          expected: style.getPropertyValue("--primary").trim(),
        };
      });
      expect(fill.actual).toBe(fill.expected);
      const badge = page
        .locator("#dashboard-queue .badge-processing")
        .filter({ visible: true })
        .first();
      const color = await badge.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          actual: style.color,
          expected: style.getPropertyValue("--processing").trim(),
        };
      });
      expect(color.actual).toBe(color.expected);
    }
  });

  test("Start next sends one mutation for the eligible appointment and opens its encounter", async ({
    page,
  }) => {
    let starts = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/start-consultation")
      )
        starts++;
    });
    const responsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname.endsWith(
          `/appointments/${appointments[1]}/start-consultation`,
        ),
    );
    await page
      .getByRole("button", {
        name: "Start next consultation: Ledger Waiting",
        exact: true,
      })
      .filter({ visible: true })
      .click();
    expect((await responsePromise).ok()).toBeTruthy();
    await expect(page).toHaveURL(
      (url) => url.pathname === `/consultation/${appointments[1]}`,
    );
    expect(starts).toBe(1);
  });
});
