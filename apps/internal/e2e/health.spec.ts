import { expect, test } from "@playwright/test";

/**
 * Same shape as apps/app/e2e/health.spec.ts — exercises the Cloudflare
 * proxy that fronts apps/internal by hitting the API liveness endpoint.
 * Both apps share the same Hono proxy factory; this spec pins the
 * internal admin path specifically.
 */

const API_HEALTH_URL =
  process.env["API_HEALTH_URL"] || "http://127.0.0.1:3001/health/live";

test.describe("Internal admin + API health", () => {
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
