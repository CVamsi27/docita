import { defineConfig, devices } from "@playwright/test";

const APP_URL = process.env["APP_URL"] || "http://localhost:3000";
const API_HEALTH_URL =
  process.env["API_HEALTH_URL"] || "http://127.0.0.1:3001/api/health/live";
const skipServer = process.env["SKIP_SERVER"] === "true";
const publicOnlyAudit = process.env["AUDIT_APP_PUBLIC_ONLY"] === "true";

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: false,

  forbidOnly: !!process.env["CI"],

  retries: process.env["CI"] ? 2 : 0,

  workers: 1,

  reporter: "html",

  timeout: 120000,

  globalTimeout: 1200000,

  use: {
    baseURL: APP_URL,

    trace: "on-first-retry",
    screenshot: "only-on-failure",

    navigationTimeout: 60000,
    actionTimeout: 30000,
  },

  expect: {
    timeout: 15000,
  },

  webServer: skipServer
    ? undefined
    : publicOnlyAudit
      ? [
          {
            command: "pnpm --filter @docita/app run dev",
            url: APP_URL,
            reuseExistingServer: true,
            timeout: 180_000,
          },
        ]
      : [
          {
            command: "pnpm --filter @docita/api run dev",
            url: API_HEALTH_URL,
            reuseExistingServer: true,
            timeout: 180_000,
          },
          {
            command: "pnpm --filter @docita/app run dev",
            url: APP_URL,
            reuseExistingServer: true,
            timeout: 180_000,
          },
        ],

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
