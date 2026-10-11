import { expect, test } from "@playwright/test";
import { tokenIssueResponseSchema } from "@workspace/types";
import { API_URL, applyUserSession, fetchUserSession, setupTestUser, type UserData } from "./utils/patient-helpers";

// Outside a local test API, supply a dedicated synthetic clinician fixture.
const WORKSPACE_ROUTES = [
  "/today",
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
  test.beforeAll(async ({ request }) => {
    const email = process.env["WORKSPACE_E2E_EMAIL"];
    const password = process.env["WORKSPACE_E2E_PASSWORD"];
    if (!email && !password) {
      if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(API_URL).hostname)) {
        throw new Error("Dedicated WORKSPACE_E2E_EMAIL and WORKSPACE_E2E_PASSWORD fixtures are required outside the local test API");
      }
      user = await setupTestUser(request);
      tokens = await fetchUserSession(request, user);
      return;
    }
    if (!email || !password) throw new Error("Both dedicated workspace fixture credentials are required");
    const response = await request.post(`${API_URL}/auth/login`, {
      headers: { "x-docita-e2e": "true" }, data: { email, password },
    });
    expect(response.ok()).toBe(true);
    const session = tokenIssueResponseSchema.parse(await response.json());
    if (!session.user.clinicId) throw new Error("Workspace fixture must belong to a clinic");
    user = { id: session.user.id, email, clinicId: session.user.clinicId, accessToken: session.access_token };
    tokens = { accessToken: session.access_token, refreshToken: null };
  });

  for (const theme of ["light", "dark"] as const) {
    test(`all static workspace routes remain readable in ${theme}`, async ({ page, isMobile }) => {
      test.setTimeout(300_000);
      await page.emulateMedia({ colorScheme: theme });
      await applyUserSession(page, user, tokens);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of WORKSPACE_ROUTES) {
        await test.step(route, async () => {
          await page.goto(route);
          await expect(page.locator("main.ui-workspace-ledger")).toBeVisible();
          await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
          await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
          await expect.poll(() => page.locator("main").evaluate((element) => element.scrollWidth <= element.clientWidth + 1), { message: `${route} must contain its content at this viewport` }).toBe(true);
          if (route === "/desk/floor" && await page.locator(".surface-warning").count() > 0) {
            await expect(page.locator(".surface-warning")).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
          }
          expect(errors, `${route} must render without uncaught errors`).toEqual([]);
        });
      }
      await page.goto("/settings");
      await page.getByRole("link", { name: /^Account / }).press("Enter");
      await expect(page).toHaveURL((url) => url.pathname === "/settings/account");
      await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
      if (!isMobile) {
        await expect(page.getByRole("button", { name: "Expand sidebar", exact: true })).toBeVisible();
        await expect(page.getByRole("img", { name: "Docita icon", exact: true })).toBeVisible();
        await expect(page.locator("aside").getByRole("link", { name: "Settings", exact: true })).toBeVisible();
        await expect(page.locator("aside").getByRole("button", { name: "Ask AI", exact: true })).toBeVisible();
      }
    });
  }
});
