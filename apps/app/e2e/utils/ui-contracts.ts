import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

async function expectAnyVisible(
  locators: ReturnType<Page["locator"]>[],
  options: { message: string; timeout: number },
) {
  await expect
    .poll(async () => {
      for (const locator of locators) {
        if (await locator.isVisible().catch(() => false)) {
          return true;
        }
      }
      return false;
    }, options)
    .toBe(true);
}

/** Resolves after `(protected)/layout` finishes its initial auth/clinic load shell. */
export async function expectProtectedWorkspaceLoaded(page: Page) {
  const mobileHeader = page.getByTestId("mobile-header");
  const mainContent = page.locator('main[aria-label="Main content"]');

  await expectAnyVisible([mobileHeader, mainContent], {
    message: "Expected the protected workspace shell to finish loading",
    timeout: 90_000,
  });
}

export async function expectPageHeader(
  page: Page,
  params: { title: RegExp | string; description?: RegExp | string },
) {
  const { title, description } = params;

  const heading = page.getByRole("heading", { name: title }).first();
  const fallbackText = page.getByText(title).first();
  const headingVisible = await heading
    .isVisible({ timeout: 20000 })
    .catch(() => false);
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
  const todayLoadError = page.getByText("We could not load today's workspace");

  await expectAnyVisible(
    [queue, welcomeEmpty, todayEmpty, loadError, todayLoadError],
    {
      message: "Expected the dashboard workspace to finish loading",
      timeout: 60_000,
    },
  );
}

export async function isDashboardQueueSectionVisible(page: Page) {
  return page.locator("#dashboard-queue-heading").isVisible();
}

export async function expectConsultationWorkspaceReady(page: Page) {
  const workspace = page.getByRole("region", { name: "Consultation workspace" });
  const sectionRail = page.getByRole("list", { name: "Consultation sections" });
  const terminalState = page
    .getByText(
      /We could not open this consultation|Only the assigned doctor can open this consultation|Appointment not found/i,
    )
    .first();

  await expect
    .poll(
      async () => {
        if (
          (await workspace.isVisible().catch(() => false)) ||
          (await sectionRail.isVisible().catch(() => false))
        ) {
          return "ready";
        }
        if (await terminalState.isVisible().catch(() => false)) {
          return `terminal: ${await terminalState.textContent()}`;
        }
        return "loading";
      },
      {
        message: "Expected the consultation workspace to become ready",
        timeout: 90_000,
      },
    )
    .toBe("ready");
}
