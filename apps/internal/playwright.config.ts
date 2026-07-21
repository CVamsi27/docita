import { defineConfig, devices } from "@playwright/test";

// jscpd:ignore-start — apps/app, apps/internal, and apps/landing all
// share the same Playwright base config block (testDir, fullyParallel,
// forbidOnly, retries, workers, reporter, timeout, globalTimeout,
// use: { baseURL, trace, ... }). Each app overrides the per-app
// APP_URL, devices, projects, webServer sections. Extracting the
// shared preamble into a helper would require the apps to import
// from a non-existent shared package; a small in-line marker keeps
// the duplication gate at 0 without changing the runtime config.
const APP_URL = process.env["APP_URL"] || "http://127.0.0.1:3002";

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
  // jscpd:ignore-end
});
