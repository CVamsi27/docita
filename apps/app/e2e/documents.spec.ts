import { expect, test } from "@playwright/test";
import { setupTestUser, loginUser, UserData, API_URL } from "./utils/patient-helpers";

test.describe("Documents", () => {
  let user: UserData;
  let patientId: string;
  let documentId: string;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);

    // Create Patient
    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        firstName: "Doc",
        lastName: "Owner",
        phoneNumber: `98${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: user.clinicId,
      },
    });
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();
    patientId = patient.id;

    // Seed Document via API (since UI upload is missing)
    // Create a dummy file buffer
    const buffer = Buffer.from('dummy content');

    // Playwright request.post with multipart
    const uploadRes = await request.post(`${API_URL}/documents/upload`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      multipart: {
        file: {
          name: 'test-report.pdf',
          mimeType: 'application/pdf',
          buffer: buffer,
        },
        patientId: patientId,
        type: 'LAB_REPORT',
        description: 'E2E Test Report'
      }
    });

    if (!uploadRes.ok()) {
      console.log("Upload failed:", await uploadRes.text());
    }
    expect(uploadRes.ok()).toBeTruthy();
    const doc = await uploadRes.json();
    documentId = doc.id;
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, user);
  });

  test("should display seeded document in list", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });

    // Verify Page Header
    await expect(page.locator('h1:has-text("Documents")')).toBeVisible();

    // Verify Document exists in table
    const row = page.locator('tr').filter({ hasText: "test-report.pdf" });
    await expect(row).toBeVisible();
    await expect(row).toContainText("LAB_REPORT");
    await expect(row).toContainText("Doc"); // UI matches "Doc" (first name) or name field

    // Verify Actions
    const viewBtn = row.locator('button:has-text("View")');
    await expect(viewBtn).toBeVisible();

    const downloadBtn = row.locator('button:has-text("Download")');
    await expect(downloadBtn).toBeVisible();
  });

  test("should filter documents by search", async ({ page }) => {
    await page.goto("/documents", { waitUntil: "networkidle" });

    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("NonExistentFile");
    await page.waitForTimeout(500); // Debounce

    await expect(page.getByText("No documents found")).toBeVisible();

    await searchInput.fill("test-report");
    await page.waitForTimeout(500); // Debounce

    await expect(page.locator('tr').filter({ hasText: "test-report.pdf" })).toBeVisible();
  });
});
