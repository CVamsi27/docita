import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
  type Locator,
} from "@playwright/test";
import { z } from "zod";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@workspace/auth";
import {
  clinicResponseSchema,
  doctorResponseSchema,
  onboardingCompletionResponseSchema,
  onboardingInitResponseSchema,
  registerResponseSchema,
  signatureUploadResponseSchema,
  tokenIssueResponseSchema,
  uploadSessionCreateContractResponseSchema,
} from "@workspace/types";
import {
  API_URL,
  createUniqueClientIp,
  applyUserSession,
  E2E_TURNSTILE_TOKEN,
  TEST_PASSWORD,
} from "./utils/patient-helpers";
import { findRepoRoot, requireRepoDatabaseUrl } from "./utils/repo-root";

const APP_ORIGIN = new URL(
  process.env.APP_URL ??
    process.env.PLAYWRIGHT_TEST_BASE_URL ??
    "http://localhost:3000",
).origin;

async function addAuthCookies(
  page: Page,
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

async function fetchVerificationToken(email: string): Promise<string> {
  const output = execFileSync(
    "node",
    [
      "-r",
      "ts-node/register/transpile-only",
      "apps/api/scripts/fetch-verification-token.ts",
    ],
    {
      cwd: findRepoRoot(),
      env: {
        ...process.env,
        DATABASE_URL: requireRepoDatabaseUrl(),
        VERIFICATION_EMAIL: email,
        TS_NODE_COMPILER_OPTIONS: JSON.stringify({ rootDir: "." }),
      },
      encoding: "utf8",
    },
  ).trim();

  // This is a test-only DB script result, not an HTTP response contract.
  const result = z
    .object({
      emailVerified: z.literal(false),
      emailVerificationToken: z.string().min(1),
    })
    .parse(JSON.parse(output));
  return result.emailVerificationToken;
}

async function createDoctorWithSignature(
  request: APIRequestContext,
  options: { uploadDoctorSignature?: boolean } = {},
) {
  const uploadDoctorSignature = options.uploadDoctorSignature ?? false;
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
    // Valid 2x2 PNG: the previous fixture decoded but was corrupt, and the
    // API's sharp pipeline rejected it with libpng read error (400
    // "Invalid file format or upload failed").
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWPgEpH7D8IMMAYAJowE7bwlVOYAAAAASUVORK5CYII=",
    "base64",
  );

  const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    ...e2eHeaders,
  });
  const csrfHeaders = {
    Cookie: `${CSRF_COOKIE_NAME}=e2e-csrf-token`,
    [CSRF_HEADER_NAME]: "e2e-csrf-token",
  };

  const registerRes = await request.post(`${API_URL}/auth/register`, {
    headers: e2eHeaders,
    data: {
      email,
      password: TEST_PASSWORD,
      firstName: "Verify",
      lastName: "Doctor",
      role: "ADMIN_DOCTOR",
      turnstileToken: E2E_TURNSTILE_TOKEN,
    },
  });
  if (!registerRes.ok()) {
    throw new Error(`Doctor registration failed: ${await registerRes.text()}`);
  }

  const registerData = registerResponseSchema.parse(await registerRes.json());
  let accessToken = registerData.access_token;

  const userData = registerData.user;
  expect(userData.emailVerified).toBe(false);
  if (userData.emailVerified !== true) {
    const verificationToken = await fetchVerificationToken(email);

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
  }

  const doctorId = userData.id;

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
  const initData = onboardingInitResponseSchema.parse(await initRes.json());
  const onboardingId = initData.onboardingId;

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
  const signatureSessionData = uploadSessionCreateContractResponseSchema.parse(
    await signatureSessionRes.json(),
  );
  const signatureSessionId = signatureSessionData.id;
  const signatureUploadSecret = signatureSessionData.uploadSecret;

  const uploadSlaRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${signatureSessionId}`,
    {
      headers: {
        ...authHeaders(accessToken),
        ...csrfHeaders,
        "X-Upload-Secret": signatureUploadSecret,
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
          password: TEST_PASSWORD,
          role: "ADMIN_DOCTOR",
        },
        planSelection: {
          tier: "ESSENTIAL",
          billingCycle: "MONTHLY",
          currency: "INR",
        },
        paymentDetails: {
          skipPayment: true,
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
  const completeData = onboardingCompletionResponseSchema.parse(
    await completeRes.json(),
  );
  if (completeData.success !== true) {
    throw new Error(
      `Onboarding completion failed: ${JSON.stringify(completeData)}`,
    );
  }

  const loginRes = await request.post(`${API_URL}/auth/login`, {
    headers: {
      ...e2eHeaders,
      ...csrfHeaders,
    },
    data: {
      email,
      password: TEST_PASSWORD,
      turnstileToken: E2E_TURNSTILE_TOKEN,
    },
  });
  if (!loginRes.ok()) {
    throw new Error(
      `Post-onboarding login failed: ${loginRes.status()} ${await loginRes.text()}`,
    );
  }
  const loginData = tokenIssueResponseSchema.parse(await loginRes.json());
  accessToken = loginData.access_token;
  expect(loginData.user.emailVerified).toBe(true);
  expect(loginData.user.onboardingStep).toBe("COMPLETED");
  const clinicId = loginData.user.clinicId;
  if (!clinicId) throw new Error("Completed doctor has no clinic association");
  expect(clinicId).toBe(completeData.clinicId);

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
    const tokenData: unknown = await tokenRes.json();
    // The token endpoint has no shared response schema yet; narrow the only
    // field this fixture consumes instead of casting the untyped response.
    if (
      !tokenData ||
      typeof tokenData !== "object" ||
      !("token" in tokenData) ||
      typeof tokenData.token !== "string" ||
      !tokenData.token
    ) {
      throw new Error("Signature token response did not contain a token");
    }
    const uploadToken = tokenData.token;

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
    const uploaded = signatureUploadResponseSchema.parse(
      await uploadRes.json(),
    );
    expect(uploaded.purpose).toBe("DOCTOR_PRESCRIPTION");
    expect(uploaded.signatureStoredUrl).not.toBe("");
  }

  const { cookies } = await request.storageState();
  const refreshCookie = cookies.find(
    (cookie) => cookie.name === "refresh_token",
  );
  return {
    id: doctorId,
    email,
    doctorId,
    clinicId,
    accessToken,
    refreshToken: refreshCookie?.value ?? null,
  };
}

async function getDoctorProfile(
  request: APIRequestContext,
  doctor: Awaited<ReturnType<typeof createDoctorWithSignature>>,
) {
  const response = await request.get(`${API_URL}/doctors/${doctor.doctorId}`, {
    headers: { Authorization: `Bearer ${doctor.accessToken}` },
  });
  expect(response.ok()).toBe(true);
  return doctorResponseSchema.parse(await response.json());
}

async function saveRegistrationInBrowser(
  page: Page,
  registrationNumber: string,
) {
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().endsWith("/registration-number"),
  );
  const registrationInput = page.getByLabel(
    "Medical council registration number",
    { exact: true },
  );
  await registrationInput.fill(registrationNumber);
  await expect(registrationInput).toBeFocused();
  await registrationInput.press("Enter");
  expect((await saved).ok()).toBe(true);
  await expect(page).toHaveURL(/\/today(?:\?.*)?$/);
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Today", level: 1 }),
  ).toBeVisible();
}

async function expectDecodedSignature(image: Locator) {
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth > 0,
      ),
    )
    .toBe(true);
}

test.describe("Doctor Verification Flow", () => {
  test("keeps Today accessible and completes targeted profile registration in the browser", async ({
    page,
    request,
  }) => {
    const doctor = await createDoctorWithSignature(request, {
      uploadDoctorSignature: true,
    });
    const initialProfile = await getDoctorProfile(request, doctor);
    expect(initialProfile.registrationNumber).toBeFalsy();
    expect(initialProfile.signatureUrl).toBeTruthy();

    await applyUserSession(page, doctor, doctor);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/today(?:\?.*)?$/);
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Today", level: 1 }),
    ).toBeVisible();
    await page.goto("/verify-doctor");
    await expect(page).toHaveURL(/\/verify-doctor(?:\?.*)?$/);
    await expect(
      page.getByRole("heading", { name: "Verify your profile", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Signature uploaded successfully.", { exact: true }),
    ).toBeVisible();

    await expectDecodedSignature(
      page.getByAltText("Your uploaded signature", { exact: true }),
    );

    const registrationNumber = `REG-${randomUUID().slice(0, 8).toUpperCase()}`;
    await saveRegistrationInBrowser(page, registrationNumber);
    const persisted = await getDoctorProfile(request, doctor);
    expect(persisted.registrationNumber).toBe(registrationNumber);
    expect(persisted.clinicId).toBe(doctor.clinicId);
    expect(persisted.signatureStoredUrl).toBe(
      initialProfile.signatureStoredUrl,
    );
  });

  test("lets admin doctors reuse the onboarding signature in the browser", async ({
    page,
    request,
  }) => {
    const doctor = await createDoctorWithSignature(request);
    const initialProfile = await getDoctorProfile(request, doctor);
    expect(initialProfile.registrationNumber).toBeFalsy();
    expect(initialProfile.signatureUrl).toBeFalsy();

    const settingsResponse = await request.get(`${API_URL}/clinics/settings`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });
    expect(settingsResponse.ok()).toBe(true);
    const settings = clinicResponseSchema.parse(await settingsResponse.json());
    const onboardingSignature =
      settings.slaSignatureStoredUrl ?? settings.slaSignatureUrl;
    if (!onboardingSignature)
      throw new Error("Onboarding did not persist its SLA signature");

    await applyUserSession(page, doctor, doctor);
    await page.goto("/verify-doctor");
    await expect(
      page.getByRole("heading", { name: "Verify your profile", level: 1 }),
    ).toBeVisible();
    await expectDecodedSignature(
      page.getByAltText("Onboarding signature preview", { exact: true }),
    );
    const signatureSaved = page.waitForResponse(
      (response) =>
        response.request().method() === "PUT" &&
        new URL(response.url()).pathname.endsWith(
          `/doctors/${doctor.doctorId}`,
        ),
    );
    await page
      .getByRole("button", { name: "Use onboarding signature", exact: true })
      .click();
    expect((await signatureSaved).ok()).toBe(true);
    await expect(
      page.getByText("Signature uploaded successfully.", { exact: true }),
    ).toBeVisible();
    expect((await getDoctorProfile(request, doctor)).signatureStoredUrl).toBe(
      onboardingSignature,
    );

    await expectDecodedSignature(
      page.getByAltText("Your uploaded signature", { exact: true }),
    );

    const registrationNumber = `REG-${randomUUID().slice(0, 8).toUpperCase()}`;
    await saveRegistrationInBrowser(page, registrationNumber);
    const persisted = await getDoctorProfile(request, doctor);
    expect(persisted.registrationNumber).toBe(registrationNumber);
    expect(persisted.signatureStoredUrl).toBe(onboardingSignature);
    expect(persisted.clinicId).toBe(doctor.clinicId);
  });
});
