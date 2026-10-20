import { expect, test } from "@playwright/test";

/**
 * The Cloudflare-deployed Vite app is a static bundle — there is no app
 * server to ping. The user-facing liveness check is the API proxy
 * (`/api/v1/*` is routed by the Worker to the upstream API). The
 * upstream API's `/health/live` endpoint returns the canonical liveness
 * payload, so the smoke below exercises both halves of the deployment
 * (Cloudflare Worker + API) end-to-end.
 *
 * See apps/app/playwright.config.ts for the API_HEALTH_URL resolution
 * (env override → 127.0.0.1:3001 default).
 */

const API_HEALTH_URL =
  process.env["API_HEALTH_URL"] || "http://127.0.0.1:3001/api/health/live";

test.describe("App + API health", () => {
  test("GET /api/v1/* proxy reaches the API liveness endpoint", async ({
    request,
  }) => {
    const res = await request.get(API_HEALTH_URL);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", service: "docita-api" });
    expect(typeof body.uptime).toBe("number");
  });
});
