import { expect, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api/v1";

const INTERNAL_EMAIL =
  process.env["INTERNAL_E2E_EMAIL"] || "admin@docita.work";
const INTERNAL_PASSWORD =
  process.env["INTERNAL_E2E_PASSWORD"] || "password123";

const TOKEN_KEY = "docita_internal_token";
const USER_KEY = "docita_internal_user";

interface SeededSession {
  token: string;
  user: { id: string; name: string; email: string; role: string };
}

/**
 * Seed a real session via the API so browser tests can exercise protected
 * pages without going through the login form on every test. Falls back to
 * null when the seeded INTERNAL user is absent.
 */
async function seedSession(
  request: import("@playwright/test").APIRequestContext,
): Promise<SeededSession | null> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email: INTERNAL_EMAIL, password: INTERNAL_PASSWORD },
  });
  if (!res.ok()) return null;

  const data = (await res.json()) as {
    access_token?: string;
    user?: { id?: string; name?: string; email?: string; role?: string };
  };
  const token = String(data.access_token || "");
  if (!token || !data.user?.id || data.user.role !== "INTERNAL") return null;

  return {
    token,
    user: {
      id: data.user.id,
      name: data.user.name || "Internal",
      email: data.user.email || INTERNAL_EMAIL,
      role: data.user.role,
    },
  };
}

/**
 * Inject the seeded session into localStorage before navigating so the
 * app's auth gate recognises the user as logged in.
 */
async function injectSession(
  page: import("@playwright/test").Page,
  session: SeededSession,
) {
  await page.addInitScript(
    ({ token, user, tokenKey, userKey }) => {
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(userKey, JSON.stringify(user));
    },
    { token: session.token, user: session.user, tokenKey: TOKEN_KEY, userKey: USER_KEY },
  );
}

function guard(
  session: SeededSession | null,
): asserts session is SeededSession {
  test.skip(
    !session,
    "Seeded INTERNAL user unavailable — run the API seed first",
  );
}

// ── Login page (unauthenticated) ─────────────────────────────────────────────

test.describe("Internal Admin - Login Page", () => {
  test("renders the login form with email and password fields", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in|log in|login/i }),
    ).toBeVisible();
  });

  test("shows error toast on invalid credentials", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    await page.getByLabel(/email/i).fill("nonexistent@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    await expect(
      page.getByText(/sign you in|invalid|check your details/i),
    ).toBeVisible({ timeout: 15000 });
  });

  test("redirects to /dashboard when already authenticated", async ({
    page,
    request,
  }) => {
    const session = await seedSession(request);
    test.skip(!session, "Seeded INTERNAL user unavailable");

    await injectSession(page, session);
    await page.goto("/login", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

// ── Protected pages (authenticated) ──────────────────────────────────────────

test.describe("Internal Admin - Protected Pages", () => {
  let session: SeededSession | null = null;

  test.beforeAll(async ({ request }) => {
    session = await seedSession(request);
  });

  const PAGES = [
    { path: "/dashboard", name: "Dashboard", heading: /dashboard/i },
    { path: "/users", name: "Users", heading: /users/i },
    { path: "/doctors", name: "Doctors", heading: /doctors/i },
    { path: "/billing", name: "Billing", heading: /billing/i },
    { path: "/pricing", name: "Pricing", heading: /pricing/i },
    { path: "/analytics", name: "Analytics", heading: /analytics/i },
    { path: "/admins", name: "Admins", heading: /admins/i },
    { path: "/logs", name: "Logs", heading: /logs/i },
    { path: "/system-monitoring", name: "System Monitoring", heading: /monitor|system/i },
  ];

  for (const { path, name } of PAGES) {
    test(`${name} page loads and shows content`, async ({ page }) => {
      guard(session);
      await injectSession(page, session);

      await page.goto(path, { waitUntil: "networkidle" });

      // Should stay on the target page (not redirect to login)
      await expect(page).toHaveURL(new RegExp(path));

      // Page should render a heading or meaningful content
      const hasHeading = await page
        .getByRole("heading", { level: 1 })
        .first()
        .isVisible()
        .catch(() => false);
      const hasContent = await page.locator("main, #main-content, [role='main']").first().isVisible().catch(() => false);

      expect(hasHeading || hasContent).toBeTruthy();
    });
  }

  test("redirects to /login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Unauthenticated user should land on /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("root path redirects to /dashboard", async ({ page, request }) => {
    const s = await seedSession(request);
    test.skip(!s, "Seeded INTERNAL user unavailable");

    await injectSession(page, s);
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });
});

// ── Sidebar navigation ───────────────────────────────────────────────────────

test.describe("Internal Admin - Sidebar Navigation", () => {
  let session: SeededSession | null = null;

  test.beforeAll(async ({ request }) => {
    session = await seedSession(request);
  });

  test("sidebar contains all navigation sections", async ({ page }) => {
    guard(session);
    await injectSession(page, session);

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Check that key nav items are visible in the sidebar
    const nav = page.locator("aside nav, aside");
    for (const label of ["Dashboard", "Users", "Billing", "Logs"]) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("clicking a nav item navigates to the correct page", async ({
    page,
  }) => {
    guard(session);
    await injectSession(page, session);

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Click "Users" in the sidebar
    await page.locator("aside").getByText("Users", { exact: true }).click();

    await expect(page).toHaveURL(/\/users/, { timeout: 15000 });
  });

  test("sidebar collapse/expand toggles labels", async ({ page }) => {
    guard(session);
    await injectSession(page, session);

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const sidebar = page.locator("aside");

    // Labels should be visible when expanded
    await expect(sidebar.getByText("Dashboard", { exact: true })).toBeVisible();

    // Click collapse button
    const toggleBtn = page.getByRole("button", {
      name: /collapse sidebar/i,
    });
    await toggleBtn.click();

    // Labels should be hidden when collapsed
    await expect(
      sidebar.getByText("Dashboard", { exact: true }),
    ).not.toBeVisible();

    // Click expand button
    await page
      .getByRole("button", { name: /expand sidebar/i })
      .click();

    // Labels should be visible again
    await expect(sidebar.getByText("Dashboard", { exact: true })).toBeVisible();
  });
});

// ── Logout flow ──────────────────────────────────────────────────────────────

test.describe("Internal Admin - Logout", () => {
  let session: SeededSession | null = null;

  test.beforeAll(async ({ request }) => {
    session = await seedSession(request);
  });

  test("signing out redirects to /login", async ({ page }) => {
    guard(session);
    await injectSession(page, session);

    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Click Sign Out button in sidebar
    await page.locator("aside").getByText("Sign Out").click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });
});
