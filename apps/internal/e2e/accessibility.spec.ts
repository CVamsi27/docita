import type { APIRequestContext } from "@playwright/test";
import { test } from "@playwright/test";
import { getViolations, injectAxe } from "axe-playwright";
import * as fs from "fs";
import * as path from "path";

const API_URL = "http://127.0.0.1:3001/api/v1";

// INTERNAL users are seeded (admin@docita.work / password123); they cannot be
// registered through the public API. Login below yields a real token so the
// protected pages render for the audit. If the seeded user is absent, the
// audit falls back to whatever each route renders (login redirect).
const INTERNAL_EMAIL = process.env["INTERNAL_E2E_EMAIL"] || "admin@docita.work";
const INTERNAL_PASSWORD = process.env["INTERNAL_E2E_PASSWORD"] || "password123";

const TOKEN_KEY = "docita_internal_token";
const USER_KEY = "docita_internal_user";

const AUDIT_PAGES = [
  { path: "/login", name: "Login" },
  { path: "/dashboard", name: "Dashboard" },
  { path: "/system-monitoring", name: "System Monitoring" },
  { path: "/users", name: "Users" },
  { path: "/admins", name: "Admins" },
];

interface SeededSession {
  token: string;
  user: { id: string; name: string; email: string; role: string };
}

async function seedInternalSession(
  request: APIRequestContext,
): Promise<SeededSession | null> {
  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email: INTERNAL_EMAIL, password: INTERNAL_PASSWORD },
  });
  if (!loginRes.ok()) {
    return null;
  }
  const data = (await loginRes.json()) as {
    access_token?: string;
    accessToken?: string;
    user?: { id?: string; name?: string; email?: string; role?: string };
  };
  const token = String(data.access_token || data.accessToken || "");
  const user = data.user;
  // Only seed the session for an INTERNAL user — the internal gate redirects
  // other roles to the main app, so the audit would silently measure the
  // login page while still reporting seeded: true.
  if (!token || !user?.id || user.role !== "INTERNAL") {
    return null;
  }
  return {
    token,
    user: {
      id: user.id,
      name: user.name || "Internal",
      email: user.email || INTERNAL_EMAIL,
      role: user.role,
    },
  };
}

test.describe("Accessibility Audit - Internal Admin App", () => {
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

  let session: SeededSession | null = null;

  test.beforeAll(async ({ request }) => {
    session = await seedInternalSession(request);
  });

  for (const pageConfig of AUDIT_PAGES) {
    test(`should audit ${pageConfig.name} page for accessibility violations`, async ({
      page,
    }) => {
      try {
        if (session) {
          await page.addInitScript(
            ({ token, user, tokenKey, userKey }) => {
              try {
                localStorage.setItem(tokenKey, token);
                localStorage.setItem(userKey, JSON.stringify(user));
              } catch {
                // ignore
              }
            },
            {
              token: session.token,
              user: session.user,
              tokenKey: TOKEN_KEY,
              userKey: USER_KEY,
            },
          );
        }

        await page.goto(pageConfig.path, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        await page.waitForLoadState("networkidle");
        await page.waitForLoadState("domcontentloaded");

        await page.evaluate(
          () => new Promise((resolve) => setTimeout(resolve, 500)),
        );

        await injectAxe(page);

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
        void error;
      }
    });
  }

  test.afterAll(async () => {
    const reportDir = path.join(process.cwd(), "accessibility-reports");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const reportPath = path.join(reportDir, `baseline-admin-${timestamp}.json`);

    let totalViolations = 0;
    let totalCritical = 0;
    let totalSerious = 0;

    for (const violations of Object.values(violationsByPage)) {
      totalViolations += violations.violationCount;
      totalCritical += violations.summary.critical;
      totalSerious += violations.summary.serious;
    }

    const report = {
      app: "internal-admin",
      timestamp: new Date().toISOString(),
      seeded: Boolean(session),
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
