import { randomUUID } from "node:crypto";
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
  const uniqueId = randomUUID();
  const email = `doctor-verify-${uniqueId}@test.com`;
  const clinicName = `Verify Clinic ${uniqueId}`;
  const clinicEmail = `verify-clinic-${uniqueId}@test.com`;
  const forwardedFor = `127.0.0.${Math.floor(Math.random() * 200) + 1}`;
  const signatureBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxXQAAAAASUVORK5CYII=",
    "base64",
  );

  const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

  const registerRes = await request.post(`${API_URL}/auth/register`, {
    headers: {
      "X-Forwarded-For": forwardedFor,
    },
    data: {
      email,
      password: TEST_PASSWORD,
      firstName: "Verify",
      lastName: "Doctor",
      role: "ADMIN_DOCTOR",
    },
  });
  if (!registerRes.ok()) {
    throw new Error(`Doctor registration failed: ${await registerRes.text()}`);
  }

  const registerData = asRecord(await registerRes.json());
  let accessToken = readAccessToken(registerData);
  expect(accessToken).toBeTruthy();

  const userData = asRecord(registerData.user);
  const doctorId = readString(userData, "id");
  expect(doctorId).toBeTruthy();

  const choosePathRes = await request.post(`${API_URL}/onboarding/choose-path`, {
    headers: authHeaders(accessToken),
    data: { path: "CREATE_CLINIC" },
  });
  expect(choosePathRes.ok()).toBeTruthy();

  const initRes = await request.post(`${API_URL}/onboarding/initialize`, {
    headers: authHeaders(accessToken),
    data: {},
  });
  expect(initRes.ok()).toBeTruthy();
  const initData = asRecord(await initRes.json());
  const onboardingId = readString(initData, "onboardingId");
  expect(onboardingId).toBeTruthy();

  const signatureSessionRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/sla-signature-session`,
    { headers: authHeaders(accessToken) },
  );
  expect(signatureSessionRes.ok()).toBeTruthy();
  const signatureSessionData = asRecord(await signatureSessionRes.json());
  const signatureSessionId = readString(signatureSessionData, "id");
  expect(signatureSessionId).toBeTruthy();

  const uploadSlaRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${signatureSessionId}`,
    {
      headers: authHeaders(accessToken),
      multipart: {
        file: {
          name: "signature.png",
          mimeType: "image/png",
          buffer: signatureBuffer,
        },
      },
    },
  );
  expect(uploadSlaRes.ok()).toBeTruthy();

  const completeRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/complete`,
    {
      headers: authHeaders(accessToken),
      data: {
        clinicDetails: {
          name: clinicName,
          email: clinicEmail,
          phone: "1234567890",
          address: "123 Verify Street, Hyderabad",
          type: "GENERAL",
          website: "",
          gstin: "",
        },
        adminAccount: {
          name: "Verify Doctor",
          email,
          role: "ADMIN_DOCTOR",
        },
        planSelection: {
          tier: "STARTER",
          billingCycle: "MONTHLY",
          currency: "INR",
        },
        slaAgreement: {
          acceptedSLA: true,
          slaVersion: "1.0",
          acceptedBy: "Verify Doctor",
          signatureSessionId,
          acceptedDataProcessingTerms: true,
          acceptedPrivacyPolicy: true,
        },
        consentManagement: {
          enableWhatsAppCommunication: false,
          enableMarketingCommunications: false,
          dataProcessingPurposes: [],
          patientConsentRequiredBeforeWhatsApp: true,
          logAllConsentChanges: true,
        },
      },
    },
  );
  expect(completeRes.ok()).toBeTruthy();
  const completeData = asRecord(await completeRes.json());
  accessToken = readAccessToken(completeData) ?? accessToken;

  const tokenRes = await request.post(`${API_URL}/doctors/signature/generate-token`, {
    headers: authHeaders(accessToken),
  });
  expect(tokenRes.ok()).toBeTruthy();
  const tokenData = asRecord(await tokenRes.json());
  const uploadToken = readString(tokenData, "token");
  expect(uploadToken).toBeTruthy();

  const uploadRes = await request.post(
    `${API_URL}/doctors/signature/upload/${uploadToken}`,
    {
      headers: {
        ...authHeaders(accessToken),
        Cookie: "XSRF-TOKEN=e2e-csrf-token",
        "X-XSRF-TOKEN": "e2e-csrf-token",
      },
      multipart: {
        file: {
          name: "signature.png",
          mimeType: "image/png",
          buffer: signatureBuffer,
        },
      },
    },
  );
  if (!uploadRes.ok()) {
    throw new Error(`Doctor signature upload failed: ${await uploadRes.text()}`);
  }

  return {
    email,
    doctorId,
    accessToken,
    refreshToken: completeData.refresh_token || registerData.refresh_token || null,
    user: completeData.user ?? registerData.user,
  };
}

test.describe("Doctor Verification Flow", () => {
  test("redirects to verify-doctor and then continues to dashboard after registration save", async ({
    page,
    request,
  }) => {
    const doctor = await createDoctorWithSignature(request);

    await page.context().addCookies([
      {
        name: "access_token",
        value: doctor.accessToken,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    if (doctor.refreshToken) {
      await page.context().addCookies([
        {
          name: "refresh_token",
          value: doctor.refreshToken,
          domain: "127.0.0.1",
          path: "/api/v1/auth",
        },
      ]);
    }
    await page.context().addInitScript(
      ({ user, token }) => {
        localStorage.setItem("docita_user", JSON.stringify(user));
        localStorage.setItem("docita_token", token);
        document.cookie = "XSRF-TOKEN=e2e-csrf-token; path=/";
      },
      { user: doctor.user, token: doctor.accessToken },
    );
    await page.route("**/api/v1/auth/validate**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: doctor.user }),
      });
    });
    await page.route("**/api/v1/auth/refresh**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: doctor.accessToken }),
      });
    });
    await page.goto("/verify-doctor");

    await page.waitForURL(/\/verify-doctor/, { timeout: 30000 });
    const registrationNumber = `REG-${Date.now()}`;
    const updateRes = await request.put(
      `${API_URL}/doctors/${doctor.doctorId}/registration-number`,
      {
        headers: {
          Authorization: `Bearer ${doctor.accessToken}`,
        },
        data: {
          registrationNumber,
        },
      },
    );
    expect(updateRes.ok()).toBeTruthy();

    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  });
});
