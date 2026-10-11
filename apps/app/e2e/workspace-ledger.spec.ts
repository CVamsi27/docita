import { expect, test } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import {
  appointmentResponseSchema,
  createAppointmentRequestSchema,
  createInvoiceSchema,
  createPatientRequestSchema,
  createPrescriptionRequestSchema,
  DPDP_NOTICE_VERSION,
  invoiceSchema,
  listAppointmentsResponseSchema,
  patientResponseSchema,
  prescriptionResponseSchema,
  tokenIssueResponseSchema,
} from "@workspace/types";
import {
  API_URL,
  applyUserSession,
  fetchUserSession,
  setupTestUser,
  type UserData,
} from "./utils/patient-helpers";

// Outside a local test API, supply a dedicated synthetic clinician fixture.
const WORKSPACE_ROUTES = [
  "/today",
  "/dashboard",
  "/consultation",
  "/appointments",
  "/patients",
  "/prescriptions",
  "/invoices",
  "/invoices/new",
  "/insurance-claims",
  "/insurance-claims/new",
  "/lab-tests",
  "/inventory",
  "/documents",
  "/pharmacy",
  "/settings",
  "/settings/clinic",
  "/settings/team",
  "/settings/team/join-requests",
  "/settings/compliance",
  "/settings/compliance/consent-template",
  "/settings/whatsapp-sender",
  "/settings/templates",
  "/settings/appearance",
  "/settings/queue",
  "/settings/clinical",
  "/settings/security",
  "/settings/notifications",
  "/settings/danger-zone",
  "/settings/doctor-profile",
  "/settings/availability",
  "/settings/leave",
  "/settings/account",
  "/whatsapp",
  "/inbox",
  "/analytics",
  "/reports",
  "/coding-queue",
  "/daybook",
  "/desk/collect-payment",
  "/desk/floor",
  "/help",
  "/profile",
  "/templates",
  "/ai-assistant",
  "/billing-locked",
  "/upgrade",
  "/hospital/beds",
  "/referrals",
  "/specialty",
  "/specialty/dental-charts",
  "/follow-ups",
  "/import",
] as const;

test.describe("Workspace ledger route coverage", () => {
  let user: UserData;
  let tokens: Parameters<typeof applyUserSession>[2];
  let recordRoutes: string[];
  test.beforeAll(async ({ request }) => {
    const email = process.env["WORKSPACE_E2E_EMAIL"];
    const password = process.env["WORKSPACE_E2E_PASSWORD"];
    if (!email && !password) {
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(new URL(API_URL).hostname)
      ) {
        throw new Error(
          "Dedicated WORKSPACE_E2E_EMAIL and WORKSPACE_E2E_PASSWORD fixtures are required outside the local test API",
        );
      }
      user = await setupTestUser(request);
      tokens = await fetchUserSession(request, user);
      return;
    }
    if (!email || !password)
      throw new Error(
        "Both dedicated workspace fixture credentials are required",
      );
    const response = await request.post(`${API_URL}/auth/login`, {
      headers: { "x-docita-e2e": "true" },
      data: { email, password },
    });
    expect(response.ok()).toBe(true);
    const session = tokenIssueResponseSchema.parse(await response.json());
    if (!session.user.clinicId)
      throw new Error("Workspace fixture must belong to a clinic");
    user = {
      id: session.user.id,
      email,
      clinicId: session.user.clinicId,
      accessToken: session.access_token,
    };
    tokens = { accessToken: session.access_token, refreshToken: null };
  });

  test.describe("Populated record views", () => {
    test.beforeAll(async ({ request }) => {
      const postFixture = async (
        path: string,
        data: object,
      ): Promise<unknown> => {
        const response = await request.post(`${API_URL}${path}`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            "Idempotency-Key": randomUUID(),
          },
          data,
        });
        expect(
          response.ok(),
          `Synthetic ${path} fixture must succeed (HTTP ${response.status()})`,
        ).toBe(true);
        return response.json();
      };
      const patient = patientResponseSchema
        .pick({ id: true })
        .strip()
        .parse(
          await postFixture(
            "/patients",
            createPatientRequestSchema.parse({
              firstName: "Page Review",
              lastName: "Patient",
              gender: "FEMALE",
              dateOfBirth: "1990-01-01",
              clinicId: user.clinicId,
              phoneNumber: `99${Math.floor(Math.random() * 100000000)
                .toString()
                .padStart(8, "0")}`,
              dpdpConsent: {
                accepted: true,
                noticeVersion: DPDP_NOTICE_VERSION,
                givenByName: "Page Review Patient",
              },
            }),
          ),
        );
      const appointmentsResponse = await request.get(
        `${API_URL}/appointments?${new URLSearchParams({ doctorId: user.id, limit: "100" })}`,
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
      );
      expect(appointmentsResponse.ok()).toBe(true);
      const appointments = listAppointmentsResponseSchema.parse(
        await appointmentsResponse.json(),
      );
      expect(
        appointments.hasMore,
        "Dedicated record fixture calendar must fit in one page",
      ).toBe(false);
      const startTime = new Date(
        Math.max(
          Date.now() + 86400000,
          ...appointments.items.map(
            (item) => new Date(item.endTime).getTime() + 3600000,
          ),
        ),
      );
      const appointment = appointmentResponseSchema
        .pick({ id: true })
        .required()
        .parse(
          await postFixture(
            "/appointments",
            createAppointmentRequestSchema.parse({
              patientId: patient.id,
              doctorId: user.id,
              clinicId: user.clinicId,
              startTime: startTime.toISOString(),
              endTime: new Date(startTime.getTime() + 1800000).toISOString(),
              type: "consultation",
              status: "scheduled",
            }),
          ),
        );
      const started = await request.post(
        `${API_URL}/appointments/${appointment.id}/start-consultation`,
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } },
      );
      expect(started.ok()).toBe(true);
      const invoice = invoiceSchema
        .pick({ id: true })
        .required()
        .parse(
          await postFixture(
            "/invoices",
            createInvoiceSchema.parse({
              patientId: patient.id,
              appointmentId: appointment.id,
              status: "PENDING",
              total: 1500,
              items: [
                {
                  description: "Synthetic review consultation",
                  quantity: 1,
                  price: 1500,
                },
              ],
            }),
          ),
        );
      const prescription = prescriptionResponseSchema
        .pick({ id: true })
        .required()
        .parse(
          await postFixture(
            "/prescriptions",
            createPrescriptionRequestSchema.parse({
              patientId: patient.id,
              appointmentId: appointment.id,
              doctorId: user.id,
              medications: [
                {
                  name: "Synthetic review medication",
                  dosage: "Test only",
                  frequency: "Test only",
                  duration: "Test only",
                  route: "PO",
                },
              ],
            }),
          ),
        );
      recordRoutes = [
        `/patients/${patient.id}`,
        `/consultation/${appointment.id}`,
        `/prescriptions/${prescription.id}`,
        `/invoices/${invoice.id}`,
        `/invoices/${invoice.id}/edit`,
        "/insurance-claims/planned-record",
        "/insurance-claims/planned-record/edit",
      ];
    });
    for (const theme of ["light", "dark"] as const) {
      test(`populated record routes and patient sections fit in ${theme}`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(180_000);
        await page.emulateMedia({ colorScheme: theme });
        await applyUserSession(page, user, tokens);
        for (const route of recordRoutes) {
          await test.step(route, async () => {
            await page.goto(route);
            await expect(
              page.getByRole("heading", { level: 1 }).first(),
            ).toBeVisible();
            await expect(page.locator("html")).toHaveClass(
              theme === "dark" ? /dark/ : /^(?!.*dark)/,
            );
            await expect
              .poll(() =>
                page
                  .locator("main")
                  .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth + 1,
                  ),
              )
              .toBe(true);
            if (route.startsWith("/patients/")) {
              await expect(
                page.getByRole("tab", { name: "Records", exact: true }),
              ).toBeVisible();
              await page
                .getByRole("tab", { name: "Records", exact: true })
                .click();
              for (const name of [
                "History & allergies",
                "Vitals",
                "Prescriptions",
                "Labs",
                "Documents",
                "Referrals",
              ]) {
                await page.getByRole("tab", { name, exact: true }).click();
                await expect
                  .poll(
                    () =>
                      page
                        .locator("main")
                        .evaluate(
                          (element) =>
                            element.scrollWidth <= element.clientWidth + 1,
                        ),
                    { message: `Patient ${name} must stay contained` },
                  )
                  .toBe(true);
              }
            } else if (route.startsWith("/consultation/")) {
              await expect(
                page.getByRole("region", { name: "Consultation workspace" }),
              ).toBeVisible();
            } else if (route.startsWith("/insurance-claims/")) {
              await expect(
                page.getByText("Coming soon", { exact: true }).first(),
              ).toBeVisible();
            } else if (route.endsWith("/edit")) {
              const field = page
                .getByRole("textbox", {
                  name: "Description",
                  exact: true,
                })
                .first();
              await expect
                .poll(async () => (await field.boundingBox())?.width ?? 0, {
                  message: "Invoice description must remain readable",
                })
                .toBeGreaterThanOrEqual(240);
              await expect(field).toHaveValue("Synthetic review consultation");
            } else {
              await expect(
                page.getByText("Page Review Patient", { exact: true }).first(),
              ).toBeVisible();
            }
            await injectAxe(page);
            const violations = await getViolations(page);
            expect
              .soft(
                violations
                  .filter(
                    (violation) =>
                      violation.impact === "critical" ||
                      violation.impact === "serious",
                  )
                  .map((violation) => ({
                    id: violation.id,
                    nodes: violation.nodes.map(
                      ({ target, failureSummary, html }) => ({
                        target,
                        failureSummary,
                        html,
                      }),
                    ),
                  })),
                `${route} must have no serious or critical accessibility violations`,
              )
              .toEqual([]);
            const evidenceDir = process.env["WORKSPACE_QA_DIR"];
            if (evidenceDir)
              await page.screenshot({
                path: join(
                  evidenceDir,
                  `record-${recordRoutes.indexOf(route)}-${theme}-${testInfo.project.name}.png`,
                ),
              });
          });
        }
      });
    }
  });

  for (const theme of ["light", "dark"] as const) {
    test(`all static workspace routes remain readable in ${theme}`, async ({
      page,
      isMobile,
    }) => {
      test.setTimeout(300_000);
      await page.emulateMedia({ colorScheme: theme });
      await applyUserSession(page, user, tokens);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of WORKSPACE_ROUTES) {
        await test.step(route, async () => {
          await page.goto(route);
          await expect(page.locator("main.ui-workspace-ledger")).toBeVisible();
          await expect(
            page.getByRole("heading", { level: 1 }).first(),
          ).toBeVisible();
          await expect(page.locator("html")).toHaveClass(
            theme === "dark" ? /dark/ : /^(?!.*dark)/,
          );
          await expect
            .poll(
              () =>
                page
                  .locator("main")
                  .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth + 1,
                  ),
              { message: `${route} must contain its content at this viewport` },
            )
            .toBe(true);
          if (route === "/upgrade") {
            await expect(page).toHaveURL(
              (url) =>
                url.pathname === "/settings" &&
                url.searchParams.get("tab") === "subscription",
            );
            await expect(
              page.getByRole("heading", {
                level: 1,
                name: "Plan & Billing",
                exact: true,
              }),
            ).toBeVisible();
          }
          if (
            route === "/desk/floor" &&
            (await page.locator(".surface-warning").count()) > 0
          ) {
            await expect(page.locator(".surface-warning")).not.toHaveCSS(
              "background-color",
              "rgba(0, 0, 0, 0)",
            );
          }
          expect(
            errors,
            `${route} must render without uncaught errors`,
          ).toEqual([]);
        });
      }
      await page.goto("/settings");
      await page.getByRole("link", { name: /^Account / }).press("Enter");
      await expect(page).toHaveURL(
        (url) => url.pathname === "/settings/account",
      );
      await expect(
        page.getByRole("heading", { name: "Account", exact: true }),
      ).toBeVisible();
      if (!isMobile) {
        await expect(
          page.getByRole("button", { name: "Expand sidebar", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("img", { name: "Docita icon", exact: true }),
        ).toBeVisible();
        await expect(
          page
            .locator("aside")
            .getByRole("link", { name: "Settings", exact: true }),
        ).toBeVisible();
        await expect(
          page
            .locator("aside")
            .getByRole("button", { name: "Ask AI", exact: true }),
        ).toBeVisible();
      }
    });
  }
});
