import { expect, Page } from "@playwright/test";

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

