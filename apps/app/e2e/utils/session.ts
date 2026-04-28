import type { Page } from "@playwright/test";

export async function seedSession(
  page: Page,
  params: {
    token: string;
    user: { id: string; email: string; role: string; clinicId: string };
  },
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
    { token: params.token, user: params.user },
  );
}

