import { expect, test } from "@playwright/test";
import { API_URL, TEST_PASSWORD } from "./utils/patient-helpers";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value));
}

function readString(source: JsonRecord, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readAccessToken(source: JsonRecord): string | null {
  return readString(source, "access_token") ?? readString(source, "accessToken");
}

async function createDoctorWithSignature(request: import("@playwright/test").APIRequestContext) {
  const email = `doctor-verify-${Date.now()}@test.com`;
  const registerRes = await request.post(`${API_URL}/auth/register`, {
    data: {
      email,
      password: TEST_PASSWORD,
      firstName: "Verify",
      lastName: "Doctor",
      role: "DOCTOR",
      clinicName: `Verify Clinic ${Date.now()}`,
    },
  });
  expect(registerRes.ok()).toBeTruthy();

  const registerData = asRecord(await registerRes.json());
  const accessToken = readAccessToken(registerData);
  expect(accessToken).toBeTruthy();

  const userData = asRecord(registerData.user);
  const doctorId = readString(userData, "id");
  expect(doctorId).toBeTruthy();

  let clinicId = readString(userData, "clinicId");
  if (!clinicId) {
    const clinicRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        name: `Verify Clinic ${Date.now()}`,
        email: `verify-clinic-${Date.now()}@test.com`,
        phone: "1234567890",
        address: "123 Verify Street",
        tier: "ENTERPRISE",
      },
    });
    expect(clinicRes.ok()).toBeTruthy();
    const clinicData = asRecord(await clinicRes.json());
    clinicId = readString(clinicData, "id");
    expect(clinicId).toBeTruthy();

    const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: {
        doctorId,
        clinicId,
        role: "DOCTOR",
      },
    });
    expect(assignRes.ok()).toBeTruthy();
  }

  const tokenRes = await request.post(`${API_URL}/doctors/signature/generate-token`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(tokenRes.ok()).toBeTruthy();
  const tokenData = asRecord(await tokenRes.json());
  const uploadToken = readString(tokenData, "token");
  expect(uploadToken).toBeTruthy();

  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxXQAAAAASUVORK5CYII=",
    "base64",
  );

  const uploadRes = await request.post(
    `${API_URL}/doctors/signature/upload/${uploadToken}`,
    {
      multipart: {
        file: {
          name: "signature.png",
          mimeType: "image/png",
          buffer: pngBuffer,
        },
      },
    },
  );
  expect(uploadRes.ok()).toBeTruthy();

  return { email };
}

test.describe("Doctor Verification Flow", () => {
  test("redirects to verify-doctor and then continues to dashboard after registration save", async ({
    page,
    request,
  }) => {
    const doctor = await createDoctorWithSignature(request);

    await page.goto("/login");
    await page.fill('input[type="email"]', doctor.email);
    await page.click('button:has-text("Continue")');
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/verify-doctor/, { timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Profile Verification" }),
    ).toBeVisible();
    await expect(page.getByText("Signature uploaded successfully.")).toBeVisible();

    const registrationNumber = `REG-${Date.now()}`;
    await page.fill("#registration-number", registrationNumber);
    await page.click('button:has-text("Save")');

    await page.waitForTimeout(500);
    if (page.url().includes("/verify-doctor")) {
      const continueButton = page.getByRole("button", {
        name: "Continue to Dashboard",
      });
      if (await continueButton.isEnabled()) {
        await continueButton.click();
      }
    }

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  });
});
