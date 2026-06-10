# 2026-06-10 Full-Repo Audit

**Date:** 2026-06-10
**Branch:** `fix/audit-issues`
**Scope:** Whole-repo sweep — security, leaks, performance/server cost, responsive UI, implementation quality, design patterns/SOLID, dependency health — plus an India-market business assessment (features to add/finish/retire per staff role) and tech recommendations.
**Method:** Every CI gate executed fresh during the audit (not assumed), manual deep dives where automation has no coverage, live web research for India regulatory items.
**Prior art:** Builds on [2026-05-comprehensive-audit.md](./2026-05-comprehensive-audit.md) (fully remediated) and [FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md](./FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md). Findings already covered there are not repeated.

---

## 1. Verified baseline (all gates executed 2026-06-10)

| Gate | Result |
|---|---|
| `pnpm lint` | ✅ pass |
| `pnpm turbo check-types --continue` | ✅ pass |
| `pnpm verify:standard` (~80 invariant checks) | ✅ all pass |
| `pnpm test` | ✅ 47/47 turbo tasks |
| `pnpm check:fallow` | ✅ score 100 |
| `pnpm check:duplication` (jscpd, 4,533 files / 383k lines) | ✅ 0 clones |
| `pnpm knip` | ✅ clean (3 config hints — fixed, see §2.2) |
| `pnpm perf:budget:warn` | ✅ all routes under baseline (patients-detail −21.6%, appointments −20.6%) |
| `pnpm audit --prod` | ⚠️ 4 moderate (hono < 4.12.21 via `@prisma/dev`, dev-only path) — **fixed, see §2.1** |
| Hardcoded-secret grep (apps/packages/scripts) | ✅ clean |
| Spot checks | 0 `as any` in features/api · 0 runtime `console.*` · `@ts-ignore` only in generated `.next` types |

**Security posture (manually re-verified):** global `ThrottlerGuard` registered as `APP_GUARD` ([app.module.ts:176](../../apps/api/src/app.module.ts)) covers all 54 `@Public()` endpoints with baseline rate limits; auth/portal/booking controllers add stricter `@Throttle`. WhatsApp webhook verifies `x-hub-signature-256` HMAC; ZeptoMail webhook verifies a constant-time shared secret; signature uploads run through `createSignatureFileInterceptor`. RLS is enabled in production ([RLS_ROLLOUT.md](../compliance/RLS_ROLLOUT.md)). Sentry sampling is cost-tuned (0.1 traces, 0.05 replays).

**Conclusion:** the codebase's automation layer is in excellent health. The actionable findings were specific and small (§2), plus strategic gaps on the India business side (§4).

---

## 2. Findings fixed on this branch

### 2.1 hono CVEs (moderate ×4) — fixed
`pnpm.overrides.hono` pinned a range that the lockfile had resolved below the patched 4.12.21 (GHSA-f577-qrjj-4474, GHSA-2gcr-mfcq-wcc3). Dev-only dependency path (`@prisma/client > prisma > @prisma/dev > hono`), but the override is the repo's control point. Bumped to `^4.12.21`; `pnpm audit --prod` now reports **0 vulnerabilities**.

### 2.2 Stale knip ignores — fixed
Knip 5 now resolves CSS `@import`; the three `@fontsource/*` entries in `knip.json` (apps/app) were superfluous (fonts are imported by [globals.css:2-12](../../apps/app/app/globals.css)). Removed; `pnpm knip` fully clean.

### 2.3 Redundant notification polling (server cost) — fixed
`useUnreadNotificationCount` polled every **10 s** from the sidebar for every signed-in session (~8.6k requests/user/day), while the notifications WebSocket gateway already pushes `notification:new/read/deleted/bulk-delete` and [use-notification-panel.ts](../../apps/app/shared/components/navigation/use-notification-panel.ts) invalidates the same query key on each event. Raised the poll to 60 s as a socket-failure fallback ([use-notifications.ts](../../packages/data-access/src/hooks/use-notifications.ts)). ~83% fewer count requests at identical perceived latency.

### 2.4 Dead + broken `GET /whatsapp/logs` — removed
The endpoint had **zero consumers** (app, internal, data-access, e2e, API tests) and could never have returned 200: its serializer schema required a `direction` field that does not exist on the `WhatsappLog` model, `patientId` was `.optional()` while Prisma returns `null`, and the row fields (`message`, `phoneNumber`, `providerMessageId`) didn't match the contract (`content`, `messageId`). This is the "/whatsapp/logs schema mismatch" noted during the custom-messages project. Removed the handler, `WhatsappLogListResponseDto`, `WhatsappLogsQueryDto`, and the orphaned `whatsappLogSchema` / `whatsappLogsQuerySchema` / `whatsappLogListResponseSchema` contracts. The patient Messages tab uses `/whatsapp/patients/:id/sent-messages`, which has a correct mapper and is untouched. All 25 WhatsApp API suites pass (211 tests).

### 2.5 Test-density debt — ratcheted
[feature-test-density-zero.json](../../scripts/checks/allowlists/feature-test-density-zero.json) listed 16 features; 3 were stale (`desk`, `ocr`, `public-booking` already had colocated tests). Added the first unit tests for `prescriptions` ([prescriptions-page-helpers.test.ts](../../apps/app/features/prescriptions/components/prescriptions-page-helpers.test.ts) — search filter, sorting, header copy; 12 tests) and shrank the allowlist 16 → 12. Remaining 12 are backlogged (one PR per feature).

### 2.6 No automated dependency updates — fixed
`.github/` had container scanning but no Dependabot/Renovate — which is exactly how the hono pin went stale. Added [.github/dependabot.yml](../../.github/dependabot.yml): weekly npm (grouped minor/patch, majors excluded — majors go through [DEPENDENCY_UPGRADE_TRACKER.md](../operations/DEPENDENCY_UPGRADE_TRACKER.md)) + github-actions ecosystems.

### 2.7 Safe dependency bumps — applied
`turbo` 2.9.17, `@playwright/test` 1.60, `@types/node` 25.9.2, `prettier` 3.8.4, `prisma`/`@prisma/client` 7.8.0 (+ regenerated client), `fallow` 2.91.0. Full gate re-run green. **Held for dedicated PRs:** TypeScript 6, Zod 4, NestJS 12 (tracked), jscpd 5.

---

## 3. Findings assessed — no change warranted

### 3.1 Outbox relay 5 s poll — keep, monitor
`OUTBOX_RELAY: '*/5 * * * * *'` ([cron-schedules.ts:30](../../apps/api/src/shared/schedule/cron-schedules.ts)) issues ~17k index-backed scans/day. Local `pnpm db:profile` is dominated by test-suite noise and cannot measure it meaningfully; the `(processedAt, createdAt)` index keeps the scan cheap. Action: watch production `pg_stat_statements`; move to Postgres `LISTEN/NOTIFY` only if it surfaces. Cron inventory (16 jobs) reviewed — `WHATSAPP_CAMPAIGN_DISPATCH` (1 min) and `PLATFORM_HEALTH_ALERTS` (2 min) are proportionate to their duties.

### 3.2 Responsive UI — no defects found
- Static scan of every ≥300px literal width (billing history tables/filters, pricing comparison table, prescriptions filters, patient profile header, ask-AI overlay, investigation rows): **all are mobile-first** (`w-full` base + `sm:` fixed widths, `max-w-*` + truncate, `calc(100vw-2rem)`).
- Live pass (dev server, 375×812 and ~800px): `/login` centered and clean; `/book/[referralCode]` shows the 3-step mobile stepper, progress bar, sticky visit summary + Continue, skip-link, labeled help links; long clinic names truncate correctly.
- `check:responsive-data-tables` and the a11y budget pass in CI; the dedicated mobile shell remains a known deferred item ([post-launch-polish.md §2](../UpcomingPlans/post-launch-polish.md)).

### 3.3 GST e-invoicing — deliberately not building
Healthcare services are GST-exempt; the e-invoice mandate applies to taxable B2B turnover > ₹5 Cr (effectively > ₹50 Cr for healthcare providers). Existing GSTIN capture + invoice GST fields are sufficient for the clinic segment. Revisit only if pharmacy/inventory sales (taxable goods) ship.

### 3.4 E2E coverage — adequate
50 Playwright specs in `apps/app/e2e/` + 18 API e2e specs, run by `api-e2e.yml` / `frontend-critical-e2e.yml`. The coverage gap is unit-level in the 12 still-allowlisted features, not E2E.

---

## 4. India-market assessment

Full detail with phases and file-level scaffolding: [india-compliance-and-abdm-roadmap.md](../UpcomingPlans/india-compliance-and-abdm-roadmap.md). Summary:

| # | Item | Priority | State in repo |
|---|---|---|---|
| 1 | **ABDM/ABHA integration (M1–M3)** | HIGH | Only `Patient.abhaAddress` column exists. No HFR/HPR, no FHIR, no consent flows. M-certification is becoming procurement table-stakes; the Digital Health Incentive Scheme pays ₹20/ABHA-linked record above 100/month (cap ₹4 Cr) — a direct revenue argument for clinics. |
| 2 | **DPDP Act 2023 + Rules 2025** | HIGH (deadline) | Strong base (consent capture, AES-256-GCM on 13 PHI fields, retention scheduler, audit export). Gaps: 72 h breach-notification runbook, on-demand erasure + data-export rights, consent withdrawal flow, 90-day grievance SLA. Consent-manager provisions land **13 Nov 2026**; bulk obligations **13 May 2027**. |
| 3 | **i18n (Hindi first)** | MEDIUM | [I18N_PLAN.md](../UpcomingPlans/I18N_PLAN.md) exists; zero code. Tier-2/3 receptionists are the persona that needs it most. |
| 4 | **Telemedicine (NMC guidelines)** | MEDIUM | Absent. Independent quick win regardless: enforce a Schedule X / narcotics block-list in prescription validation. |

### Feature add/finish/retire matrix (per staff role)

| Surface | State | Recommendation |
|---|---|---|
| `pharmacy` | Route removed as placeholder; API domain + `inventory` exist | **Decide finish-or-retire.** Finishing = dispense queue + stock (Reception role, design bundle exists); also triggers GST-on-goods work. Not committed this quarter → delete remnants. |
| `medical-coding`, `ocr`, `excel`, `import` | Niche, thin tests | Keep — `insurance-claims` depends on coding; `import` is onboarding-critical. Ratchet tests. |
| `dev-tools` | Internal | `check:tools-route-gate` keeps it non-prod. No action. |
| `ipd`, `insurance-claims`, `lab-portal`, `vaccines`, `referrals` | Built, role-gated | Keep — map to nurse/lab/hospital personas. |
| `ai-assistant`, `analytics` | INTELLIGENCE-gated | Keep gated. |
| Missing | — | ABDM, telemedicine, Hindi UI (above). Nurse vitals-first entry already exists via consultation. |

---

## 5. Backlog (not this branch)

1. Remaining 12 zero-test features — one PR each, shrink the allowlist each time.
2. ABDM Phase M1 (see roadmap doc) — the single highest-leverage product investment.
3. DPDP gap items before 13 May 2027 (breach runbook + data-principal rights endpoints first).
4. i18n Phases 1–2 (`next-intl`, chrome strings, Hindi seed).
5. Schedule X block-list in prescription validation (pre-telemedicine quick win).
6. Outbox LISTEN/NOTIFY — only if production `pg_stat_statements` shows the 5 s poll mattering.
7. Major upgrades, each isolated: NestJS 12 (tracked), Zod 4, TypeScript 6, jscpd 5.
8. WhatsApp per-clinic sender + Enterprise tier — already fully planned in [feature-to-add-their-warm-valley.md](../UpcomingPlans/feature-to-add-their-warm-valley.md); execute as-is.

---

## 6. Verification record

After all §2 changes: `pnpm lint` ✅ · `pnpm turbo check-types --continue` ✅ · `pnpm verify:standard` ✅ · `pnpm test` ✅ · `pnpm knip` ✅ · `pnpm audit --prod` 0 vulnerabilities ✅ · targeted suites (whatsapp ×25, data-access ×7, prescriptions ×1) ✅.
