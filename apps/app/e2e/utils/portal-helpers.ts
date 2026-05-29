import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIRequestContext, Page } from "@playwright/test";
import { z } from "zod";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { API_URL, reuseSharedGeneralClinicUser } from "./patient-helpers";

export const PORTAL_E2E_OTP = "123456";

const portalVerifyOtpResponseSchema = z.object({
  access_token: z.string().optional(),
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      role: z.string(),
    })
    .optional(),
});

function getRepoRoot(): string {
  let current = resolve(process.cwd());
  while (true) {
    if (
      existsSync(resolve(current, "pnpm-workspace.yaml")) ||
      existsSync(resolve(current, "turbo.json"))
    ) {
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

function readDatabaseUrl(): string | null {
  const fromEnv = process.env["DATABASE_URL"]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const envPath = resolve(getRepoRoot(), ".env");
  if (!existsSync(envPath)) {
    return null;
  }

  const file = readFileSync(envPath, "utf8");
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    const value = line.slice("DATABASE_URL=".length).trim();
    if (!value) break;
    return value.replace(/^"(.*)"$/, "$1");
  }

  return null;
}

export function insertPortalE2eOtp(phoneNumber: string): boolean {
  const databaseUrl = readDatabaseUrl();
  if (!databaseUrl) {
    return false;
  }

  try {
    execFileSync(
      "node",
      [
        "-r",
        "ts-node/register/transpile-only",
        "apps/api/scripts/insert-patient-portal-e2e-otp.ts",
      ],
      {
        cwd: getRepoRoot(),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          PORTAL_E2E_PHONE: phoneNumber,
          PORTAL_E2E_OTP,
        },
        encoding: "utf8",
      },
    );
    return true;
  } catch {
    return false;
  }
}

export async function createPortalPatientPhone(
  request: APIRequestContext,
): Promise<string | null> {
  const staff = await reuseSharedGeneralClinicUser(request);
  const phoneNumber = `98${Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0")}`;

  const patientRes = await request.post(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${staff.accessToken}` },
    data: {
      firstName: "Portal",
      lastName: "MobileE2E",
      phoneNumber,
      gender: "MALE",
      dateOfBirth: "1990-01-01",
      clinicId: staff.clinicId,
      dpdpConsent: {
        accepted: true,
        noticeVersion: DPDP_NOTICE_VERSION,
        givenByName: "Portal MobileE2E",
      },
    },
  });

  if (!patientRes.ok()) {
    return null;
  }

  return phoneNumber;
}

export async function loginPortalPatient(
  page: Page,
  phoneNumber: string,
): Promise<boolean> {
  if (!insertPortalE2eOtp(phoneNumber)) {
    return false;
  }

  const verifyRes = await page.request.post(
    "/api/v1/patient-portal/auth/verify-otp",
    {
      data: {
        phoneNumber,
        otp: PORTAL_E2E_OTP,
      },
    },
  );

  if (!verifyRes.ok()) {
    return false;
  }

  const raw: unknown = await verifyRes.json();
  const payload = portalVerifyOtpResponseSchema.safeParse(raw);

  if (
    payload.success &&
    payload.data.access_token &&
    payload.data.user
  ) {
    await page.addInitScript(
      ({ token, user }) => {
        try {
          localStorage.setItem("docita_token", token);
          localStorage.setItem("docita_user", JSON.stringify(user));
        } catch {
          // ignore
        }
      },
      {
        token: payload.data.access_token,
        user: payload.data.user,
      },
    );
  }

  return true;
}

export async function expectPortalShellLoaded(page: Page) {
  await page
    .getByRole("status", { name: "Loading patient portal" })
    .waitFor({ state: "hidden", timeout: 60000 })
    .catch(() => undefined);
  await page.getByRole("link", { name: "Dashboard" }).first().waitFor({
    state: "visible",
    timeout: 30000,
  });
}
