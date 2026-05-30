import type { Page } from "@playwright/test";
import { E2E_ACCESS_TOKEN_SESSION_KEY } from "./e2e-session-token-key";

export async function seedSession(
  page: Page,
  params: {
    token: string;
    user: { id: string; email: string; role: string; clinicId: string };
  },
) {
  await page.addInitScript(
    ({ token, user, tokenKey }) => {
      try {
        sessionStorage.setItem(tokenKey, token);
        localStorage.setItem("docita_user", JSON.stringify(user));
        localStorage.setItem("selectedClinicId", user.clinicId);
        localStorage.removeItem("selectedClinic");
        localStorage.removeItem("docita_token");
      } catch {
        // ignore
      }
    },
    {
      token: params.token,
      user: params.user,
      tokenKey: E2E_ACCESS_TOKEN_SESSION_KEY,
    },
  );
}
