import { expect, Page } from "@playwright/test";

/** Resolves after `(protected)/layout` finishes its initial auth/clinic load shell. */
export async function expectProtectedWorkspaceLoaded(page: Page) {
  await page
    .getByRole("status", { name: "Loading workspace" })
    .waitFor({ state: "hidden", timeout: 90000 });
}

export async function expectPageHeader(
  page: Page,
  params: { title: RegExp | string; description?: RegExp | string },
) {
  const { title, description } = params;

  const heading = page.getByRole("heading", { name: title }).first();
  const fallbackText = page.getByText(title).first();
  const headingVisible = await heading.isVisible({ timeout: 20000 }).catch(() => false);
  if (!headingVisible) {
    await expect(fallbackText).toBeVisible({ timeout: 20000 });
  }

  if (description) {
    await expect(page.getByText(description).first()).toBeVisible();
  }
}

export async function expectRoute(page: Page, path: RegExp | string) {
  await expect(page).toHaveURL(path);
  await expect(page.locator("body")).toBeVisible();
}

/**
 * Waits for dashboard UI after loading (not skeleton).
 * Fresh E2E clinics often hit the empty state (no patients yet), so we accept
 * either the queue band or the welcome empty view.
 */
export async function expectDashboardQueueSectionReady(page: Page) {
  const queue = page.locator("#dashboard-queue-heading");
  // EmptyState titles render as paragraph copy, not role="heading".
  const welcomeEmpty = page.getByText("Welcome to Docita", { exact: true });
  const todayEmpty = page.getByText("Start with your first patient", {
    exact: true,
  });
  const loadError = page.getByText("We could not load your dashboard");
  const todayLoadError = page.getByText(
    "We could not load today's workspace",
  );

  await Promise.race([
    queue.waitFor({ state: "visible", timeout: 60000 }),
    welcomeEmpty.waitFor({ state: "visible", timeout: 60000 }),
    todayEmpty.waitFor({ state: "visible", timeout: 60000 }),
    loadError.waitFor({ state: "visible", timeout: 60000 }),
    todayLoadError.waitFor({ state: "visible", timeout: 60000 }),
  ]);
}

export async function isDashboardQueueSectionVisible(page: Page) {
  return page.locator("#dashboard-queue-heading").isVisible();
}

export async function expectConsultationWorkspaceReady(page: Page) {
  const loading = page.getByText(/Loading consultation|Restoring your session/i);
  await loading.waitFor({ state: "hidden", timeout: 90_000 }).catch(() => {});

  const workspace = page.locator('main[aria-label="Consultation workspace"]');
  const sectionRail = page.getByRole("list", { name: "Consultation sections" });

  await Promise.race([
    workspace.waitFor({ state: "visible", timeout: 90_000 }),
    sectionRail.waitFor({ state: "visible", timeout: 90_000 }),
  ]);

  await expect(workspace.or(sectionRail)).toBeVisible({ timeout: 15_000 });
}

export async function expectDataState(
  page: Page,
  state: "loading" | "error" | "empty" | "ready",
  options: {
    emptyText?: RegExp | string;
    errorText?: RegExp | string;
    loadingText?: RegExp | string;
  } = {},
) {
  if (state === "ready") {
    await expect(page.locator("body")).toBeVisible();
    return;
  }

  if (state === "loading") {
    const text = options.loadingText ?? /Loading/i;
    await expect(page.getByText(text).first()).toBeVisible();
    return;
  }

  if (state === "error") {
    const text = options.errorText ?? /Retry|Something went wrong|Error/i;
    await expect(page.getByText(text).first()).toBeVisible();
    return;
  }

  const text = options.emptyText ?? /No .* yet|No results|Nothing here/i;
  await expect(page.getByText(text).first()).toBeVisible();
}

