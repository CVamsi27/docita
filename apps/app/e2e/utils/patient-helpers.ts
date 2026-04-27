import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { APIRequestContext, Page } from "@playwright/test";
import {
  clinicSchema,
  validateSessionResponseSchema,
  type ClinicType,
} from "@workspace/types";

export const API_URL = process.env["API_URL"] || "http://127.0.0.1:3001/api/v1";
export const TEST_PASSWORD = "Test@123456";

export interface UserData {
  id: string;
  email: string;
  clinicId: string;
  accessToken: string;
}

export interface BasicAuthUserData extends UserData {
  role: string;
}

type SetupUserCache = Map<string, Promise<UserData>>;

function getSetupUserCache(): SetupUserCache {
  const key = "__docitaE2ESetupUserCache";
  const globalAny = globalThis as unknown as Record<string, unknown>;
  const existing = globalAny[key] as SetupUserCache | undefined;
  if (existing) return existing;
  const created: SetupUserCache = new Map();
  globalAny[key] = created;
  return created;
}

function getRepoRoot(): string {
  // Playwright can run from repo root or package root; walk up to find the monorepo root.
  let current = resolve(process.cwd());
  while (true) {
    if (
      existsSync(resolve(current, "pnpm-workspace.yaml")) ||
      existsSync(resolve(current, "turbo.json")) ||
      existsSync(resolve(current, "package.json"))
    ) {
      // Prefer the highest directory that still looks like the repo root.
      const parent = resolve(current, "..");
      const parentLooksLikeRepo =
        existsSync(resolve(parent, "pnpm-workspace.yaml")) ||
        existsSync(resolve(parent, "turbo.json"));
      if (!parentLooksLikeRepo) {
        return current;
      }
    }

    const parent = resolve(current, "..");
    if (parent === current) {
      return process.cwd();
    }
    current = parent;
  }
}

function readDatabaseUrl(): string {
  const fromEnv = process.env["DATABASE_URL"]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const envPath = resolve(getRepoRoot(), ".env");
  if (!existsSync(envPath)) {
    throw new Error(
      "DATABASE_URL was not found in process.env and repository .env is missing.",
    );
  }
  const file = readFileSync(envPath, "utf8");

  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    const value = line.slice("DATABASE_URL=".length).trim();
    if (!value) break;
    return value.replace(/^"(.*)"$/, "$1");
  }

  throw new Error("DATABASE_URL was not found in process.env or the repository .env file.");
}

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
        cwd: getRepoRoot(),
        env: {
          ...process.env,
          DATABASE_URL: readDatabaseUrl(),
          VERIFICATION_EMAIL: email,
        },
        encoding: "utf8",
      },
    ).trim();
  } catch {
    return null;
  }

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
    throw new Error(`Email verification failed: ${await verifyEmailRes.text()}`);
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
  return lastRes!;
}

/**
 * Fast auth setup for UI tests.
 *
 * Unlike `setupTestUser`, this avoids onboarding and email verification (which
 * can require DB access in some environments).
 */
export async function setupAuthUser(
  request: APIRequestContext,
  requestHeaders: Record<string, string> = {},
  options: { role?: "DOCTOR" | "ADMIN" | "ADMIN_DOCTOR"; clinicName?: string } = {},
): Promise<BasicAuthUserData> {
  const uniqueId = randomUUID();
  const email = `doctor-${uniqueId}@test.com`;
  const password = TEST_PASSWORD;
  const role = options.role ?? "ADMIN_DOCTOR";
  const clinicName = options.clinicName ?? `Test Clinic ${uniqueId}`;
  const clientIp = requestHeaders["X-Forwarded-For"] ?? createUniqueClientIp();
  const headers = { "X-Forwarded-For": clientIp, ...requestHeaders };

  const registerRes = await postWithRetry(
    request,
    `${API_URL}/auth/register`,
    {
      headers,
      data: {
        email,
        password,
        firstName: "Test",
        lastName: "Doctor",
        role,
        clinicName,
      },
    },
    { retries: 8, baseDelayMs: 800 },
  );

  if (!registerRes.ok()) {
    throw new Error(`User registration failed: ${await registerRes.text()}`);
  }

  const registerData = await registerRes.json();
  const accessToken = registerData.access_token || registerData.accessToken;
  const user = registerData.user ?? registerData;

  return {
    id: user.id,
    email: user.email ?? email,
    clinicId: user.clinicId ?? "",
    accessToken,
    role: user.role ?? role,
  };
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

async function setupTestUserImpl(
  request: APIRequestContext,
  requestHeaders: Record<string, string> = {},
  options: { clinicType?: ClinicType } = {},
): Promise<UserData> {
  const clinicType = options.clinicType ?? "GENERAL";
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
  const userId = registerData.user.id;

  await verifyEmailIfNeeded(
    request,
    email,
    registerData.user?.emailVerified,
  );

  const choosePathRes = await request.post(`${API_URL}/onboarding/choose-path`, {
    headers: authHeaders(accessToken),
    data: { path: "CREATE_CLINIC" },
  });

  if (!choosePathRes.ok()) {
    throw new Error(`Choose path failed: ${await choosePathRes.text()}`);
  }

  const initRes = await request.post(`${API_URL}/onboarding/initialize`, {
    headers: authHeaders(accessToken),
    data: {},
  });

  if (!initRes.ok()) {
    throw new Error(`Onboarding initialization failed: ${await initRes.text()}`);
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
    throw new Error(`SLA signature session creation failed: ${await signatureSessionRes.text()}`);
  }

  const signatureSession = await signatureSessionRes.json();
  const signatureSessionId = signatureSession.id;

  const uploadSignatureRes = await request.post(
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

  if (!uploadSignatureRes.ok()) {
    throw new Error(`SLA signature upload failed: ${await uploadSignatureRes.text()}`);
  }

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
          gstin: "",
        },
        adminAccount: {
          name: "Dr. History",
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
    throw new Error(`Onboarding completion failed: ${await completeRes.text()}`);
  }

  const completeData = await completeRes.json();
  accessToken = completeData.access_token || completeData.accessToken || accessToken;
  const userFromComplete = completeData.user ?? registerData.user;
  const clinicId = userFromComplete.clinicId || completeData.clinicId;

  const tokenRes = await request.post(`${API_URL}/doctors/signature/generate-token`, {
    headers: authHeaders(accessToken),
  });
  if (!tokenRes.ok()) {
    throw new Error(`Signature token generation failed: ${await tokenRes.text()}`);
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
    throw new Error(`Doctor signature upload failed: ${await uploadRes.text()}`);
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
    throw new Error(`Doctor registration number update failed: ${await regNumberRes.text()}`);
  }

  return {
    id: userId,
    email,
    clinicId,
    accessToken,
  };
}

export async function setupTestUser(
  request: APIRequestContext,
  requestHeaders: Record<string, string> = {},
  options: { clinicType?: ClinicType } = {},
): Promise<UserData> {
  const clinicType = options.clinicType ?? "GENERAL";
  const shouldCache =
    Object.keys(requestHeaders).length === 0 && clinicType === "GENERAL";

  if (!shouldCache) {
    return await setupTestUserImpl(request, requestHeaders, options);
  }

  const cache = getSetupUserCache();
  const cacheKey = "setupTestUser:GENERAL";
  const existing = cache.get(cacheKey);
  if (existing) {
    return await existing;
  }

  const promise = setupTestUserImpl(request, requestHeaders, options);
  cache.set(cacheKey, promise);
  return await promise;
}

export async function loginUser(page: Page, user: UserData) {
  const appOrigin = new URL(process.env.APP_URL ?? "http://127.0.0.1:3000").origin;
  const validateRes = await page.request.get(`${API_URL}/auth/validate`, {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "x-docita-e2e": "true",
    },
  });

  if (!validateRes.ok()) {
    throw new Error(`Session validation failed: ${await validateRes.text()}`);
  }

  const session = validateSessionResponseSchema.parse(await validateRes.json());
  const clinicRes = await page.request.get(`${API_URL}/clinic/settings`, {
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "x-docita-e2e": "true",
    },
  });

  if (!clinicRes.ok()) {
    throw new Error(`Clinic session validation failed: ${await clinicRes.text()}`);
  }

  const clinicData = clinicSchema.parse(await clinicRes.json());
  const clinicStorage = JSON.stringify(clinicData);
  const clinicId = clinicData.id;

  await page.context().addCookies([
    {
      name: "XSRF-TOKEN",
      value: "e2e-csrf-token",
      domain: "127.0.0.1",
      path: "/",
    },
    {
      name: "access_token",
      value: user.accessToken,
      url: `${appOrigin}/`,
    },
  ]);

  await page.addInitScript(
    ({
      clinicId,
      clinicStorage,
      sessionData,
      token,
    }: {
      clinicId: string;
      clinicStorage: string;
      sessionData: typeof session;
      token: string;
    }) => {
      localStorage.setItem("docita_user", JSON.stringify(sessionData.user));
      localStorage.setItem("docita_token", token);
      localStorage.setItem("selectedClinicId", clinicId);
      localStorage.setItem("selectedClinic", clinicStorage);
      document.cookie = "XSRF-TOKEN=e2e-csrf-token; path=/";
    },
    {
      clinicId,
      clinicStorage,
      sessionData: session,
      token: user.accessToken,
    },
  );

  await page.goto("/dashboard");
}
