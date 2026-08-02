import { defineConfig, devices } from "@playwright/test";
import { VIEWPORT_PRESETS } from "./e2e/utils/viewport-presets";

const APP_URL = process.env["APP_URL"] || "http://localhost:3002";
const API_HEALTH_URL =
  process.env["API_HEALTH_URL"] || "http://127.0.0.1:3001/api/health/live";
const skipServer = process.env["SKIP_SERVER"] === "true";
const LOCAL_UPSTREAM_API_URL =
  process.env["API_URL"] || "http://127.0.0.1:3001/api/v1";
const LOCAL_UPSTREAM_API_ORIGIN = new URL(LOCAL_UPSTREAM_API_URL).origin;

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: false,

  forbidOnly: !!process.env["CI"],

  retries: process.env["CI"] ? 2 : 0,

  workers: 1,

  reporter: "html",

  timeout: 120000,

  globalTimeout: 2400000,

  use: {
    baseURL: APP_URL,

    trace: "on-first-retry",
    screenshot: "only-on-failure",

    // The internal app is an admin tool without a service worker; keep this
    // aligned with the app-vite config so cross-app E2E behaviour stays
    // identical (cached index.html can never serve stale markup).
    serviceWorkers: "block",

    navigationTimeout: 60000,
    actionTimeout: 30000,
  },

  expect: {
    timeout: 15000,
  },

  webServer: skipServer
    ? undefined
    : [
        {
          command: "pnpm --filter @docita/api run dev",
          url: API_HEALTH_URL,
          reuseExistingServer: true,
          timeout: 180_000,
        },
        {
          command: "pnpm --filter @docita/internal-vite run dev",
          url: APP_URL,
          reuseExistingServer: true,
          env: {
            ...process.env,
            API_URL: LOCAL_UPSTREAM_API_URL,
            API_PROXY_TARGET: LOCAL_UPSTREAM_API_ORIGIN,
          },
          timeout: 180_000,
        },
      ],

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: VIEWPORT_PRESETS.mobile,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "tablet-chrome",
      use: {
        ...devices["iPad Pro 11"],
        viewport: VIEWPORT_PRESETS.tablet,
        hasTouch: true,
        isMobile: false,
      },
    },
    {
      name: "laptop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: VIEWPORT_PRESETS.laptop,
      },
    },
  ],
});
