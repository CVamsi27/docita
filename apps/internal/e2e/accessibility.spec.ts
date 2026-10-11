import { expect, test, type BrowserContext } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  assertAccessibleViolations,
  requireInternalSession,
  scanAuditRoute,
} from "./utils/accessibility-audit";

const AUDIT_PAGES = [
  { path: "/login", name: "Login", heading: "Docita Internal" },
  { path: "/dashboard", name: "Dashboard", heading: "Dashboard" },
  { path: "/users", name: "Users", heading: "Team Members" },
  { path: "/doctors", name: "Doctors", heading: "Doctors" },
  { path: "/admins", name: "Admins", heading: "Admins" },
  { path: "/analytics", name: "Analytics", heading: "Analytics" },
  { path: "/performance", name: "Performance", heading: "Operational metrics" },
  { path: "/billing", name: "Billing", heading: "Billing Dashboard" },
  { path: "/pricing", name: "Pricing", heading: "Pricing Management" },
  { path: "/payment-processing", name: "Payment Processing", heading: "Payment Processing" },
  { path: "/audits", name: "Audits", heading: "Audit Logs" },
  { path: "/logs", name: "Logs", heading: "System Logs" },
  { path: "/broadcasts", name: "Broadcasts", heading: "Broadcasts" },
  { path: "/support", name: "Support", heading: "Support Hub" },
  { path: "/feedback", name: "Feedback", heading: "Feedback Portal" },
  { path: "/referrals", name: "Referrals", heading: "Referrals" },
  { path: "/leads", name: "Leads", heading: "Facility Leads" },
  { path: "/enterprise-contracts", name: "Enterprise Contracts", heading: "Enterprise Contracts" },
  { path: "/system-monitoring", name: "System Monitoring", heading: "System Monitoring" },
];

test.describe("Accessibility Audit - Internal Admin App", () => {
  let session: Awaited<ReturnType<BrowserContext["storageState"]>> | undefined;
  let authFailure =
    "Protected accessibility audit requires INTERNAL_E2E_EMAIL and INTERNAL_E2E_PASSWORD for a dedicated INTERNAL test account";
  test.beforeAll(async ({ browser }, testInfo) => {
    const email = process.env["INTERNAL_E2E_EMAIL"];
    const password = process.env["INTERNAL_E2E_PASSWORD"];
    if (!email || !password) return;
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    try {
      const page = await context.newPage();
      await page.goto("/login");
      await page.getByPlaceholder("Email", { exact: true }).fill(email);
      await page.getByPlaceholder("Password", { exact: true }).fill(password);
      const responsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith("/auth/login") &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Login", exact: true }).click();
      const response = await responsePromise;
      expect(
        response.ok(),
        `INTERNAL fixture login must succeed (HTTP ${response.status()})`,
      ).toBe(true);
      requireInternalSession(await response.json());
      await expect(page).toHaveURL((url) => url.pathname === "/dashboard");
      session = await context.storageState();
    } catch (error) {
      authFailure =
        error instanceof Error
          ? error.message
          : "INTERNAL fixture authentication failed";
    } finally {
      await context.close();
    }
  });
  const pages: Record<
    string,
    {
      pageName: string;
      status: "passed" | "failed";
      authenticated: boolean;
      violations?: Awaited<ReturnType<typeof scanAuditRoute>>;
    }
  > = {};

  for (const pageConfig of AUDIT_PAGES) {
    test(`should audit ${pageConfig.name} page for accessibility violations`, async ({
      page,
    }, testInfo) => {
      const result: (typeof pages)[string] = {
        pageName: pageConfig.name,
        status: "failed",
        authenticated: false,
      };
      pages[pageConfig.path] = result;
      if (pageConfig.path !== "/login") {
        if (!session) throw new Error(authFailure);
        await page.context().addCookies(session.cookies);
        await page.addInitScript((origins) => {
          const saved = origins.find(
            (entry) => entry.origin === window.location.origin,
          );
          for (const item of saved?.localStorage ?? [])
            localStorage.setItem(item.name, item.value);
        }, session.origins);
        result.authenticated = true;
      }

      await page.goto(pageConfig.path);
      result.violations = await scanAuditRoute(
        page,
        pageConfig.path,
        pageConfig.heading,
      );
      await testInfo.attach("accessibility-violations", {
        body: JSON.stringify(result.violations),
        contentType: "application/json",
      });
      assertAccessibleViolations(result.violations);
      result.status = "passed";
    });
  }

  test.afterAll(async ({ browserName }, testInfo) => {
    const reportDir = path.join(process.cwd(), "accessibility-reports");
    fs.mkdirSync(reportDir, { recursive: true });
    const scanned = Object.values(pages).filter(
      (page) => page.violations !== undefined,
    );
    const violations = scanned.flatMap((page) => page.violations ?? []);
    const report = {
      app: "internal-admin",
      browser: browserName,
      project: testInfo.project.name,
      worker: testInfo.workerIndex,
      timestamp: new Date().toISOString(),
      authenticatedPages: Object.values(pages).filter(
        (page) => page.authenticated,
      ).length,
      pages,
      summary: {
        plannedPages: AUDIT_PAGES.length,
        scannedPages: scanned.length,
        passedPages: Object.values(pages).filter(
          (page) => page.status === "passed",
        ).length,
        failedPages: Object.values(pages).filter(
          (page) => page.status === "failed",
        ).length,
        notRunPages: AUDIT_PAGES.length - Object.keys(pages).length,
        totalViolations: violations.length,
        criticalViolations: violations.filter(
          (violation) => violation.impact === "critical",
        ).length,
        seriousViolations: violations.filter(
          (violation) => violation.impact === "serious",
        ).length,
      },
    };
    fs.writeFileSync(
      path.join(
        reportDir,
        `baseline-admin-${testInfo.project.name}-worker-${testInfo.workerIndex}.json`,
      ),
      JSON.stringify(report, null, 2),
    );
  });
});
