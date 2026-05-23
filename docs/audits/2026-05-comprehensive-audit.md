# 2026-05 Comprehensive Audit

**Date:** 2026-05-23
**Branch:** `feat/performance-security`
**Scope:** Whole-repo themed sweep across security, performance, SOLID/design, KISS/YAGNI, folder structure, naming, dependencies, Prisma schema, CI/CD, and testing.
**Method:** Eight parallel themed audit agents + verification passes.

**Remediation:** Completed in code through 2026-05-23. See [Remediation status](#remediation-status-2026-05-23).

---

## Remediation status (2026-05-23)

| ID | Status | Notes |
|---|---|---|
| S1 | **Done** | CSRF `httpOnly` + `X-CSRF-Token` header; clients cache in memory |
| S2 | **Ops (manual)** | Rotate secrets out of band; `docs/operations/SECRET_ROTATION_CHECKLIST.md` |
| S3–S11 | **Done** | Upload validation, CORS, rate limits, PHI redaction, timeouts, JWT 15m, Swagger gate |
| P1–P10, P14 | **Done** | PHI caps, concurrency, React Query tuning, timeline limits, worker batching |
| P5 | **Done** | Protected routes are server shells; auth/setup/portal/tools stay client (interactive) |
| P11 | **Done** | `QUERY_STALE_TIMES` wired in clinic settings, feature flags, dashboard hooks |
| P12 | **Done** | Suspense on appointments, patients, settings (feature containers) |
| P13 | **Done** | Dropped redundant `FollowUp` `clinicId` index; migration `20260523160000_*` |
| P15 | **Done** | `clinic-context-helpers.ts` extracted from provider |
| D1, D3, D5–D7 | **Done** | Facade, advisor rail ISP, shared status query, access context, patient DI token |
| D2, D4, D8–D11 | **Done** | Command uses use-cases + `assertDoctorOwnsAppointment`; hooks within budget |
| F1, F3, F8–F10 | **Done** | `packages/auth`; `domains/dashboard/` flatten; `.gitignore`; `scripts/README.md` |
| F2, F4–F7 | **Done** | No further moves (domains already canonical per AGENTS.md); documented in F9–F10 |
| N1–N8 | **Done** | Renames + AGENTS.md §7.3 |
| DP1, DP3 | **Done** | AWS SDK bump; TS `5.7.3` across workspace |
| DP2 | **Done** | `docs/operations/PNPM_OVERRIDES.md` |
| DP4–DP8 | **Done** | `docs/operations/DEPENDENCY_UPGRADE_TRACKER.md` (Nest 12 tracked separately) |
| PR1–PR4, PR7–PR8 | **Done** | Cascades, soft delete, indexes, MFA Zod, invoice lineItems reads |
| PR5–PR6, PR9 | **Done** | `dentalChartSchema` at mapper; dual-write documented; schema indexes migrated |
| CI1–CI8 | **Done** | Deploy gates, `test:ci`, worker smoke, staging/CI doc |
| CI5 | **Done** | Coverage paths expanded in `jest.config.ts` |
| T1–T6 | **Done** | Unit specs: MFA schemas, active-user filter, appointment access, invoice resolution |

---

## Executive summary

Tier-1 audit items are remediated in code. **S2** (credential rotation) remains an operational task outside the repo. **NestJS 12** is documented for a dedicated upgrade PR (`docs/operations/DEPENDENCY_UPGRADE_TRACKER.md`).

---

## Verification corrections to the initial sweep

| Initial claim | Verified status | Evidence |
|---|---|---|
| `.env` is committed to the repo | **FALSE** — `.env` is in `.gitignore` | `.gitignore:18-19` |
| `pricing-helpers.ts` JSON.parse without try/catch | **FALSE** — wrapped in try/catch | `pricing-helpers.ts:94-104` |
| `patient-timeline-source.registry.ts` unbounded `Promise.all` | **Done** — `mapWithConcurrency` | registry + `@workspace/utils` |

---

## Suggested follow-up (post-audit)

1. **S2** — Execute secret rotation in staging then production.
2. **Nest 12** — Dedicated upgrade branch with full API/worker e2e.
3. **RSC** — Optional server `fetch` + `revalidate` for static marketing/setup copy when product prioritizes TTFB.

---

## Findings index

See remediation table for current status. Original severity labels preserved in git history.
