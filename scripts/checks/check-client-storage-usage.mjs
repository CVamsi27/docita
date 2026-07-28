#!/usr/bin/env node
// Allowlists localStorage / sessionStorage usage in apps/app and apps/internal.
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
const ALLOWLIST = new Set([
  // Onboarding draft (expiry-bounded, no PHI; see use-onboarding-draft.ts)
  "apps/app/features/onboarding/components/forms/use-onboarding-draft.ts",
  "apps/app/features/onboarding/hooks/use-clinic-registration-flow.ts",
  "apps/app/features/onboarding/hooks/use-clinic-registration-flow.spec.tsx",
  "apps/app/features/onboarding/components/steps/ComplianceStep.spec.tsx",

  // Email-verification gating draft (no PHI)
  "apps/app/features/onboarding/components/VerifyEmailPageContent.tsx",

  // Auth-side lockout counter (no PHI; needed for offline UX)
  "apps/app/shared/lib/auth/auth-lockout.ts",
  "apps/app/shared/lib/auth/safe-return-path.ts",

  // Clinic-context helpers (light, post-auth identifiers only)
  "apps/app/shared/lib/contexts/clinic-context-helpers.ts",
  "apps/app/shared/lib/contexts/clinic-context.tsx",

  // Patient-portal OTP redirect path (no PHI)
  "apps/app/features/patient-portal/hooks/use-portal-otp-auth.ts",
  "apps/app/features/auth/lib/auth-landing-path.ts",

  // Partner self-service session (JWT audience = "partner", no PHI; refresh
  // token is stored here for offline refresh. The portal lives at
  // app.docita.work/partner and runs on a separate audience; cookies would
  // collide with the main app's session cookie. Migration to an HttpOnly
  // partner-domain cookie is tracked for the post-v1 hardening pass.)
  "apps/app/features/referral-partner/lib/partner-session.ts",
  "apps/app/features/referral-partner/hooks/use-partner-auth.ts",

  // Consultation timer state (per-doctor session, no PHI fields)
  "apps/app/features/consultation/components/ConsultationTimerContainer.tsx",
  "apps/app/features/consultation/state/useConsultationHydrate.ts",
  "apps/app/shared/hooks/use-phone-signature-qr-flow.ts",
  "apps/app/shared/hooks/use-repeat-prescription.ts",
  "apps/app/features/patients/hooks/use-repeat-prescription.ts",

  // E2E session helper (test only)
  "apps/app/e2e/utils/session.ts",
  "apps/app/e2e/utils/patient-helpers.ts",
  "apps/app/e2e/utils/portal-helpers.ts",

  // Consultation autosave (no PHI; only ids + draft timestamps)
  "apps/app/features/consultation/state/useConsultationAutosave.ts",

  // Email-verification sent-page draft (no PHI)
  "apps/app/features/onboarding/components/VerifyEmailSentPageContent.tsx",

  // Clinic registration form draft (legacy step; no PHI)
  "apps/app/features/onboarding/components/forms/clinic-registration-form.tsx",
  "apps/app/features/onboarding/components/forms/clinic-registration-form-sections.tsx",

  // Onboarding session-storage shim (transient state only)
  "apps/app/features/onboarding/hooks/onboarding-session-storage.ts",

  // Navigation history rings (route paths only, no PHI)
  "apps/app/providers/navigation-history-provider.tsx",
  "apps/internal/providers/navigation-history-provider.tsx",

  // Ask-AI ephemeral thread storage (UI thread metadata only, never PHI body)
  "apps/app/shared/components/ask-ai/ask-ai-threads.ts",

  // Sidebar drag-to-reorder preference and collapse state (no PHI)
  "apps/app/shared/hooks/use-sidebar-nav-order.ts",
  "apps/app/shared/hooks/use-sidebar-nav-order-impl.ts",
  "apps/app/shared/hooks/use-sidebar-preferences.ts",
  "apps/app/shared/components/layout/subscription-lock-notice.tsx",
  "apps/app/shared/hooks/phone-signature-qr-flow-helpers.ts",

  // Auth-context helpers (post-auth identifiers; mirror of safe-return-path)
  "apps/app/shared/lib/auth/auth-context-helpers.ts",
  "apps/app/shared/lib/auth/e2e-session-token.ts",
  "apps/app/shared/lib/auth/login-lockout-storage.ts",
  "apps/app/shared/lib/auth/use-auth-session-bootstrap.ts",

  // Clinic-context helpers (post-auth clinic id only; no PHI payload)
  "apps/app/shared/lib/contexts/clinic-storage.ts",
  "apps/app/shared/lib/contexts/use-clinic-data-sync.ts",

  // i18n locale preference (no PHI)
  "apps/app/shared/lib/i18n/provider.tsx",

  // Client error reporter (Sentry buffer for the redactor; never PHI)
  "apps/app/shared/lib/monitoring/client-error-reporting.ts",
  "apps/app/shared/lib/monitoring/sentry.client.config.ts",

  // Internal app — theme, auth context, navigation history mirror of apps/app
  "apps/internal/app/layout.tsx",
  "apps/internal/shared/components/internal-theme-provider.tsx",
  "apps/internal/shared/lib/auth/auth.tsx",
  "apps/internal/shared/lib/auth/use-auth-session.ts",
  "apps/internal/shared/lib/monitoring/sentry.client.config.ts",
  "apps/internal/shared/lib/stores/internal-filters-store.ts",
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
