import { execFileSync } from "node:child_process";
import type { APIRequestContext, Page } from "@playwright/test";
import {
  DPDP_NOTICE_VERSION,
  tokenIssueResponseSchema,
} from "@workspace/types";
import { API_URL, reuseSharedGeneralClinicUser } from "./patient-helpers";
import { findRepoRoot, readRepoDatabaseUrl } from "./repo-root";

const PORTAL_E2E_OTP = "123456";

/**
 * The OTP verification response, read through the shared session contract.
 *
 * This used to redeclare the shape with **every** field optional, which meant
 * `safeParse({})` succeeded. If the endpoint stopped returning a token, the
 * helper below would take the "parsed fine" branch, seed no session, and the
 * suite would go on asserting against the portal's logged-out state — a green
 * run proving nothing. `tokenIssueResponseSchema` requires both `access_token`
 * and `user`, so a truncated response now fails loudly.
 */
const portalVerifyOtpResponseSchema = tokenIssueResponseSchema;

function insertPortalE2eOtp(phoneNumber: string): boolean {
  const databaseUrl = readRepoDatabaseUrl();
  if (!databaseUrl) return false;

  try {
    execFileSync(
      "node",
      [
        "-r",
        "ts-node/register/transpile-only",
        "apps/api/scripts/insert-patient-portal-e2e-otp.ts",
      ],
      {
        cwd: findRepoRoot(),
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

  // A 2xx response is not the same as a usable session. This used to fall
  // through to an unconditional `return true`, so when the body did not carry
  // a token the helper reported success, the caller's
  // `if (!loggedIn) testInfo.skip(...)` never fired, and the run continued
  // asserting against the portal's logged-out shell — a confusing timeout
  // instead of the clean skip the boolean was there to produce.
  if (!payload.success) {
    return false;
  }

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
