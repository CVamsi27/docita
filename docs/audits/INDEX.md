# Audit Index

> **The 2026-08-11 audit cycle is consolidated into 2 docs:**
>
> 1. **[`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md)**
>    — Every backend finding, fix, and follow-up. 80+ gate results,
>    best-practices spot-checks, architectural observations, 7
>    PrismaService leaks, 15 minute-miss findings, 11 follow-up PRs.
>
> 2. **[`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md)**
>    — Every frontend finding, fix, and follow-up. 16 lint warnings,
>    94 dead exports, 171 useEffects, perfect-app scorecard (10
>    standards × 3 apps), 16 UI/UX backlog items, 15 follow-up PRs.
>
> Older docs from this cycle were merged into the 2 consolidated
> docs. The pre-2026-08-11 docs below remain in their original
> form (they document closed or superseded work).

## How to use this index

- **For an active review:** start with the 2 consolidated docs.
- **For history:** the pre-2026-08-11 docs document earlier rounds
  of audit work; they're "closed" — every item is remediated.
- **For cross-references:** both consolidated docs end with a
  Tracker section pointing to the relevant architecture docs,
  runbooks, and the PRs that fixed the issues.

## By date (newest first)

| Date | Doc | Status | One-line summary |
|---|---|---|---|
| 2026-08-11 | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) | open | Consolidated backend final pass — 80+ gate results, 3 cleanups + 2 bug fixes + Zod migration |
| 2026-08-11 | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) | open | Consolidated frontend final pass — 16 lint, 94 dead exports, 171 useEffects, perfect-app scorecard |
| 2026-08-10 | [`2026-08-10-deep-analysis.md`](2026-08-10-deep-analysis.md) | closed (all in PR #211) | Subagent full-repo deep-dive |
| 2026-08-10 | [`2026-08-10-session-notes.md`](2026-08-10-session-notes.md) | closed | Session timeline for the #211 conflict-resolution + cleanup-branch work |
| 2026-07-14 | [`REFERRER_MIGRATION_REVIEW_2026-07-14.md`](REFERRER_MIGRATION_REVIEW_2026-07-14.md) | closed | Referral feature migration review |
| 2026-07-13 | [`UI_UX_AUDIT_2026-07-13.md`](UI_UX_AUDIT_2026-07-13.md) + [`UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md`](UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md) | open (superseded by 2026-08-11) | UI/UX standard + patients visit column spec |
| 2026-06-11 | [`COMPLIANCE_LEDGER_2026-06-11.md`](COMPLIANCE_LEDGER_2026-06-11.md) | closed (DPDP / RLS gates now pass) | DPDP / RLS coverage |
| 2026-06-10 | [`2026-06-10-full-repo-audit.md`](2026-06-10-full-repo-audit.md) | closed | Round 1 of repo-wide audit |
| 2026-06-02 | [`FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md`](FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md) | closed | Feature-flow walkthrough |
| 2026-05-29 | [`PRE_DEPLOY_CHECKLIST_AUDIT_2026-05-29.md`](PRE_DEPLOY_CHECKLIST_AUDIT_2026-05-29.md) | closed (now in `verify:standard`) | Pre-deploy gates |
| 2026-05-27 | [`MAIN_FEATURES_AUDIT_2026-05-27.md`](MAIN_FEATURES_AUDIT_2026-05-27.md) + [`MAIN_FEATURES_AUDIT_2026-05-27_findings.md`](MAIN_FEATURES_AUDIT_2026-05-27_findings.md) | closed | Feature inventory |
| 2026-05-27 | [`DB_RETIREMENT_INVENTORY_2026-05-27.md`](DB_RETIREMENT_INVENTORY_2026-05-27.md) | closed | Database retirement candidates |
| 2026-05 | [`2026-05-comprehensive-audit.md`](2026-05-comprehensive-audit.md) | closed | Earliest round, fully remediated |

## Open follow-ups ranked by severity

| Severity | Finding | Doc | Est. effort |
|---|---|---|---|
| HIGH | App-side fast-refresh + useMemo warnings (16) | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §6 | 3h |
| HIGH | `ConsentComplianceService` should be split into Command/Query | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §9.4 | 2h |
| HIGH | `throw new Error` in 5 controller methods | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §9.2 | 1h |
| MED | No graceful-shutdown timeout env | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §9.8 | 1h |
| MED | 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §8.1 | 20h (multi-PR) |
| MED | Empty test subdirectories + manual runbook | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §9.5, §9.6 | 30 min |
| MED | Dead `features/*/rules/*.ts` exports (33 fns) | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §9.1 | 2h |
| LOW | IPD sub-feature removal (~500 lines) | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §9.2 | 30 min |
| LOW | 14 other LOW items | see consolidated docs | ~10h |

**Total open:** ~50h across ~25 PRs.

## Contributing to this index

When you add a new audit doc:

1. Create the doc under `docs/audits/YYYY-MM-DD-<short-name>.md`.
2. End with a Tracker section (Previous / Next / Related architecture / Related runbook / Fixed in / Verified by / Open follow-ups).
3. Add a row to the date table above.
4. If the doc introduces open findings, add a row to the severity table.

When you close an audit doc:

1. Mark the date-table status `closed`.
2. Move the open findings from the severity table to the closed doc with a link to the PR that closed them.

## See also

- [`AGENTS.md`](../../AGENTS.md) §10 — testing and verification rules.
- [`AGENTS.md`](../../AGENTS.md) §11 — repo hygiene and documentation.
- `pnpm verify:standard` — the authoritative quality gate.
- `pnpm knip` — unused exports / dependencies.
- `pnpm check:fallow` — dead-code score.
