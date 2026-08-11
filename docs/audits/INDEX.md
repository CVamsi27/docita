# Audit Index

> **Master index of every audit, runbook, and architecture document
> in this repo.** Use this as the entry point for any review, plan,
> or fix — every entry below has a one-line summary, the date, and
> the cross-references that matter for that document.

## How to use this index

- **By topic:** jump to the relevant section in §1.
- **By date:** §2 lists every audit in reverse-chronological order
  with status (open / in-progress / closed) and a one-line summary.
- **By severity:** §3 lists the open findings that need a follow-up
  PR, ranked by blast radius.
- **Cross-references:** every doc in `docs/audits/2026-08-11-*.md`
  has a "Tracker" footer pointing to the next doc, the related
  architecture doc, and the related runbook (if any).

## 1. By topic

### 1.1 Backend (API + worker)

| Doc | Purpose | Date |
|---|---|---|
| [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) | Final pass — minute misses that automated gates don't catch (controller `throw new Error` mapping, React-Hooks warnings, CQS split, graceful shutdown) | 2026-08-11 |
| [`2026-08-11-best-practices-and-zod.md`](2026-08-11-best-practices-and-zod.md) | 80+ gate results + Zod drift fix (internal-admin DTOs migrated to Zod-first) | 2026-08-11 |
| [`2026-08-11-backend-final-pass.md`](2026-08-11-backend-final-pass.md) | Backend final pass — `ApprovalService.approveInvoice` copy-paste bug + 3 dead-code cleanups | 2026-08-11 |
| [`2026-08-10-deep-analysis.md`](2026-08-10-deep-analysis.md) | Subagent full-repo deep-dive (UI/UX, security, perf, test coverage) | 2026-08-10 |
| [`2026-08-10-session-notes.md`](2026-08-10-session-notes.md) | Session timeline for the #211 conflict-resolution + cleanup-branch work | 2026-08-10 |
| [`2026-06-10-full-repo-audit.md`](2026-06-10-full-repo-audit.md) | Round 1 of repo-wide audit; items already remediated | 2026-06-10 |
| [`2026-05-comprehensive-audit.md`](2026-05-comprehensive-audit.md) | Earliest round, fully remediated | 2026-05 |

### 1.2 Frontend (apps/app + apps/internal)

| Doc | Purpose | Date |
|---|---|---|
| [`FRONTEND_FULL_AUDIT_2026-08-11.md`](FRONTEND_FULL_AUDIT_2026-08-11.md) | Full frontend audit (apps/app + apps/internal + apps/landing) | 2026-08-11 |
| [`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md) | Frontend final pass — summary | 2026-08-11 |
| [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](FRONTEND_FINAL_PASS_CONT_2026-08-11.md) | Frontend final pass — continued | 2026-08-11 |
| [`FRONTEND_BEST_PRACTICES_2026-08-11.md`](FRONTEND_BEST_PRACTICES_2026-08-11.md) | Frontend best-practices catalog | 2026-08-11 |
| [`FRONTEND_DEAD_CODE_2026-08-11.md`](FRONTEND_DEAD_CODE_2026-08-11.md) | Frontend dead code summary | 2026-08-11 |
| [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](FRONTEND_DEAD_CODE_FULL_2026-08-11.md) | Frontend dead code full inventory | 2026-08-11 |
| [`FRONTEND_USEEFFECT_INDEX_2026-08-11.md`](FRONTEND_USEEFFECT_INDEX_2026-08-11.md) | useEffect index — condensed | 2026-08-11 |
| [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md) | useEffect index — full | 2026-08-11 |
| [`2026-08-11-frontend-deep-audit.md`](2026-08-11-frontend-deep-audit.md) | Top-10 frontend improvement list | 2026-08-11 |
| [`UI_UX_AUDIT_2026-07-13.md`](UI_UX_AUDIT_2026-07-13.md) | Earlier UI/UX standard | 2026-07-13 |
| [`UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md`](UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md) | UI/UX patients visit column spec | 2026-07-13 |

### 1.3 Compliance / Security

| Doc | Purpose | Date |
|---|---|---|
| [`COMPLIANCE_LEDGER_2026-06-11.md`](COMPLIANCE_LEDGER_2026-06-11.md) | DPDP / RLS coverage ledger | 2026-06-11 |
| [`2026-08-11-backend-final-pass.md`](2026-08-11-backend-final-pass.md) §1.4 | `ApprovalService.approveInvoice` copy-paste bug + tenant-scope check | 2026-08-11 |

### 1.4 Database

| Doc | Purpose | Date |
|---|---|---|
| [`DB_RETIREMENT_INVENTORY_2026-05-27.md`](DB_RETIREMENT_INVENTORY_2026-05-27.md) | Database retirement candidates | 2026-05-27 |

### 1.5 Application flow

| Doc | Purpose | Date |
|---|---|---|
| [`FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md`](FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md) | Feature-flow walkthrough | 2026-06-02 |
| [`MAIN_FEATURES_AUDIT_2026-05-27.md`](MAIN_FEATURES_AUDIT_2026-05-27.md) | Feature inventory | 2026-05-27 |
| [`MAIN_FEATURES_AUDIT_2026-05-27_findings.md`](MAIN_FEATURES_AUDIT_2026-05-27_findings.md) | Feature inventory findings | 2026-05-27 |

### 1.6 Pre-deploy

| Doc | Purpose | Date |
|---|---|---|
| [`PRE_DEPLOY_CHECKLIST_AUDIT_2026-05-29.md`](PRE_DEPLOY_CHECKLIST_AUDIT_2026-05-29.md) | Pre-deploy gates | 2026-05-29 |

### 1.7 Referral partner program

| Doc | Purpose | Date |
|---|---|---|
| [`REFERRER_MIGRATION_REVIEW_2026-07-14.md`](REFERRER_MIGRATION_REVIEW_2026-07-14.md) | Referral feature migration review | 2026-07-14 |

### 1.8 Plan & execution

| Doc | Purpose | Date |
|---|---|---|
| [`FINAL_EXECUTION_PLAN_2026-08-11.md`](FINAL_EXECUTION_PLAN_2026-08-11.md) | Final execution plan | 2026-08-11 |
| [`PERFECT_APP_AUDIT_2026-08-11.md`](PERFECT_APP_AUDIT_2026-08-11.md) | "Perfect app" audit (full-app scope) | 2026-08-11 |
| [`UI_UX_ENHANCEMENTS_2026-08-11.md`](UI_UX_ENHANCEMENTS_2026-08-11.md) | UI/UX enhancement backlog | 2026-08-11 |

### 1.9 Architecture

| Doc | Purpose | Date |
|---|---|---|
| [`docs/architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) | Authoritative architecture document | (always current) |
| [`docs/architecture/zod-first-architecture.md`](../architecture/zod-first-architecture.md) | Zod-first type system (AGENTS §3.1) | (always current) |
| [`docs/architecture/SINGLE_SOURCE_OF_TRUTH.md`](../architecture/SINGLE_SOURCE_OF_TRUTH.md) | SSOT principle (AGENTS §3.1) | (always current) |
| [`docs/architecture/API_DESIGN_STANDARD.md`](../architecture/API_DESIGN_STANDARD.md) | REST/GraphQL API design standard | (always current) |
| [`docs/architecture/decisions/0013-abac.md`](../architecture/decisions/0013-abac.md) | ABAC architecture decision | (always current) |
| [`docs/architecture/decisions/0010-transactional-outbox.md`](../architecture/decisions/0010-transactional-outbox.md) | Transactional outbox pattern | (always current) |
| [`docs/architecture/decisions/0008-als-tenant-context.md`](../architecture/decisions/0008-als-tenant-context.md) | AsyncLocalStorage tenant context | (always current) |
| [`docs/architecture/decisions/0005-envelope-encryption-for-phi.md`](../architecture/decisions/0005-envelope-encryption-for-phi.md) | Envelope encryption for PHI | (always current) |
| [`docs/architecture/decisions/README.md`](../architecture/decisions/README.md) | All 14 ADRs | (always current) |

### 1.10 Runbooks

| Doc | Purpose | Date |
|---|---|---|
| [`docs/runbooks/abdm-onboarding.md`](../runbooks/abdm-onboarding.md) | ABDM (Ayushman Bharat Digital Mission) onboarding | (always current) |
| (planned) `docs/runbooks/graceful-shutdown.md` | Per `2026-08-11-final-pass-minute-misses.md` §1.8 | pending |
| (planned) `docs/runbooks/tenant-isolation.md` | Per `2026-08-11-final-pass-minute-misses.md` §1.6 | pending |

### 1.11 Testing

| Doc | Purpose | Date |
|---|---|---|
| [`docs/testing/TESTING.md`](../testing/TESTING.md) | Testing strategy (Jest / Vitest / Playwright) | (always current) |

---

## 2. By date (newest first)

| Date | Doc | Status | One-line summary |
|---|---|---|---|
| 2026-08-11 | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) | open | 15 human-reviewer findings + step-by-step fixes + recommended tool/pattern for each |
| 2026-08-11 | [`2026-08-11-best-practices-and-zod.md`](2026-08-11-best-practices-and-zod.md) | in-progress (1 follow-up: delete `ClinicTierType`) | 80+ gate results + Zod drift fix (internal-admin DTOs migrated) |
| 2026-08-11 | [`2026-08-11-backend-final-pass.md`](2026-08-11-backend-final-pass.md) | in-progress (7 PrismaService migrations + 3 minor cleanups) | `ApprovalService.approveInvoice` copy-paste bug + 3 dead-code cleanups + 7 follow-ups |
| 2026-08-11 | [`FRONTEND_FULL_AUDIT_2026-08-11.md`](FRONTEND_FULL_AUDIT_2026-08-11.md) | open | Frontend audit (apps/app + apps/internal + apps/landing) |
| 2026-08-11 | [`FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md`](FRONTEND_FINAL_PASS_SUMMARY_2026-08-11.md) | open | Frontend final pass — summary |
| 2026-08-11 | [`FRONTEND_FINAL_PASS_CONT_2026-08-11.md`](FRONTEND_FINAL_PASS_CONT_2026-08-11.md) | open | Frontend final pass — continued |
| 2026-08-11 | [`FRONTEND_BEST_PRACTICES_2026-08-11.md`](FRONTEND_BEST_PRACTICES_2026-08-11.md) | open | Frontend best-practices catalog |
| 2026-08-11 | [`FRONTEND_DEAD_CODE_2026-08-11.md`](FRONTEND_DEAD_CODE_2026-08-11.md) | open | Frontend dead code summary |
| 2026-08-11 | [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](FRONTEND_DEAD_CODE_FULL_2026-08-11.md) | open | Frontend dead code full inventory |
| 2026-08-11 | [`FRONTEND_USEEFFECT_INDEX_2026-08-11.md`](FRONTEND_USEEFFECT_INDEX_2026-08-11.md) | open | useEffect index — condensed |
| 2026-08-11 | [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md) | open | useEffect index — full |
| 2026-08-11 | [`2026-08-11-frontend-deep-audit.md`](2026-08-11-frontend-deep-audit.md) | open | Top-10 frontend improvement list |
| 2026-08-11 | [`FINAL_EXECUTION_PLAN_2026-08-11.md`](FINAL_EXECUTION_PLAN_2026-08-11.md) | in-progress | Final execution plan |
| 2026-08-11 | [`PERFECT_APP_AUDIT_2026-08-11.md`](PERFECT_APP_AUDIT_2026-08-11.md) | open | "Perfect app" audit (full-app scope) |
| 2026-08-11 | [`UI_UX_ENHANCEMENTS_2026-08-11.md`](UI_UX_ENHANCEMENTS_2026-08-11.md) | open | UI/UX enhancement backlog |
| 2026-08-10 | [`2026-08-10-deep-analysis.md`](2026-08-10-deep-analysis.md) | closed (all items remediated in PR #211) | Subagent full-repo deep-dive |
| 2026-08-10 | [`2026-08-10-session-notes.md`](2026-08-10-session-notes.md) | closed | Session timeline for the #211 conflict-resolution + cleanup-branch work |
| 2026-07-14 | [`REFERRER_MIGRATION_REVIEW_2026-07-14.md`](REFERRER_MIGRATION_REVIEW_2026-07-14.md) | closed | Referral feature migration review |
| 2026-07-13 | [`UI_UX_AUDIT_2026-07-13.md`](UI_UX_AUDIT_2026-07-13.md) | open (superseded by `2026-08-11-frontend-deep-audit.md`) | UI/UX standard |
| 2026-07-13 | [`UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md`](UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md) | open | UI/UX patients visit column spec |
| 2026-06-11 | [`COMPLIANCE_LEDGER_2026-06-11.md`](COMPLIANCE_LEDGER_2026-06-11.md) | closed (DPDP / RLS coverage gates now pass) | DPDP / RLS coverage |
| 2026-06-10 | [`2026-06-10-full-repo-audit.md`](2026-06-10-full-repo-audit.md) | closed | Round 1 of repo-wide audit |
| 2026-06-02 | [`FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md`](FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md) | closed | Feature-flow walkthrough |
| 2026-05-29 | [`PRE_DEPLOY_CHECKLIST_AUDIT_2026-05-29.md`](PRE_DEPLOY_CHECKLIST_AUDIT_2026-05-29.md) | closed (now in `verify:standard`) | Pre-deploy gates |
| 2026-05-27 | [`MAIN_FEATURES_AUDIT_2026-05-27.md`](MAIN_FEATURES_AUDIT_2026-05-27.md) | closed | Feature inventory |
| 2026-05-27 | [`MAIN_FEATURES_AUDIT_2026-05-27_findings.md`](MAIN_FEATURES_AUDIT_2026-05-27_findings.md) | closed | Feature inventory findings |
| 2026-05-27 | [`DB_RETIREMENT_INVENTORY_2026-05-27.md`](DB_RETIREMENT_INVENTORY_2026-05-27.md) | closed | Database retirement candidates |
| 2026-05 | [`2026-05-comprehensive-audit.md`](2026-05-comprehensive-audit.md) | closed | Earliest round, fully remediated |

---

## 3. Open findings ranked by blast radius

| Severity | Finding | Doc | Est. effort |
|---|---|---|---|
| HIGH | App-side fast-refresh + useMemo deps warnings (16) | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.3 | 3h |
| HIGH | `ConsentComplianceService` should be split into Command/Query | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.4 | 2h |
| HIGH | `throw new Error` in 5 controller methods | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.2 | 1h |
| MED | No graceful-shutdown timeout config exposed | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.8 | 1h |
| MED | 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` | [`2026-08-11-backend-final-pass.md`](2026-08-11-backend-final-pass.md) §2.1 | 20h (multi-PR) |
| MED | Empty test subdirectories + manual runbook | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.1, §1.6 | 30 min |
| MED | `apps/landing` `.env.example` may be too sparse | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.7 | 30 min |
| LOW | 401 prettier warnings (auto-fixable) | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.9 | 5 min |
| LOW | `pnpm check:api-latency-budget:enforce` skipped (no baseline) | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.11 | 30 min (post-staging) |
| LOW | `seed-constants.spec.ts` race on fresh checkout | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.12 | 10 min |
| LOW | Delete unused `ClinicTierType` type alias | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.14 | 1 min |
| LOW | `approvePrescription` defensive comment | [`2026-08-11-final-pass-minute-misses.md`](2026-08-11-final-pass-minute-misses.md) §1.5 | 10 min |
| LOW | Frontend final-pass docs (UI/UX, dead code, useEffect) | [`2026-08-11-frontend-deep-audit.md`](2026-08-11-frontend-deep-audit.md) | 8h+ (multi-PR) |

**Total open:** ~35h across ~15-20 PRs.

---

## 4. Tracker footer convention

Every `2026-08-11-*.md` audit doc ends with a **Tracker** section
that points to:
- The next doc in the audit trilogy (chronological / logical order)
- The relevant architecture doc (if any)
- The relevant runbook (if any)
- The CI run that produced the fix (if any)

This makes it easy to navigate from any audit doc to its context.
The footer format is:

```markdown
---

## Tracker

- **Previous:** [previous doc]
- **Next:** [next doc]
- **Related architecture:** [arch doc]
- **Related runbook:** [runbook]
- **Fixed in:** PR #211 (commit XXXXXX) — if applicable
- **Verified by:** `pnpm verify:standard` exit 0 / API E2E N/N
```

---

## 5. Contributing to this index

When you add a new audit doc:

1. Create the doc under `docs/audits/YYYY-MM-DD-<short-name>.md`.
2. Add a Tracker footer at the bottom (§4 format).
3. Add a row to §2 in this INDEX, in the right date slot.
4. Add a row to the relevant topic in §1.
5. If the doc introduces open findings, add a row to §3.

When you close an audit doc (all items remediated):

1. Mark the §2 status `closed`.
2. Move the open findings from §3 to the closed doc with a link
   to the PR that closed them.
3. Update the doc's Tracker footer with `Closed in: PR #XXX`.

---

## 6. See also

- [`README.md`](README.md) — earlier audit index (smaller, superseded
  by this file for 2026-08-11 work).
- [`AGENTS.md`](../../AGENTS.md) §10 — testing and verification rules.
- [`AGENTS.md`](../../AGENTS.md) §11 — repo hygiene and documentation.
- `pnpm verify:standard` — the authoritative quality gate.
- `pnpm knip` — unused exports / dependencies.
- `pnpm check:fallow` — dead-code score.
