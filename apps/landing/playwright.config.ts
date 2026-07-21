import { defineConfig, devices } from "@playwright/test";

const APP_URL = process.env["APP_URL"] || "http://127.0.0.1:3003";

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
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "tablet-chrome",
      use: {
        ...devices["iPad Pro 11"],
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "pnpm exec astro dev --port 3003 --host 127.0.0.1",
    url: APP_URL,
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
  },
});
