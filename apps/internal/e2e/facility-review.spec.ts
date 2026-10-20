import { expect, test } from "@playwright/test";
import { requireInternalSession } from "./utils/accessibility-audit";

test("facility review keeps failed edit drafts and restores keyboard focus", async ({
  page,
}) => {
  const email = process.env["INTERNAL_E2E_EMAIL"];
  const password = process.env["INTERNAL_E2E_PASSWORD"];
  if (!email || !password)
    throw new Error(
      "Dedicated INTERNAL_E2E_EMAIL and INTERNAL_E2E_PASSWORD are required",
    );
  await page.goto("/login");
  await page.getByPlaceholder("Email", { exact: true }).fill(email);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  const login = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/auth/login"),
  );
  await page.getByRole("button", { name: "Login", exact: true }).click();
  const response = await login;
  expect(response.ok()).toBeTruthy();
  requireInternalSession(await response.json());
  await expect(
    page.getByRole("heading", { name: "Facilities", exact: true }),
  ).toBeVisible();
  const logo = page.getByRole("img", { name: "Docita", exact: true });
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect
      .poll(() =>
        logo.evaluate(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await expect(
      page.getByRole("table", { name: "Facilities on the current page" }),
    ).toHaveCount(0);
  }
  for (const table of await page
    .locator('[data-slot="table-container"]')
    .filter({ visible: true })
    .all()) {
    expect(
      await table.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
  }
  const review = page
    .getByRole("button", { name: /^Review facility:/ })
    .filter({ visible: true })
    .first();
  const label = await review.getAttribute("aria-label");
  if (!label)
    throw new Error("Facility review needs its accessible record name");
  const name = label.replace("Review facility: ", "");
  await review.click();
  const narrow = (page.viewportSize()?.width ?? 0) < 1280;
  const context = narrow
    ? page.getByRole("dialog", { name: "Facility review", exact: true })
    : page.getByRole("complementary", { name: "Facility review", exact: true });
  await expect(
    context.getByRole("heading", { name, exact: true }),
  ).toBeVisible();
  await expect(
    context.getByText("Subscription status", { exact: true }),
  ).toBeVisible();
  const edit = context.getByRole("button", {
    name: "Edit facility",
    exact: true,
  });
  await edit.click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Facility",
    exact: true,
  });
  const field = dialog.getByRole("textbox", { name: /facility name/i });
  await field.fill("Unsaved fixture revision");
  let saves = 0;
  await page.route("**/internal/clinics/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    saves++;
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ message: "Fixture validation failure" }),
    });
  });
  await dialog
    .getByRole("button", { name: "Update Facility", exact: true })
    .click();
  await expect.poll(() => saves).toBe(1);
  await expect(
    dialog.getByRole("button", { name: "Update Facility", exact: true }),
  ).toBeEnabled();
  await expect(field).toHaveValue("Unsaved fixture revision");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(edit).toBeFocused();
  if (narrow) {
    await page.keyboard.press("Escape");
    await expect(context).not.toBeVisible();
    await expect(review).toBeFocused();
  }
  await expect(
    page.getByText("Search facilities on this page · 50 per page", {
      exact: true,
    }),
  ).toBeVisible();
  expect(saves).toBe(1);
});
