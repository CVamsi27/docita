#!/usr/bin/env node
// Verifies that runtime-affecting env vars declared in `.env.example`
// (and app/-local `.env.example` files) are listed in `turbo.json`
// `globalEnv` (or the per-task `env` lists) so Turbo invalidates the
// build cache when they change.
//
// Missing globalEnv entries cause "stale build" bugs after env updates.
// SYSTEM_DESIGN_AND_PATTERNS.md §56 item 51.
//
// Advisory by default. Promote to blocking once the existing list is clean.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = process.env.DOCITA_CHECK_ROOT ?? join(__dirname, "..", "..");

const ENV_FILES = [
  ".env.example",
  "apps/api/.env.example",
  "apps/app-vite/.env.example",
  "apps/internal-vite/.env.example",
  "apps/landing/.env.example",
  "apps/worker/.env.example",
];

// Env vars that intentionally never propagate to Turbo (secrets read only
// at runtime by the API process, never by Next/Astro builds).
const ALLOWLIST = new Set([
  "PORT",
  "CPU_COUNT",
  "LOG_LEVEL",
  "APP_VERSION",
  "API_LOG_MODE",
  "SECRETS_PROVIDER",
  "ENCRYPTION_KEY",
  "ENCRYPTION_KEY_V2",
  "ENCRYPTION_KEY_V3",
  "ENCRYPTION_KEY_V4",
  "ENCRYPTION_KEY_V5",
  "ANALYTICS_CACHE_TTL",
  "PAYMENT_LINK_TTL_MINUTES",
  "BULK_IMPORT_MAX_FILE_SIZE",
  "BULK_IMPORT_MAX_ROWS",
  "BULK_IMPORT_RATE_LIMIT_INTERVAL",
  "SLOW_QUERY_THRESHOLD_MS",
  "REQUEST_TIMEOUT_MS",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "WHATSAPP_PRODUCTION_MODE",
  "META_ACCESS_TOKEN",
  "META_PHONE_NUMBER_ID",
  "META_APP_SECRET",
  "META_VERIFY_TOKEN",
  "META_BUSINESS_ACCOUNT_ID",
  "AI_API_KEY",
  "OPENAI_MODEL",
  "AI_REQUEST_TIMEOUT",
  "AI_CACHE_ENABLED",
  "AI_CACHE_TTL",
  "ZEPTOMAIL_SENDMAIL_TOKEN",
  "ZEPTOMAIL_API_URL",
  "EMAIL_FROM",
  "SMS_API_KEY",
  "SMS_SENDER_ID",
  "DOCTOR_VERIFICATION_API_URL",
  "DOCTOR_VERIFICATION_API_KEY",
  "CPT_CATALOG_SOURCE",
  "CPT_LICENSED_API_URL",
  "CPT_LICENSED_API_KEY",
  "CPT_LICENSED_SEARCH_PATH",
  "CPT_LICENSED_SYNC_PATH",
  "STORAGE_PROVIDER",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "SENTRY_DSN",
  "SENTRY_TRACES_SAMPLE_RATE",
  "SENTRY_PROFILES_SAMPLE_RATE",
  "SENTRY_PROFILING",
  "SENTRY_AUTH_TOKEN",
  "QUEUE_BACKEND",
  "WORKER_ENTRYPOINT",
  "CORS_ORIGINS",
  "JWT_EXPIRATION",
  "DOCITA_API_BASE",
  "RLS_ENABLED",
  // Sentry-tied — already in `env` per task in turbo.json
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_PROJECT",
  // Public toggles already injected via Next env
  "NEXT_PUBLIC_ANALYTICS_URL",
  "NEXT_PUBLIC_ENABLE_CONSOLE_TOASTS",
  "NEXT_PUBLIC_CAPTURE_CONSOLE_INFO",
  "NEXT_PUBLIC_CAPTURE_CONSOLE_WARNINGS",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER",
  "NEXT_PUBLIC_CLINIC_NAME",
  "NEXT_PUBLIC_ENABLE_TOOLS",
  "NEXT_PUBLIC_ENABLE_VISUAL_TESTS",
]);

function parseEnvKeys(text) {
  const keys = new Set();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (/^[A-Z][A-Z0-9_]*$/.test(key)) {
      keys.add(key);
    }
  }
  return keys;
}

function parseTurboEnv(turboJson) {
  const json = JSON.parse(turboJson);
  const all = new Set();
  for (const k of json.globalEnv ?? []) all.add(k);
  for (const task of Object.values(json.tasks ?? {})) {
    for (const k of task.env ?? []) all.add(k);
  }
  return all;
}

async function main() {
  const envKeys = new Set();
  for (const rel of ENV_FILES) {
    const path = join(REPO_ROOT, rel);
    try {
      const text = await readFile(path, "utf8");
      for (const key of parseEnvKeys(text)) {
        envKeys.add(key);
      }
    } catch {
      // env example file missing — ignore
    }
  }
  const turboJson = await readFile(join(REPO_ROOT, "turbo.json"), "utf8");
  const turboEnv = parseTurboEnv(turboJson);

  const missing = [];
  for (const key of envKeys) {
    if (turboEnv.has(key)) continue;
    if (ALLOWLIST.has(key)) continue;
    missing.push(key);
  }

  if (missing.length === 0) {
    console.log("[env-vs-globalenv] OK");
    return;
  }

  const enforce = process.argv.includes("--enforce");
  console.warn(
    `[env-vs-globalenv] ${enforce ? "FAILED" : "ADVISORY"}: ${missing.length} env vars in .env.example files are not in turbo.json globalEnv / task env:`,
  );
  for (const key of missing.sort()) {
    console.warn(`  - ${key}`);
  }
  console.warn(
    "Add to turbo.json#globalEnv (build cache invalidation) or extend the ALLOWLIST in this script if the var is read at process start only.",
  );
  if (enforce) process.exit(1);
}

main().catch((err) => {
  console.error("[env-vs-globalenv] failed:", err);
  process.exit(2);
});
