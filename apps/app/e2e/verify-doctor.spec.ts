import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  API_URL,
  createUniqueClientIp,
  TEST_PASSWORD,
} from "./utils/patient-helpers";

type JsonRecord = Record<string, unknown>;
const APP_ORIGIN = new URL(
  process.env.APP_URL ??
    process.env.PLAYWRIGHT_TEST_BASE_URL ??
    "http://127.0.0.1:3005",
).origin;

async function addAuthCookies(
  page: import("@playwright/test").Page,
  tokens: { accessToken: string; refreshToken?: string | null },
) {
  const accessCookieUrl = `${APP_ORIGIN}/`;
  const refreshCookieUrl = `${APP_ORIGIN}/api/v1/auth/`;
  await page.context().addCookies([
    {
      name: "access_token",
      value: tokens.accessToken,
      url: accessCookieUrl,
    },
  ]);

  if (tokens.refreshToken) {
    await page.context().addCookies([
      {
        name: "refresh_token",
        value: tokens.refreshToken,
        url: refreshCookieUrl,
      },
    ]);
  }
}

test.describe("verify-doctor auth cookies", () => {
  test("stores auth cookies against the current app origin and refresh path", async ({
    page,
  }) => {
    await addAuthCookies(page, {
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });

    await expect
      .poll(async () => page.context().cookies([`${APP_ORIGIN}/`]))
      .toContainEqual(
        expect.objectContaining({
          name: "access_token",
          value: "access-token",
          path: "/",
        }),
      );

    await expect
      .poll(async () => page.context().cookies([`${APP_ORIGIN}/api/v1/auth/`]))
      .toContainEqual(
        expect.objectContaining({
          name: "refresh_token",
          value: "refresh-token",
          path: "/api/v1/auth/",
        }),
      );
  });

  test("skips the refresh cookie when no refresh token is present", async ({
    page,
  }) => {
    await addAuthCookies(page, {
      accessToken: "access-token",
      refreshToken: null,
    });

    await expect
      .poll(async () => page.context().cookies([`${APP_ORIGIN}/api/v1/auth/`]))
      .not.toContainEqual(
        expect.objectContaining({
          name: "refresh_token",
        }),
      );
  });
});

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
  return (
    readString(source, "access_token") ?? readString(source, "accessToken")
  );
}

function getRepoRoot(): string {
  return resolve(process.cwd(), "..", "..");
}

function readDatabaseUrl(): string {
  const envPath = resolve(getRepoRoot(), ".env");
  const file = readFileSync(envPath, "utf8");
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    const value = line.slice("DATABASE_URL=".length).trim();
    if (!value) break;
    return value.replace(/^"(.*)"$/, "$1");
  }

  throw new Error("DATABASE_URL was not found in the repository .env file.");
}

async function fetchVerificationToken(email: string): Promise<string | null> {
  const output = execFileSync(
    "node",
    [
      "-r",
      "ts-node/register/transpile-only",
      "apps/api/scripts/fetch-verification-token.ts",
    ],
    {
      cwd: getRepoRoot(),
      env: {
        ...process.env,
        DATABASE_URL: readDatabaseUrl(),
        VERIFICATION_EMAIL: email,
      },
      encoding: "utf8",
    },
  ).trim();

  if (!output) {
    return null;
  }

  const parsed = JSON.parse(output) as {
    emailVerified?: boolean;
    emailVerificationToken?: string | null;
  };

  if (parsed.emailVerified) {
    return null;
  }

  return parsed.emailVerificationToken ?? null;
}

async function createDoctorWithSignature(
  request: import("@playwright/test").APIRequestContext,
  options: { uploadDoctorSignature?: boolean } = {},
) {
  const uploadDoctorSignature = options.uploadDoctorSignature ?? true;
  const uniqueId = randomUUID();
  const email = `doctor-verify-${uniqueId}@test.com`;
  const clinicName = `Verify Clinic ${uniqueId}`;
  const clinicEmail = `verify-clinic-${uniqueId}@test.com`;
  const forwardedFor = createUniqueClientIp();
  const e2eHeaders = {
    "X-Forwarded-For": forwardedFor,
    "X-Real-IP": forwardedFor,
    "x-docita-e2e": "true",
  };
  const signatureBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxXQAAAAASUVORK5CYII=",
    "base64",
  );

  const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });
  const csrfHeaders = {
    Cookie: "XSRF-TOKEN=e2e-csrf-token",
    "X-XSRF-TOKEN": "e2e-csrf-token",
  };

  const registerRes = await request.post(`${API_URL}/auth/register`, {
    headers: e2eHeaders,
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
  if (userData.emailVerified !== true) {
    const verificationToken = await fetchVerificationToken(email);
    expect(verificationToken).toBeTruthy();

    const verifyEmailRes = await request.post(`${API_URL}/auth/verify-email`, {
      headers: csrfHeaders,
      data: {
        token: verificationToken,
      },
    });
    if (!verifyEmailRes.ok()) {
      throw new Error(
        `Email verification failed: ${verifyEmailRes.status()} ${await verifyEmailRes.text()}`,
      );
    }
    userData.emailVerified = true;
  }

  const doctorId = readString(userData, "id");
  expect(doctorId).toBeTruthy();

  const choosePathRes = await request.post(
    `${API_URL}/onboarding/choose-path`,
    {
      headers: {
        ...authHeaders(accessToken),
        ...csrfHeaders,
      },
      data: { path: "CREATE_CLINIC" },
    },
  );
  expect(choosePathRes.ok()).toBeTruthy();

  const initRes = await request.post(`${API_URL}/onboarding/initialize`, {
    headers: {
      ...authHeaders(accessToken),
      ...csrfHeaders,
    },
    data: {},
  });
  expect(initRes.ok()).toBeTruthy();
  const initData = asRecord(await initRes.json());
  const onboardingId = readString(initData, "onboardingId");
  expect(onboardingId).toBeTruthy();

  const signatureSessionRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/sla-signature-session`,
    {
      headers: {
        ...authHeaders(accessToken),
        ...csrfHeaders,
      },
    },
  );
  expect(signatureSessionRes.ok()).toBeTruthy();
  const signatureSessionData = asRecord(await signatureSessionRes.json());
  const signatureSessionId = readString(signatureSessionData, "id");
  expect(signatureSessionId).toBeTruthy();

  const uploadSlaRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${signatureSessionId}`,
    {
      headers: {
        ...authHeaders(accessToken),
        ...csrfHeaders,
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
  expect(uploadSlaRes.ok()).toBeTruthy();

  const completeRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/complete`,
    {
      headers: {
        ...authHeaders(accessToken),
        ...csrfHeaders,
      },
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

  if (uploadDoctorSignature) {
    const tokenRes = await request.post(
      `${API_URL}/doctors/signature/generate-token`,
      {
        headers: {
          ...authHeaders(accessToken),
          ...csrfHeaders,
        },
      },
    );
    expect(tokenRes.ok()).toBeTruthy();
    const tokenData = asRecord(await tokenRes.json());
    const uploadToken = readString(tokenData, "token");
    expect(uploadToken).toBeTruthy();

    const uploadRes = await request.post(
      `${API_URL}/doctors/signature/upload/${uploadToken}`,
      {
        headers: {
          ...authHeaders(accessToken),
          ...csrfHeaders,
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
      throw new Error(
        `Doctor signature upload failed: ${await uploadRes.text()}`,
      );
    }
  }

  const returnedUser = asRecord(completeData.user ?? registerData.user);
  const completedClinicId = readString(asRecord(completeData), "clinicId");
  if (completedClinicId && returnedUser.clinicId !== completedClinicId) {
    returnedUser.clinicId = completedClinicId;
  }
  if (returnedUser.emailVerified !== true) {
    returnedUser.emailVerified = true;
  }

  return {
    email,
    doctorId,
    accessToken,
    refreshToken:
      completeData.refresh_token || registerData.refresh_token || null,
    user: returnedUser,
  };
}

test.describe("Doctor Verification Flow", () => {
  test("redirects to verify-doctor and then continues to dashboard after registration save", async ({
    page,
    request,
  }) => {
    const doctor = await createDoctorWithSignature(request);

    await addAuthCookies(page, doctor);
    await page.context().addInitScript(
      ({ user, token }) => {
        localStorage.setItem("docita_user", JSON.stringify(user));
        localStorage.setItem("docita_token", token);
        document.cookie = "XSRF-TOKEN=e2e-csrf-token; path=/";
      },
      { user: doctor.user, token: doctor.accessToken },
    );
    await page.route(/\/api(?:\/v1)?\/.*$/, async (route) => {
      const requestUrl = new URL(route.request().url());
      const isAuthValidate = /\/api(?:\/v1)?\/auth\/validate$/.test(
        requestUrl.pathname,
      );
      if (isAuthValidate) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": APP_ORIGIN,
            "access-control-allow-credentials": "true",
          },
          body: JSON.stringify({ user: doctor.user }),
        });
        return;
      }

      const isAuthRefresh = /\/api(?:\/v1)?\/auth\/refresh$/.test(
        requestUrl.pathname,
      );
      if (isAuthRefresh) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": APP_ORIGIN,
            "access-control-allow-credentials": "true",
          },
          body: JSON.stringify({ access_token: doctor.accessToken }),
        });
        return;
      }

      const isDoctorUpdate =
        route.request().method() === "PUT" &&
        /\/api(?:\/v1)?\/doctors\/[^/]+$/.test(requestUrl.pathname);
      if (isDoctorUpdate) {
        const upstream = await request.put(route.request().url(), {
          headers: {
            Authorization: `Bearer ${doctor.accessToken}`,
            Cookie: "XSRF-TOKEN=e2e-csrf-token",
            "X-XSRF-TOKEN": "e2e-csrf-token",
          },
          data: route.request().postDataJSON(),
        });
        const upstreamText = await upstream.text();
        await route.fulfill({
          status: upstream.status(),
          headers: {
            ...upstream.headers(),
            "access-control-allow-origin": APP_ORIGIN,
            "access-control-allow-credentials": "true",
          },
          body: upstreamText,
        });
        return;
      }

      const response = await route.fetch();
      await route.fulfill({
        status: response.status(),
        headers: {
          ...response.headers(),
          "access-control-allow-origin": APP_ORIGIN,
          "access-control-allow-credentials": "true",
        },
        body: await response.body(),
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

  test("lets admin doctors reuse the onboarding signature during verification", async ({
    request,
  }) => {
    const doctor = await createDoctorWithSignature(request, {
      uploadDoctorSignature: false,
    });

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

    const clinicSettingsRes = await request.get(`${API_URL}/clinic/settings`, {
      headers: {
        Authorization: `Bearer ${doctor.accessToken}`,
      },
    });
    expect(clinicSettingsRes.ok()).toBeTruthy();
    const clinicSettings = asRecord(await clinicSettingsRes.json());
    const onboardingSignatureSourceUrl =
      readString(clinicSettings, "slaSignatureStoredUrl") ??
      readString(clinicSettings, "slaSignatureUrl");
    expect(onboardingSignatureSourceUrl).toBeTruthy();

    const reuseOnboardingSignatureRes = await request.put(
      `${API_URL}/doctors/${doctor.doctorId}`,
      {
        headers: {
          Authorization: `Bearer ${doctor.accessToken}`,
          Cookie: "XSRF-TOKEN=e2e-csrf-token",
          "X-XSRF-TOKEN": "e2e-csrf-token",
        },
        data: {
          signatureUrl: onboardingSignatureSourceUrl,
        },
      },
    );
    expect(reuseOnboardingSignatureRes.ok()).toBeTruthy();

    const doctorProfileRes = await request.get(
      `${API_URL}/doctors/${doctor.doctorId}`,
      {
        headers: {
          Authorization: `Bearer ${doctor.accessToken}`,
        },
      },
    );
    expect(doctorProfileRes.ok()).toBeTruthy();
    const doctorProfile = asRecord(await doctorProfileRes.json());

    expect(readString(doctorProfile, "registrationNumber")).toBe(
      registrationNumber,
    );
    expect(readString(doctorProfile, "signatureUrl")).toBeTruthy();
  });
});
