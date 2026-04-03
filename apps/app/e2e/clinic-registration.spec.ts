import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/patient-helpers";

test.describe("Clinic Registration Flow", () => {
  async function registerAndOpenOnboarding(
    page: import("@playwright/test").Page,
    request: import("@playwright/test").APIRequestContext,
    options?: { completeOnboarding?: boolean },
  ) {
    const completeOnboarding = options?.completeOnboarding ?? true;
    const uniqueId = randomUUID();
    const email = `owner-${uniqueId}@example.com`;
    const password = "Test@123456";
    const forwardedFor = `127.0.0.${Math.floor(Math.random() * 200) + 1}`;

    const registerRes = await request.post(`${API_URL}/auth/register`, {
      headers: {
        "X-Forwarded-For": forwardedFor,
      },
      data: {
        email,
        password,
        firstName: "Clinic",
        lastName: "Owner",
        role: "ADMIN",
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    const registerData = await registerRes.json();
    const authToken = registerData.access_token || registerData.accessToken;
    await page.context().addCookies([
      {
        name: "access_token",
        value: authToken,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    if (registerData.refresh_token || registerData.refreshToken) {
      await page.context().addCookies([
        {
          name: "refresh_token",
          value: registerData.refresh_token || registerData.refreshToken,
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
      { user: registerData.user, token: authToken },
    );
    await page.context().addInitScript(
      ({ user, token }) => {
        const originalFetch = window.fetch.bind(window);

        window.fetch = async (input, init) => {
          const url = typeof input === "string" ? input : input.url;

          if (url.includes("/auth/validate")) {
            return new Response(JSON.stringify({ user }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            });
          }

          if (url.includes("/auth/refresh")) {
            return new Response(JSON.stringify({ access_token: token }), {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            });
          }

          return originalFetch(input, init);
        };
      },
      { user: registerData.user, token: authToken },
    );
    await page.context().route("**/auth/validate**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: registerData.user }),
      });
    });
    await page.context().route("**/auth/refresh**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: authToken }),
      });
    });

    if (!completeOnboarding) {
      await page.goto("/onboarding");
      await page.waitForURL(/\/onboarding/, { timeout: 30000 });
      await expect(page.getByText("Step 1: Clinic Details")).toBeVisible({
        timeout: 30000,
      });
      await expect(
        page.getByRole("button", { name: "Next: Choose Plan" }),
      ).toBeVisible({ timeout: 30000 });
      return;
    }

    const choosePathRes = await request.post(`${API_URL}/onboarding/choose-path`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: { path: "CREATE_CLINIC" },
    });
    expect(choosePathRes.ok()).toBeTruthy();

    const initRes = await request.post(`${API_URL}/onboarding/initialize`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {},
    });
    expect(initRes.ok()).toBeTruthy();
    const initData = await initRes.json();
    const onboardingId = initData.onboardingId;
    const signatureSessionRes = await request.post(
      `${API_URL}/onboarding/${onboardingId}/sla-signature-session`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    expect(signatureSessionRes.ok()).toBeTruthy();
    const signatureSessionData = await signatureSessionRes.json();
    const signatureSessionId = signatureSessionData.id;

    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxXQAAAAASUVORK5CYII=",
      "base64",
    );
    const uploadSignatureRes = await request.post(
      `${API_URL}/onboarding/${onboardingId}/sla-signature-session/${signatureSessionId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        multipart: {
          file: {
            name: "signature.png",
            mimeType: "image/png",
            buffer: pngBuffer,
          },
        },
      },
    );
    expect(uploadSignatureRes.ok()).toBeTruthy();

    const completeRes = await request.post(
      `${API_URL}/onboarding/${onboardingId}/complete`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          clinicDetails: {
            name: `E2E Clinic ${uniqueId}`,
            email: `clinic${uniqueId}@example.com`,
            phone: "1234567890",
            address: "123 Tech Park, Cyber City",
            type: "GENERAL",
            website: "",
            gstin: "",
          },
          adminAccount: {
            name: "Clinic Owner",
            email,
            role: "ADMIN",
          },
          planSelection: {
            tier: "STARTER",
            billingCycle: "MONTHLY",
            currency: "INR",
          },
          slaAgreement: {
            acceptedSLA: true,
            slaVersion: "1.0",
            acceptedBy: "Clinic Owner",
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

    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  }

  test("should complete full clinic registration wizard", async ({ page, request }) => {
    await registerAndOpenOnboarding(page, request);
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  });

});
