import { test } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";
import * as fs from "fs";
import * as path from "path";

const AUDIT_PAGES = [
  { path: "/", name: "Home" },
  { path: "/dashboard", name: "Dashboard" },
  { path: "/appointments", name: "Appointments" },
  { path: "/patients", name: "Patients" },
];

test.describe("Accessibility Audit - Main App", () => {
  const violationsByPage: Record<
    string,
    {
      pageName: string;
      violationCount: number;
      violations: unknown[];
      summary: { critical: number; serious: number; moderate: number; minor: number };
    }
  > = {};

  for (const pageConfig of AUDIT_PAGES) {
    test(`should audit ${pageConfig.name} page for accessibility violations`, async ({
      page,
    }) => {

      await page.goto(pageConfig.path, { waitUntil: "networkidle" });

      await page.waitForLoadState("networkidle");
      await page.waitForLoadState("domcontentloaded");

      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      await injectAxe(page);

      try {
        const violations = await getViolations(page);

        violationsByPage[pageConfig.path] = {
          pageName: pageConfig.name,
          violationCount: violations.length,
          violations: violations,
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

        

      } catch (error) {

      }
    });
  }

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

    for (const violations of Object.values(violationsByPage) as Array<{
      violationCount: number;
      summary: { critical: number; serious: number };
    }>) {
      totalViolations += violations.violationCount;
      totalCritical += violations.summary.critical;
      totalSerious += violations.summary.serious;
    }

    const report = {
      app: "app",
      timestamp: new Date().toISOString(),
      pages: violationsByPage,
      summary: {
        totalPages: AUDIT_PAGES.length,
        totalViolations,
        criticalViolations: totalCritical,
        seriousViolations: totalSerious,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
  });
});
