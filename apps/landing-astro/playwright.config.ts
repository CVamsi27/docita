import { defineConfig, devices } from "@playwright/test";

const APP_URL = process.env["APP_URL"] || "http://localhost:3004";

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
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: APP_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
  },
});
