import { expect, test } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";
import * as fs from "fs";
import * as path from "path";
import {
  API_URL,
  loginUser,
  setupTestUser,
  UserData,
} from "./utils/patient-helpers";

const PUBLIC_AUDIT_PAGES = [
  { path: "/", name: "Home" },
  { path: "/login", name: "Login" },
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

async function runAccessibilityAudit(
  page: import("@playwright/test").Page,
  targetPath: string,
  pageName: string,
) {
  await page.goto(targetPath, { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    () => new Promise((resolve) => setTimeout(resolve, 500)),
  );

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

  test.describe("Authenticated routes", () => {
    let user: UserData;
    let appointmentId: string;

    test.beforeAll(async ({ request }) => {
      user = await setupTestUser(request);

      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
        data: {
          firstName: "Axe",
          lastName: "Patient",
          phoneNumber: `97${Math.floor(Math.random() * 100000000)
            .toString()
            .padStart(8, "0")}`,
          gender: "MALE",
          dateOfBirth: "1990-01-01",
          clinicId: user.clinicId,
        },
      });
      expect(patientRes.ok()).toBeTruthy();
      const patient = await patientRes.json();

      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      const endTime = new Date(now);
      endTime.setMinutes(now.getMinutes() + 30);

      const apptRes = await request.post(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${user.accessToken}` },
        data: {
          patientId: patient.id,
          doctorId: user.id,
          clinicId: user.clinicId,
          startTime: now.toISOString(),
          endTime: endTime.toISOString(),
          type: "consultation",
          status: "scheduled",
        },
      });
      expect(apptRes.ok()).toBeTruthy();
      const appointment = await apptRes.json();
      appointmentId = appointment.id;
    });

    test.beforeEach(async ({ page }) => {
      await loginUser(page, user);
    });

    const staticAuthRoutes: { path: string; name: string }[] = [
      { path: "/dashboard", name: "Dashboard" },
      { path: "/today", name: "Today workspace" },
      { path: "/appointments", name: "Appointments" },
      { path: "/patients", name: "Patients" },
      { path: "/consultation", name: "Consultation queue" },
      { path: "/settings", name: "Settings" },
      {
        path: "/settings?tab=subscription",
        name: "Settings subscription tab",
      },
      { path: "/upgrade", name: "Upgrade" },
      { path: "/whatsapp", name: "WhatsApp inbox" },
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
