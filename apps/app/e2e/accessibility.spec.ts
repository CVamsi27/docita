import { expect, test } from "@playwright/test";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { getViolations, injectAxe } from "axe-playwright";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  API_URL,
  loginUser,
  setupTestUser,
  UserData,
} from "./utils/patient-helpers";
import { VIEWPORT_PRESETS } from "./utils/viewport-presets";

const RESPONSIVE_A11Y_ROUTES = [
  { path: "/today", name: "Today workspace" },
  { path: "/patients", name: "Patients" },
  { path: "/appointments", name: "Appointments" },
  { path: "/prescriptions", name: "Prescriptions" },
  { path: "/settings", name: "Settings" },
] as const;

const PUBLIC_AUDIT_PAGES = [
  { path: "/", name: "Home" },
  { path: "/login", name: "Login" },
  /** Referral segment is arbitrary; page resolves to error DataState when API has no clinic. */
  { path: "/book/accessibility-audit-placeholder", name: "Public booking" },
] as const;

const violationsByPage: Record<
  string,
  {
    pageName: string;
    violationCount: number;
    violations: unknown[];
    summary: {
      critical: number;
      serious: number;
      moderate: number;
      minor: number;
    };
  }
> = {};

function e2eAuthHeaders(user: UserData) {
  return {
    Authorization: `Bearer ${user.accessToken}`,
    "x-docita-e2e": "true",
  };
}

function createAccessibilityAppointmentWindow() {
  const halfHourSlotsInNextYear = 365 * 24 * 2;
  const slotOffset =
    Number.parseInt(randomUUID().replaceAll("-", "").slice(0, 8), 16) %
    halfHourSlotsInNextYear;
  const startTime = new Date();
  startTime.setUTCSeconds(0, 0);
  startTime.setUTCMinutes(startTime.getUTCMinutes() + 15 + slotOffset * 30);

  return {
    startTime,
    endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
  };
}

async function runAccessibilityAudit(
  page: import("@playwright/test").Page,
  targetPath: string,
  pageName: string,
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.goto(targetPath, { waitUntil: "networkidle" });
      await page.waitForLoadState("domcontentloaded");
      await page.waitForURL(
        (url) => url.pathname === targetPath.split("?")[0],
        {
          timeout: 15_000,
        },
      );
      await page.waitForLoadState("networkidle");
      await page.locator("body").waitFor({ state: "visible", timeout: 15_000 });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForTimeout(1000);
    }
  }

  await injectAxe(page);

  const violations = await getViolations(page);

  violationsByPage[targetPath] = {
    pageName,
    violationCount: violations.length,
    violations,
    summary: {
      critical: violations.filter(
        (v: { impact?: string | null }) => v.impact === "critical",
      ).length,
      serious: violations.filter(
        (v: { impact?: string | null }) => v.impact === "serious",
      ).length,
      moderate: violations.filter(
        (v: { impact?: string | null }) => v.impact === "moderate",
      ).length,
      minor: violations.filter(
        (v: { impact?: string | null }) => v.impact === "minor",
      ).length,
    },
  };

  await expect(page.locator("body")).toBeVisible();
}

test.describe("Accessibility Audit - Main App", () => {
  test.describe("Public routes", () => {
    for (const pageConfig of PUBLIC_AUDIT_PAGES) {
      test(`should audit ${pageConfig.name} (${pageConfig.path})`, async ({
        page,
      }) => {
        await runAccessibilityAudit(page, pageConfig.path, pageConfig.name);
      });
    }
  });

  test.describe("Authenticated routes at mobile width (390px)", () => {
    test.use({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });

    test.skip(
      process.env.AUDIT_APP_PUBLIC_ONLY === "true",
      "AUDIT_APP_PUBLIC_ONLY=true skips routes that need DATABASE_URL and API fixtures",
    );

    let user: UserData;
    let appointmentId: string;

    test.beforeAll(async ({ request }) => {
      user = await setupTestUser(request);

      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: e2eAuthHeaders(user),
        data: {
          firstName: "MobileAxe",
          lastName: "Patient",
          phoneNumber: `96${Math.floor(Math.random() * 100000000)
            .toString()
            .padStart(8, "0")}`,
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          clinicId: user.clinicId,
          dpdpConsent: {
            accepted: true,
            noticeVersion: DPDP_NOTICE_VERSION,
            givenByName: "MobileAxe Patient",
          },
        },
      });
      await expect(
        patientRes.ok(),
        `Patient setup failed: ${patientRes.status()} ${await patientRes.text()}`,
      ).toBeTruthy();
      const patient = await patientRes.json();

      const { startTime, endTime } = createAccessibilityAppointmentWindow();

      const apptRes = await request.post(`${API_URL}/appointments`, {
        headers: e2eAuthHeaders(user),
        data: {
          patientId: patient.id,
          doctorId: user.id,
          clinicId: user.clinicId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          type: "consultation",
          status: "scheduled",
        },
      });
      await expect(
        apptRes.ok(),
        `Appointment setup failed: ${apptRes.status()} ${await apptRes.text()}`,
      ).toBeTruthy();
      const appointment = await apptRes.json();
      appointmentId = appointment.id;
    });

    test.beforeEach(async ({ page }) => {
      await loginUser(page, user);
    });

    const mobileAuthRoutes: { path: string; name: string }[] = [
      { path: "/today", name: "Today workspace" },
      { path: "/patients", name: "Patients" },
      { path: "/appointments", name: "Appointments" },
      { path: "/settings", name: "Settings" },
      { path: "/documents", name: "Documents" },
      { path: "/prescriptions", name: "Prescriptions" },
      { path: "/invoices", name: "Invoices" },
      { path: "/lab-tests", name: "Lab tests" },
      { path: "/inventory", name: "Inventory" },
      { path: "/inbox", name: "Inbox" },
      { path: "/whatsapp", name: "WhatsApp" },
    ];

    for (const route of mobileAuthRoutes) {
      test(`should audit ${route.name} at mobile width (${route.path})`, async ({
        page,
      }) => {
        await runAccessibilityAudit(page, route.path, `${route.name} (mobile)`);
      });
    }

    test(`should audit Consultation workspace at mobile width (/consultation/[id])`, async ({
      page,
    }) => {
      const detailPath = `/consultation/${appointmentId}`;
      await runAccessibilityAudit(
        page,
        detailPath,
        "Consultation detail (mobile)",
      );
    });
  });

  for (const [presetName, viewport] of [
    ["tablet", VIEWPORT_PRESETS.tablet] as const,
    ["laptop", VIEWPORT_PRESETS.laptop] as const,
  ]) {
    test.describe(`Authenticated routes at ${presetName} width`, () => {
      test.use({
        viewport,
        ...(presetName === "tablet" ? { hasTouch: true } : {}),
      });

      test.skip(
        process.env.AUDIT_APP_PUBLIC_ONLY === "true",
        "AUDIT_APP_PUBLIC_ONLY=true skips routes that need DATABASE_URL and API fixtures",
      );

      let user: UserData;

      test.beforeAll(async ({ request }) => {
        user = await setupTestUser(request);
      });

      test.beforeEach(async ({ page }) => {
        await loginUser(page, user);
      });

      for (const route of RESPONSIVE_A11Y_ROUTES) {
        test(`should audit ${route.name} at ${presetName} width (${route.path})`, async ({
          page,
        }) => {
          await runAccessibilityAudit(
            page,
            route.path,
            `${route.name} (${presetName})`,
          );
        });
      }
    });
  }

  test.describe("Authenticated routes", () => {
    test.skip(
      process.env.AUDIT_APP_PUBLIC_ONLY === "true",
      "AUDIT_APP_PUBLIC_ONLY=true skips routes that need DATABASE_URL and API fixtures",
    );

    let user: UserData;
    let appointmentId: string;

    test.beforeAll(async ({ request }) => {
      user = await setupTestUser(request);

      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: e2eAuthHeaders(user),
        data: {
          firstName: "Axe",
          lastName: "Patient",
          phoneNumber: `97${Math.floor(Math.random() * 100000000)
            .toString()
            .padStart(8, "0")}`,
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          clinicId: user.clinicId,
          dpdpConsent: {
            accepted: true,
            noticeVersion: DPDP_NOTICE_VERSION,
            givenByName: "Axe Patient",
          },
        },
      });
      await expect(
        patientRes.ok(),
        `Patient setup failed: ${patientRes.status()} ${await patientRes.text()}`,
      ).toBeTruthy();
      const patient = await patientRes.json();

      const { startTime, endTime } = createAccessibilityAppointmentWindow();

      const apptRes = await request.post(`${API_URL}/appointments`, {
        headers: e2eAuthHeaders(user),
        data: {
          patientId: patient.id,
          doctorId: user.id,
          clinicId: user.clinicId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          type: "consultation",
          status: "scheduled",
        },
      });
      await expect(
        apptRes.ok(),
        `Appointment setup failed: ${apptRes.status()} ${await apptRes.text()}`,
      ).toBeTruthy();
      const appointment = await apptRes.json();
      appointmentId = appointment.id;
    });

    test.beforeEach(async ({ page }) => {
      await loginUser(page, user);
    });

    const staticAuthRoutes: { path: string; name: string }[] = [
      { path: "/today", name: "Today workspace" },
      { path: "/appointments", name: "Appointments" },
      { path: "/patients", name: "Patients" },
      { path: "/consultation", name: "Consultation queue" },
      { path: "/settings", name: "Settings" },
      {
        path: "/settings?tab=subscription",
        name: "Settings subscription tab",
      },
      { path: "/whatsapp", name: "WhatsApp" },
      { path: "/desk/collect-payment", name: "Collect payment" },
      { path: "/daybook", name: "Daybook" },
      { path: "/referrals", name: "Referrals" },
      { path: "/follow-ups", name: "Follow-ups" },
      { path: "/analytics", name: "Analytics" },
      { path: "/import", name: "Import" },
      { path: "/help", name: "Help" },
    ];

    for (const route of staticAuthRoutes) {
      test(`should audit ${route.name} (${route.path})`, async ({ page }) => {
        await runAccessibilityAudit(page, route.path, route.name);
      });
    }

    test(`should audit Consultation workspace (/consultation/[id])`, async ({
      page,
    }) => {
      const detailPath = `/consultation/${appointmentId}`;
      await runAccessibilityAudit(page, detailPath, "Consultation detail");
    });
  });

  test.afterAll(async () => {
    const reportDir = path.join(process.cwd(), "accessibility-reports");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const reportPath = path.join(reportDir, `baseline-app-${timestamp}.json`);

    let totalViolations = 0;
    let totalCritical = 0;
    let totalSerious = 0;

    for (const violations of Object.values(violationsByPage)) {
      totalViolations += violations.violationCount;
      totalCritical += violations.summary.critical;
      totalSerious += violations.summary.serious;
    }

    const report = {
      app: "app",
      timestamp: new Date().toISOString(),
      pages: violationsByPage,
      summary: {
        totalPages: Object.keys(violationsByPage).length,
        totalViolations,
        criticalViolations: totalCritical,
        seriousViolations: totalSerious,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  });
});
