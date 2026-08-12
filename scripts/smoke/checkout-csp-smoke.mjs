#!/usr/bin/env node

/**
 * Checkout CSP smoke (P5.10).
 *
 * Verifies the deployed Content-Security-Policy on the app origin does not
 * break the Razorpay checkout: the SDK script must load
 * (`script-src https://checkout.razorpay.com`), the order request must reach
 * Razorpay (`connect-src`), and the checkout modal must open without CSP
 * violations (`frame-src`).
 *
 * BLOCKED status: the live checkout needs a Razorpay test order, which needs
 * Razorpay test credentials + a staging API run to create the order. Until
 * then this script SKIPS (exit 0) with a clear message — a run that cannot
 * execute must be reported as blocked, not faked green (plan rule). Once the
 * credentials exist, run it against staging and wire it into the merge/smoke
 * surface:
 *
 *   RAZORPAY_SMOKE_KEY_ID=rzp_test_xxx \
 *   RAZORPAY_SMOKE_ORDER_ID=order_xxx \
 *   APP_URL=https://staging.docita.work \
 *   node scripts/smoke/checkout-csp-smoke.mjs
 *
 * The check itself: navigate to the app origin, load
 * `https://checkout.razorpay.com/v1/checkout.js` exactly the way
 * `useRazorpay` does, construct an instance with the test order, open the
 * modal, then fail on any console message or page error containing
 * `Content Security Policy` / `Refused to` / `violates`.
 */
import process from "node:process";

import { chromium } from "@playwright/test";

const APP_URL = process.env["APP_URL"] || "http://localhost:3000";
const KEY_ID = process.env["RAZORPAY_SMOKE_KEY_ID"];
const ORDER_ID = process.env["RAZORPAY_SMOKE_ORDER_ID"];
const CHANNEL = process.env["PERF_WEB_VITALS_CHANNEL"] || "chrome";

if (!KEY_ID || !ORDER_ID) {
  process.stdout.write(
    "[checkout-csp-smoke] SKIPPED (blocked): Razorpay test credentials are not configured. " +
      "Set RAZORPAY_SMOKE_KEY_ID + RAZORPAY_SMOKE_ORDER_ID (from a staging checkout order) " +
      "to run the live CSP checkout smoke.\n",
  );
  process.exit(0);
}

const browser = await chromium.launch({
  channel: CHANNEL === "chromium" ? undefined : CHANNEL,
});

const cspViolations = [];
const pageErrors = [];

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (/Content Security Policy|Refused to|violates/i.test(text)) {
      cspViolations.push(text);
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });

  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(500);

  // Load the SDK exactly like `useRazorpay` (`apps/app/src/hooks/use-razorpay.ts`).
  const sdkLoaded = await page.evaluate(
    () =>
      new Promise((resolve) => {
        if (typeof window.Razorpay === "function") {
          resolve(true);
          return;
        }
        const script = document.createElement("script");
        script.id = "razorpay-sdk";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(typeof window.Razorpay === "function");
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      }),
  );

  if (!sdkLoaded) {
    // Likely the CSP script-src blocked the SDK — surface the console evidence.
    await browser.close();
    console.error(
      "[checkout-csp-smoke] FAIL: Razorpay SDK did not load. Console evidence:",
    );
    for (const violation of cspViolations) console.error(`  - ${violation}`);
    process.exit(1);
  }

  // Open the checkout modal with the test order — exercises connect-src
  // (order fetch) and frame-src (modal iframe).
  const modalOpened = await page.evaluate(
    ({ key, orderId }) =>
      new Promise((resolve) => {
        const rzp = new window.Razorpay({
          key,
          order_id: orderId,
          amount: 100,
          currency: "INR",
          name: "Docita CSP smoke",
          handler: () => resolve(false),
          modal: {
            escape: true,
            backdropclose: true,
            ondismiss: () => resolve(false),
          },
          prefill: { name: "CSP Smoke", email: "csp-smoke@example.com" },
        });
        rzp.on("payment.failed", () => resolve(false));
        // The modal renders an iframe from checkout.razorpay.com; resolve when
        // the iframe appears. Bound to 15 s so a blocked/absent modal fails
        // fast instead of polling forever.
        const deadline = Date.now() + 15000;
        const check = () => {
          if (document.querySelector("iframe[src*=razorpay]")) {
            resolve(true);
            return;
          }
          if (Date.now() > deadline) {
            resolve(false);
            return;
          }
          window.setTimeout(check, 250);
        };
        try {
          rzp.open();
          window.setTimeout(check, 250);
        } catch {
          resolve(false);
        }
      }),
    { key: KEY_ID, orderId: ORDER_ID },
  );

  await page.waitForTimeout(1500);
  await browser.close();

  if (cspViolations.length > 0 || pageErrors.length > 0) {
    console.error("[checkout-csp-smoke] FAIL: CSP violations or page errors:");
    for (const violation of cspViolations) console.error(`  console: ${violation}`);
    for (const error of pageErrors) console.error(`  pageerror: ${error}`);
    process.exit(1);
  }

  if (!modalOpened) {
    console.error(
      "[checkout-csp-smoke] FAIL: Razorpay checkout modal did not open (order/network issue or frame-src block).",
    );
    process.exit(1);
  }

  process.stdout.write(
    "[checkout-csp-smoke] OK — Razorpay SDK loaded and checkout modal opened with no CSP violations.\n",
  );
} catch (error) {
  await browser.close().catch(() => {});
  console.error("[checkout-csp-smoke] ERROR:", error instanceof Error ? error.message : error);
  process.exit(1);
}
