import { expect, test } from "@playwright/test";
import {
  API_URL,
  loginUser,
  setupTestUser,
  UserData,
} from "./utils/patient-helpers";

test.describe("Documents", () => {
  let user: UserData;
  let patientId: string;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);

    // Create Patient
    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        firstName: "Doc",
        lastName: "Owner",
        phoneNumber: `98${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0")}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: user.clinicId,
      },
    });
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();
    patientId = patient.id;

    // Seed Document via API
    const buffer = Buffer.from("dummy content");
    const uploadRes = await request.post(`${API_URL}/documents/upload`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      multipart: {
        file: {
          name: "test-report.pdf",
          mimeType: "application/pdf",
          buffer: buffer,
        },
        patientId: patientId,
        type: "LAB_REPORT",
        description: "E2E Test Report",
      },
    });

    if (!uploadRes.ok()) {
      console.log("Upload failed:", await uploadRes.text());
    }
    expect(uploadRes.ok()).toBeTruthy();
    await uploadRes.json();
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, user);
  });

  test("should display seeded document in list", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });

    // Strict: Verify Page Header exists
    await expect(page.locator("h1")).toContainText("Documents");

    // Strict: Verify Card title exists
    await expect(
      page.locator("div", { hasText: "All Documents" }).first(),
    ).toBeVisible();

    // Strict: Wait for loading to complete (no "Loading documents..." text)
    await expect(page.getByText("Loading documents...")).not.toBeVisible({
      timeout: 10000,
    });

    // Strict: Verify the seeded document appears in table (by filename or ID)
    // Strict: Verify the seeded document appears in table (by filename or ID)
    await expect(
      page.locator("tr").filter({ hasText: "test-report.pdf" }),
    ).toBeVisible();

    // Document should be visible OR we check that documents count is > 0
    const noDocsMessage = page.getByText("No documents found.");
    if (await noDocsMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      // This means document wasn't created - fail the test
      expect(
        false,
        "Expected document to be visible but found 'No documents found'",
      ).toBeTruthy();
    } else {
      // Document table has rows - verify at least the structure is correct
      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("th")).toContainText([
        "Document ID",
        "File Name",
        "Patient",
        "Type",
        "Date",
        "Actions",
      ]);
    }
  });

  test("should display correct table headers", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });

    // Strict: Verify all column headers
    await expect(
      page.getByRole("columnheader", { name: /Document ID/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /File Name/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Patient/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Type/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Date/i })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /Actions/i }),
    ).toBeVisible();
  });

  test("should have search functionality", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });

    // Strict: Verify search input exists with correct placeholder
    const searchInput = page.getByPlaceholder(
      "Search by patient, file name, or type...",
    );
    await expect(searchInput).toBeVisible();

    // Test search functionality
    await searchInput.fill("NonExistentFile12345");
    await page.waitForTimeout(500); // Debounce

    // Strict: Verify empty state message
    await expect(page.getByText("No documents found.")).toBeVisible();
  });
});
