import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import type { APIRequestContext, Page } from "@playwright/test";
import {
  loginResponseSchema,
  uploadSessionCreateContractResponseSchema,
  type ClinicType,
} from "@workspace/types";
import { z } from "zod";
import { E2E_ACCESS_TOKEN_SESSION_KEY } from "./e2e-session-token-key";
import { findRepoRoot, requireRepoDatabaseUrl } from "./repo-root";

const e2eLoginTokenFallbackSchema = z.object({
  access_token: z.string().optional(),
  accessToken: z.string().optional(),
  refresh_token: z.string().optional(),
  refreshToken: z.string().optional(),
  data: z
    .object({
      access_token: z.string().optional(),
      accessToken: z.string().optional(),
      refresh_token: z.string().optional(),
      refreshToken: z.string().optional(),
    })
    .optional(),
});

function readAccessTokenFromLoginResponse(
  raw: unknown,
  fallback: string,
): string {
  const direct = loginResponseSchema.safeParse(raw);
  if (direct.success) return direct.data.access_token;

  const loose = e2eLoginTokenFallbackSchema.safeParse(raw);
  if (loose.success) return (
      loose.data.access_token ??
      loose.data.accessToken ??
      loose.data.data?.access_token ??
      loose.data.data?.accessToken ??
      fallback
    );

  return fallback;
}

function readRefreshTokenFromLoginResponse(raw: unknown): string | null {
  const loose = e2eLoginTokenFallbackSchema.safeParse(raw);
  if (!loose.success) return null;

  return (
    loose.data.refresh_token ??
    loose.data.refreshToken ??
    loose.data.data?.refresh_token ??
    loose.data.data?.refreshToken ??
    null
  );
}

export const API_URL = process.env["API_URL"] || "http://127.0.0.1:3001/api/v1";
const APP_ORIGIN = new URL(
  process.env["APP_URL"] || "http://127.0.0.1:3000",
).origin;
export const TEST_PASSWORD = "Test@123456";
/** Valid 15-char GSTIN for paid INR onboarding in E2E (not a real taxpayer ID). */
const E2E_PAID_PLAN_GSTIN = "29AABCU9603R1ZX";

/**
 * Builds verified Razorpay payment details for a paid-plan onboarding. Creates
 * a real test order via the checkout endpoint, then signs `${orderId}|${paymentId}`
 * with the test key secret — matching the API's rzp_test_ verification path,
 * which reads the amount from the order rather than fetching a (non-existent)
 * payment object. Requires RAZORPAY_KEY_SECRET (a test secret) in the env.
 */
async function createTestPaymentDetails(
  request: APIRequestContext,
  onboardingId: string,
  options: {
    headers: Record<string, string>;
    tier: string;
    customerEmail: string;
  },
): Promise<{
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}> {
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keySecret) throw new Error(
      "RAZORPAY_KEY_SECRET (test secret) is required to complete paid-plan onboarding in E2E",
    );

  const checkoutRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/checkout`,
    {
      headers: options.headers,
      data: {
        tier: options.tier,
        billingCycle: "MONTHLY",
        currency: "INR",
        customerEmail: options.customerEmail,
        customerName: "Dr. History",
        customerPhone: "1234567890",
      },
    },
  );
  if (!checkoutRes.ok()) {
    throw new Error(`Onboarding checkout failed: ${await checkoutRes.text()}`);
  }

  const checkout = onboardingCheckoutResultSchema.parse(
    await checkoutRes.json(),
  );
  const razorpayPaymentId = `pay_e2e_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
  const razorpaySignature = createHmac("sha256", keySecret)
    .update(`${checkout.orderId}|${razorpayPaymentId}`)
    .digest("hex");

  return {
    razorpayOrderId: checkout.orderId,
    razorpayPaymentId,
    razorpaySignature,
  };
}

const onboardingCheckoutResultSchema = z.object({
  orderId: z.string(),
  amountCents: z.number(),
  currency: z.string(),
  razorpayKeyId: z.string(),
});

/** Next.js `(protected)` patient routes — keep Playwright URLs aligned with the app router. */
export const PATIENTS_LIST_PATH = "/patients";

export function patientDetailPath(patientId: string): string {
  return `${PATIENTS_LIST_PATH}/${patientId}`;
}

export interface UserData {
  id: string;
  email: string;
  clinicId: string;
  accessToken: string;
}

type SetupUserCache = Map<string, Promise<UserData>>;

let setupUserCache: SetupUserCache | undefined;

function getSetupUserCache(): SetupUserCache {
  if (!setupUserCache) {
    setupUserCache = new Map();
  }
  return setupUserCache;
}

const e2eVerificationUserSchema = z.object({
  emailVerified: z.boolean().optional(),
  emailVerificationToken: z.string().nullable().optional(),
});

async function fetchVerificationToken(email: string): Promise<string | null> {
  let output = "";
  try {
    output = execFileSync(
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
        },
        encoding: "utf8",
      },
    ).trim();
  } catch {
    return null;
  }

  if (!output) return null;

  const parsed = e2eVerificationUserSchema.safeParse(JSON.parse(output));
  if (!parsed.success) return null;

  if (parsed.data.emailVerified) return null;

  return parsed.data.emailVerificationToken ?? null;
}

/**
 * Deterministically marks a test account's email verified in the DB. Used after
 * onboarding to close the race where the token round-trip in
 * {@link verifyEmailIfNeeded} skips, leaving the admin unverified.
 */
function ensureEmailVerified(email: string): void {
  try {
    execFileSync(
      "node",
      [
        "-r",
        "ts-node/register/transpile-only",
        "apps/api/scripts/ensure-email-verified.ts",
      ],
      {
        cwd: findRepoRoot(),
        env: {
          ...process.env,
          DATABASE_URL: requireRepoDatabaseUrl(),
          VERIFICATION_EMAIL: email,
        },
        stdio: "ignore",
      },
    );
  } catch {
    // Best-effort: environments without DB access fall back to the API flow.
  }
}

/**
 * Local E2E has no external doctor-verification provider. Mark fixture doctors
 * verified after they complete registration so clinical workflow tests can
 * issue prescriptions without bypassing production guards.
 */
function ensureDoctorVerified(doctorId: string): void {
  try {
    execFileSync(
      "node",
      [
        "-r",
        "ts-node/register/transpile-only",
        "apps/api/scripts/ensure-doctor-verified.ts",
      ],
      {
        cwd: findRepoRoot(),
        env: {
          ...process.env,
          DATABASE_URL: requireRepoDatabaseUrl(),
          VERIFICATION_DOCTOR_ID: doctorId,
        },
        stdio: "ignore",
      },
    );
  } catch {
    // Best-effort: environments without DB access exercise the pending state.
  }
}

export async function verifyEmailIfNeeded(
  request: APIRequestContext,
  email: string,
  emailVerified?: boolean,
): Promise<void> {
  if (emailVerified) {
    return;
  }

  const verificationToken = await fetchVerificationToken(email);
  if (!verificationToken) {
    // Some environments don't expose DB access for tests; skip verification.
    return;
  }

  const verifyEmailRes = await request.post(`${API_URL}/auth/verify-email`, {
    headers: {
      Cookie: "XSRF-TOKEN=e2e-csrf-token",
      "X-XSRF-TOKEN": "e2e-csrf-token",
    },
    data: {
      token: verificationToken,
    },
  });

  if (!verifyEmailRes.ok()) {
    throw new Error(
      `Email verification failed: ${await verifyEmailRes.text()}`,
    );
  }
}

export function createUniqueClientIp(): string {
  const hex = randomUUID().replace(/-/g, "");
  return [
    10,
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ].join(".");
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(
  request: APIRequestContext,
  url: string,
  init: Parameters<APIRequestContext["post"]>[1],
  options: { retries: number; baseDelayMs: number },
) {
  let lastRes: Awaited<ReturnType<APIRequestContext["post"]>> | null = null;
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    const res = await request.post(url, init);
    lastRes = res;
    if (res.status() !== 429) return res;
    await sleep(options.baseDelayMs * (attempt + 1));
  }
  if (!lastRes) {
    throw new Error(`POST ${url} did not return a response`);
  }
  return lastRes;
}


export async function fetchPatientByApi(
  request: APIRequestContext,
  id: string,
  token: string,
) {
  try {
    const res = await request.get(`${API_URL}/patients/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}

// jscpd:ignore-start
async function setupTestUserImpl(
  request: APIRequestContext,
  requestHeaders: Record<string, string> = {},
  options: {
    clinicType?: ClinicType;
    tier?: "ESSENTIAL" | "PROFESSIONAL" | "HOSPITAL" | "ENTERPRISE";
    planMode?: "FULL" | "FRONT_DESK" | "CORE";
  } = {},
): Promise<UserData> {
  const clinicType = options.clinicType ?? "GENERAL";
  const tier = options.tier ?? "ESSENTIAL";
  const planMode = options.planMode ?? "FULL";
  const isUnpaidEssentialTrial = tier === "ESSENTIAL";
// jscpd:ignore-end
  // Front Desk is mode-only (canonical tier + PlanMode FRONT_DESK) per
  // AGENTS.md §15.8 — the legacy FRONT_DESK* tier enum values are removed.
  const isFrontDesk = planMode === "FRONT_DESK";
  const usesTrialPayment = isUnpaidEssentialTrial || isFrontDesk;
  const onboardingAdminRole = isFrontDesk ? "ADMIN" : "ADMIN_DOCTOR";
  const uniqueId = randomUUID();
  const email = `doctor-${uniqueId}@test.com`;
  const password = TEST_PASSWORD;
  const clinicName = `Test Clinic ${uniqueId}`;
  const clinicEmail = `clinic-${uniqueId}@test.com`;
  const signatureBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxXQAAAAASUVORK5CYII=",
    "base64",
  );
  const clientIp = requestHeaders["X-Forwarded-For"] ?? createUniqueClientIp();
  const requestHeadersWithClientIp = {
    "X-Forwarded-For": clientIp,
    "x-docita-e2e": "true",
    ...requestHeaders,
  };

  const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    ...requestHeadersWithClientIp,
  });

  const registerRes = await postWithRetry(
    request,
    `${API_URL}/auth/register`,
    {
      headers: requestHeadersWithClientIp,
      data: {
        email,
        password,
        firstName: "Dr.",
        lastName: "History",
        role: "ADMIN_DOCTOR",
      },
    },
    { retries: 18, baseDelayMs: 1200 },
  );

  if (!registerRes.ok()) {
    throw new Error(`User registration failed: ${await registerRes.text()}`);
  }

  const registerData = await registerRes.json();
  let accessToken = registerData.access_token || registerData.accessToken;
  const registeredUserId = registerData.user.id;

  await verifyEmailIfNeeded(request, email, registerData.user?.emailVerified);

  const choosePathRes = await request.post(
    `${API_URL}/onboarding/choose-path`,
    {
      headers: authHeaders(accessToken),
      data: { path: "CREATE_CLINIC" },
    },
  );

  if (!choosePathRes.ok()) {
    throw new Error(`Choose path failed: ${await choosePathRes.text()}`);
  }

  const initRes = await request.post(`${API_URL}/onboarding/initialize`, {
    headers: authHeaders(accessToken),
    data: {},
  });

  if (!initRes.ok()) {
    throw new Error(
      `Onboarding initialization failed: ${await initRes.text()}`,
    );
  }

  const initData = await initRes.json();
  const onboardingId = initData.onboardingId;

  const signatureSessionRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/sla-signature-session`,
    {
      headers: authHeaders(accessToken),
    },
  );

  if (!signatureSessionRes.ok()) {
    throw new Error(
      `SLA signature session creation failed: ${await signatureSessionRes.text()}`,
    );
  }

  const signatureSessionParsed =
    uploadSessionCreateContractResponseSchema.safeParse(
      await signatureSessionRes.json(),
    );
  if (!signatureSessionParsed.success) throw new Error("SLA signature session response was invalid");
  const signatureSession = signatureSessionParsed.data;
  const signatureSessionId = signatureSession.id;
  const signatureUploadSecret = signatureSession.uploadSecret;

  const uploadSignatureRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${signatureSessionId}`,
    {
      headers: {
        ...authHeaders(accessToken),
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

  if (!uploadSignatureRes.ok()) {
    throw new Error(
      `SLA signature upload failed: ${await uploadSignatureRes.text()}`,
    );
  }

  // Paid-plan E2E fixtures create a real test order and sign it with the test
  // secret. Sidebar/front-desk fixtures exercise workspace access, so keep
  // them on the deterministic trial path instead of requiring Razorpay.
  const paymentDetails = usesTrialPayment
    ? { skipPayment: true }
    : await createTestPaymentDetails(request, onboardingId, {
        headers: authHeaders(accessToken),
        tier,
        customerEmail: email,
      });

  const completeRes = await request.post(
    `${API_URL}/onboarding/${onboardingId}/complete`,
    {
      headers: authHeaders(accessToken),
      data: {
        clinicDetails: {
          name: clinicName,
          email: clinicEmail,
          phone: "1234567890",
          address: "123 History Street, Hyderabad",
          type: clinicType,
          website: "",
          gstin: usesTrialPayment ? "" : E2E_PAID_PLAN_GSTIN,
        },
        adminAccount: {
          name: "Dr. History",
          email,
          role: onboardingAdminRole,
        },
        planSelection: {
          tier,
          billingCycle: "MONTHLY",
          currency: "INR",
          planMode,
        },
        paymentDetails,
        slaAgreement: {
          acceptedSLA: true,
          slaVersion: "1.0",
          acceptedBy: "Dr. History",
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

  if (!completeRes.ok()) {
    throw new Error(
      `Onboarding completion failed: ${await completeRes.text()}`,
    );
  }

  const completeData = await completeRes.json();
  if (completeData.success === false) {
    throw new Error(
      `Onboarding completion rejected: ${JSON.stringify(completeData.errors ?? completeData.message)}`,
    );
  }
  const userFromComplete = completeData.user ?? registerData.user;
  const clinicId = userFromComplete.clinicId || completeData.clinicId;
  if (!clinicId) throw new Error("Onboarding completion did not return a clinicId");

  // Guarantee the onboarding admin is email-verified. The pre-onboarding token
  // round-trip can race under load and silently skip, which then bounces the
  // user to the email-verification journey instead of the workspace.
  ensureEmailVerified(email);

  // Always perform a fresh login after onboarding completion.
  // The API associates the user to the clinic during onboarding; using a fresh
  // login avoids relying on onboarding response token shapes and ensures JWT
  // validation sees the latest persisted clinic association.
  const postOnboardingLoginRes = await request.post(`${API_URL}/auth/login`, {
    headers: {
      ...requestHeadersWithClientIp,
      Cookie: "XSRF-TOKEN=e2e-csrf-token",
      "X-XSRF-TOKEN": "e2e-csrf-token",
    },
    data: {
      email,
      password,
    },
  });

  if (!postOnboardingLoginRes.ok()) {
    throw new Error(
      `Post-onboarding login failed: ${await postOnboardingLoginRes.text()}`,
    );
  }

  const postOnboardingLoginData = await postOnboardingLoginRes.json();
  accessToken =
    postOnboardingLoginData.access_token ||
    postOnboardingLoginData.accessToken ||
    accessToken;
  const userId =
    postOnboardingLoginData.user?.id ??
    postOnboardingLoginData.userId ??
    registeredUserId;

  if (!isFrontDesk) {
    const tokenRes = await request.post(
      `${API_URL}/doctors/signature/generate-token`,
      {
        headers: authHeaders(accessToken),
      },
    );
    if (!tokenRes.ok()) {
      throw new Error(
        `Signature token generation failed: ${await tokenRes.text()}`,
      );
    }

    const tokenData = await tokenRes.json();
    const uploadToken = tokenData.token;

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
      throw new Error(
        `Doctor signature upload failed: ${await uploadRes.text()}`,
      );
    }

    const regNumberRes = await request.put(
      `${API_URL}/doctors/${userId}/registration-number`,
      {
        headers: authHeaders(accessToken),
        data: {
          registrationNumber: `REG-${uniqueId.slice(0, 8).toUpperCase()}`,
        },
      },
    );

    if (!regNumberRes.ok()) {
      throw new Error(
        `Doctor registration number update failed: ${await regNumberRes.text()}`,
      );
    }

    ensureDoctorVerified(userId);
  }

  return {
    id: userId,
    email,
    clinicId,
    accessToken,
  };
}

/**
 * Reuse one GENERAL onboarded user per Playwright worker when several spec files
 * each use `beforeAll` — avoids a second full onboarding if `setupTestUser`'s
 * global cache is not shared across file boundaries for a given run.
 */
let sharedGeneralClinicUser: Promise<UserData> | null = null;

export function reuseSharedGeneralClinicUser(
  request: APIRequestContext,
): Promise<UserData> {
  if (!sharedGeneralClinicUser) {
    sharedGeneralClinicUser = setupTestUser(request).catch((err: unknown) => {
      sharedGeneralClinicUser = null;
      throw err;
    });
  }
  return sharedGeneralClinicUser;
}

let sharedFrontDeskClinicUser: Promise<UserData> | null = null;

export function reuseSharedFrontDeskClinicUser(
  request: APIRequestContext,
): Promise<UserData> {
  if (!sharedFrontDeskClinicUser) {
    sharedFrontDeskClinicUser = setupTestUser(
      request,
      {},
      {
        tier: "ESSENTIAL",
        planMode: "FRONT_DESK",
      },
    ).catch((err: unknown) => {
      sharedFrontDeskClinicUser = null;
      throw err;
    });
  }
  return sharedFrontDeskClinicUser;
}

// jscpd:ignore-start
export async function setupTestUser(
  request: APIRequestContext,
  requestHeaders: Record<string, string> = {},
  options: {
    clinicType?: ClinicType;
    tier?: "ESSENTIAL" | "PROFESSIONAL" | "HOSPITAL" | "ENTERPRISE";
    planMode?: "FULL" | "FRONT_DESK" | "CORE";
  } = {},
): Promise<UserData> {
  const clinicType = options.clinicType ?? "GENERAL";
  const tier = options.tier ?? "ESSENTIAL";
  const planMode = options.planMode ?? "FULL";
  const shouldCache =
// jscpd:ignore-end
    Object.keys(requestHeaders).length === 0 && clinicType === "GENERAL";

  if (!shouldCache) {
    return await setupTestUserImpl(request, requestHeaders, {
      clinicType,
      tier,
      planMode,
    });
  }

  const cache = getSetupUserCache();
  const cacheKey = `setupTestUser:GENERAL:${tier}:${planMode}`;
  const existing = cache.get(cacheKey);
  if (existing) return await existing;

  const promise = setupTestUserImpl(request, requestHeaders, {
    clinicType,
    tier,
    planMode,
  });
  cache.set(cacheKey, promise);
  return await promise;
}

export async function loginUser(
  page: Page,
  user: UserData,
  options: { role?: string } = {},
) {
  const sessionUser = {
    id: user.id,
    email: user.email,
    role: options.role ?? "ADMIN_DOCTOR",
    clinicId: user.clinicId,
  };

  const loginRes = await page.request.post(`${API_URL}/auth/login`, {
    headers: { "x-docita-e2e": "true" },
    data: { email: user.email, password: TEST_PASSWORD },
  });
  if (!loginRes.ok()) {
    throw new Error(
      `UI login failed: ${loginRes.status()} ${await loginRes.text()}`,
    );
  }

  const loginData = await loginRes.json();
  const accessToken = readAccessTokenFromLoginResponse(loginData, user.accessToken);
  const refreshToken = readRefreshTokenFromLoginResponse(loginData);

  await page.context().addCookies([
    {
      name: "access_token",
      value: accessToken,
      url: `${APP_ORIGIN}/`,
      httpOnly: true,
      sameSite: "Lax" as const,
    },
    ...(refreshToken
      ? [
          {
            name: "refresh_token",
            value: refreshToken,
            url: `${APP_ORIGIN}/api/v1/auth/`,
            httpOnly: true,
            sameSite: "Lax" as const,
          },
        ]
      : []),
  ]);

  await page.addInitScript(
    ({
      clinicId,
      sessionData,
      token,
      tokenKey,
    }: {
      clinicId: string;
      sessionData: typeof sessionUser;
      token: string;
      tokenKey: string;
    }) => {
      try {
        sessionStorage.setItem(tokenKey, token);
        localStorage.setItem("docita_user", JSON.stringify(sessionData));
        localStorage.setItem("selectedClinicId", clinicId);
        localStorage.removeItem("selectedClinic");
        localStorage.removeItem("docita_token");
      } catch {
        // ignore
      }
    },
    {
      clinicId: user.clinicId,
      sessionData: sessionUser,
      token: accessToken,
      tokenKey: E2E_ACCESS_TOKEN_SESSION_KEY,
    },
  );

  await page.goto("/e2e-session-seed", { waitUntil: "domcontentloaded" });
}
