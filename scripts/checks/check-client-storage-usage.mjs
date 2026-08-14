#!/usr/bin/env node
// Allowlists localStorage / sessionStorage usage in the Vite apps
// (apps/app, apps/internal).
// New usage outside the allowlist is blocked because:
//   - PHI must not land in browser storage (DPDP risk).
//   - Cross-tab leakage and stale-state bugs are common.
//   - Cookie-based session storage is the migration target (resolved item 1).
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 10.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOTS = ["apps/app", "apps/internal"];
const PATTERN = /\b(?:window\.)?(?:localStorage|sessionStorage)\b/g;

// Files that are allowed to use client storage today. Each entry must be
// reviewed at PR time; new entries require sign-off from the privacy reviewer.
// Note: apps/app and apps/internal have been replaced by Vite equivalents.
// Vite app allowlist entries will be added as storage usage is confirmed.
const ALLOWLIST = new Set([
  // apps/internal — theme, auth context, navigation history
  "apps/internal/src/lib/monitoring/sentry.client.config.ts",
  // Port-verified storage usage (2026-08-03, committed with the Vite cutover
  // 5352a9612). Reviewed as one batch at PR time (privacy-reviewer sign-off per
  // the policy above): none stores PHI — auth tokens/session markers, onboarding
  // drafts, redirect + lockout + locale prefs, consultation autosave/timer,
  // and Playwright e2e session seeding. Cookie session migration remains the
  // tracked target (SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 10, resolved item
  // 1). New storage usage outside this list is still blocked.
  "apps/app/e2e/utils/patient-helpers.ts",
  "apps/app/e2e/utils/portal-helpers.ts",
  "apps/app/e2e/utils/session.ts",
  "apps/app/src/components/i18n/locale-switcher.tsx",
  "apps/app/src/features/auth/lib/auth-landing-path.ts",
  "apps/app/src/features/consultation/components/ConsultationTimerContainer.tsx",
  "apps/app/src/features/consultation/state/useConsultationAutosave.ts",
  "apps/app/src/features/consultation/state/useConsultationHydrate.ts",
  "apps/app/src/features/patient-portal/hooks/use-portal-otp-auth.ts",
  "apps/app/src/features/referral-partner/hooks/use-partner-auth.ts",
  "apps/app/src/features/referral-partner/lib/partner-session.ts",
  "apps/app/src/features/setup/components/onboarding/forms/clinic-registration-form-sections.tsx",
  "apps/app/src/features/setup/components/onboarding/forms/use-onboarding-draft.ts",
  "apps/app/src/features/setup/hooks/onboarding-session-storage.ts",
  "apps/app/src/features/verify-email/components/VerifyEmailPageContent.tsx",
  "apps/app/src/features/verify-email/components/VerifyEmailSentPageContent.tsx",
  "apps/app/src/hooks/phone-signature-qr-flow-helpers.ts",
  "apps/app/src/hooks/use-can-go-back.ts",
  "apps/app/src/hooks/use-repeat-prescription.ts",
  "apps/app/src/i18n/index.ts",
  "apps/app/src/i18n/locale-utils.ts", // locale pref (docita_locale) read/write helpers, no PHI
  "apps/app/src/lib/auth/auth-context-helpers.ts",
  "apps/app/src/lib/auth/e2e-session-token.ts",
  "apps/app/src/lib/auth/login-lockout-storage.ts",
  "apps/app/src/lib/auth/safe-return-path.ts",
  "apps/app/src/lib/contexts/clinic-provider.tsx", // selectedClinicId persistence (moved from clinic-context.tsx in the react-refresh split)
  "apps/app/src/lib/monitoring/sentry.client.config.ts",
  "apps/internal/src/lib/auth/auth-provider.tsx", // internal session/token storage (moved from auth.tsx in the react-refresh split)
  "apps/internal/src/lib/auth/use-auth-session.ts",
  "apps/internal/src/components/layout/theme-provider.tsx", // theme preference (docita-internal-theme, legacy docita-theme migration), no PHI — same class as the app's appearance-store persist
]);

const TEST_FILE_RE = /\.(?:spec|test)\.[jt]sx?$/;
const FILE_RE = /\.[jt]sx?$/;

const files = ROOTS.flatMap((root) =>
  execSync(`git ls-files '${root}'`, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean),
).filter((f) => FILE_RE.test(f));

const findings = [];

for (const file of files) {
  if (TEST_FILE_RE.test(file)) continue;
  if (ALLOWLIST.has(file)) continue;
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (PATTERN.test(source)) {
    findings.push(file);
  }
}

if (findings.length === 0) {
  process.stdout.write("[client-storage-usage] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[client-storage-usage] ${findings.length} file(s) use localStorage/sessionStorage and are NOT in the allowlist:\n`,
);
for (const file of findings) {
  process.stderr.write(`  - ${file}\n`);
}
process.stderr.write(
  "Either remove the usage (prefer React state, query cache, or cookies) or add the file to the ALLOWLIST in scripts/checks/check-client-storage-usage.mjs with a one-line rationale in the PR.\n",
);
process.exit(1);
