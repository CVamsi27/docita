# Audit Index

> **The 2026-08-11/12 audit cycle is consolidated into 2 docs:**
>
> 1. **[`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md)**
>    — Every backend finding, fix, and follow-up. 80+ gate results,
>    best-practices spot-checks, architectural observations, 5
>    PrismaService leaks (allowlisted), 15 minute-miss findings,
>    §17 final pass consolidating the cycle.
>
> 2. **[`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md)**
>    — Every frontend finding, fix, and follow-up. 16 lint warnings,
>    94 dead exports, 171 useEffects, perfect-app scorecard (10
>    standards × 3 apps), 16 UI/UX backlog items, 15 follow-up PRs,
>    micro-interactions + visual polish (§35), responsive layer
>    (§36), unified P0–P3 tracker (§37), doc consolidation map (§38).
>    The 2026-08-12 `UI_UX_PERFECT_2026-08-12.md` and
>    `PERFECT_RESPONSIVE_2026-08-12.md` docs were folded into §35
>    and §36 and are no longer separate files.

## How to use this index

- **For an active review:** start with the 2 consolidated docs.
- **For history:** the consolidated docs each have a Tracker section
  pointing to the prior audits they supersede.
- **For cross-references:** both consolidated docs end with a
  Tracker section pointing to the relevant architecture docs,
  runbooks, and the PRs that fixed the issues.

## Prior audit docs (all pruned in `b6d51c4d8`)

The 14 prior audit docs were merged into the 2 consolidated docs in
commit `b6d51c4d8` ("chore(docs): prune 14 closed/superseded audit
docs"). The prior set was:

| Date | Doc | Status | One-line summary |
|---|---|---|---|
| 2026-08-11 | `BACKEND_FINAL_AUDIT_2026-08-11.md` (pruned precursor) | superseded by current doc | First draft of the consolidated backend pass |
| 2026-08-11 | `2026-08-11-backend-final-pass.md` | merged into current doc | Initial backend final pass |
| 2026-08-11 | `2026-08-11-best-practices-and-zod.md` | merged into current doc | Best-practices + Zod spot-checks |
| 2026-08-11 | `2026-08-11-final-pass-minute-misses.md` | merged into current doc | Human-reviewer minute-miss findings |
| 2026-08-10 | `2026-08-10-deep-analysis.md` | closed (all in PR #211) | Subagent full-repo deep-dive |
| 2026-08-10 | `2026-08-10-session-notes.md` | closed | Session timeline for the #211 conflict-resolution + cleanup-branch work |
| 2026-07-14 | `REFERRER_MIGRATION_REVIEW_2026-07-14.md` | closed | Referral feature migration review |
| 2026-07-13 | `UI_UX_AUDIT_2026-07-13.md` + `UI_UX_PATIENTS_VISIT_COLUMN_SPEC_2026-07-13.md` | superseded by 2026-08-11 | UI/UX standard + patients visit column spec |
| 2026-06-11 | `COMPLIANCE_LEDGER_2026-06-11.md` | closed (DPDP / RLS gates now pass) | DPDP / RLS coverage |
| 2026-06-10 | `2026-06-10-full-repo-audit.md` | closed | Round 1 of repo-wide audit |
| 2026-06-02 | `FULL_APPLICATION_FLOW_AUDIT_2026-06-02.md` | closed | Feature-flow walkthrough |
| 2026-05-29 | `PRE_DEPLOY_CHECKLIST_AUDIT_2026-05-29.md` | closed (now in `verify:standard`) | Pre-deploy gates |
| 2026-05-27 | `MAIN_FEATURES_AUDIT_2026-05-27.md` + `_findings.md` | closed | Feature inventory |
| 2026-05-27 | `DB_RETIREMENT_INVENTORY_2026-05-27.md` | closed | Database retirement candidates |
| 2026-05 | `2026-05-comprehensive-audit.md` | closed | Earliest round, fully remediated |

For prior-audit content, see the consolidated docs' `Tracker` sections.

## Deferred follow-ups ranked by severity (as of round-7, 2026-08-12 — all terminal-status)

> Status values: **DONE** (fixed + verified), **CLOSED** (verified not-a-bug / stale),
> **WITHDRAWN** (premise invalid), **DEFERRED** (recorded decision with reason).
> No row is left as bare OPEN.

| Severity | Finding | Doc | Status / Est. effort |
|---|---|---|---|
| MED | 5 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (was 7; 2 code-fixed + allowlist pruned 2026-08-12) | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §8.1 | DEFERRED — allowlisted schedulers/crons; each a dedicated migration PR (~15h total) |
| LOW | API latency baseline (operational) | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §9.10 | DEFERRED — needs stable staging soak |
| LOW | Analytics cache invalidation | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §24.1 | DEFERRED — key shapes heterogeneous; needs key-factory/event design + product sign-off |
| LOW | `apps/internal` unit specs (0 today) | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §24.3 | DEFERRED — needs page-logic extraction; dedicated round |
| LOW | E2E for INTERNAL controllers | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §24.4 | DEFERRED — behind admin RBAC; dedicated round |
| LOW | Bulk-import / WhatsApp void + audit→outbox | [`BACKEND_FINAL_AUDIT_2026-08-11.md`](BACKEND_FINAL_AUDIT_2026-08-11.md) §26.1.3/§26.3.5 | DEFERRED — outbox design decision (payload forbids PHI) |
| LOW | 12 mixed-export file warnings (re-exports) | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §14.2 | DEFERRED — mechanical churn for 104 consumers (4h) |
| ~~LOW~~ | ~~4 react-hooks/exhaustive-deps warnings~~ | **DONE** (0 remain) | — |
| ~~LOW~~ | ~~2 internal mixed-export + exhaustive-deps warnings~~ | **DONE** (1 react-refresh warning remains) | — |
| LOW | Mobile breakpoints audit (every page at 375/768/1280) | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §7 #5 | DEFERRED — audit round (4h) |
| LOW | Landing page hero redesign | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §7 #6 | DEFERRED — design/product decision (8h) |
| ~~LOW~~ | ~~Landing pricing page (interactive tier toggle)~~ | **DONE** (2026-08-12; `role=tab` + `aria-selected` pinned by a11y spec) | — |
| LOW | Internal admin analytics dashboard | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §7 #8 | DEFERRED — design/product decision (16h) |
| LOW | Image opt (Cloudflare Polish + WebP/AVIF) | [`FRONTEND_FINAL_AUDIT_2026-08-11.md`](FRONTEND_FINAL_AUDIT_2026-08-11.md) §7 #9 | DEFERRED — infra/product (2h) |
| ~~LOW~~ | ~~Reduced-motion audit~~ | **DONE** via `use-prefers-reduced-motion` hook | — |

**Total deferred:** ~45h across 12 items (all LOW/MED, each with a recorded reason and a suggested round).

Closed in this cycle (per the consolidated docs' §16.1):
ConsentComplianceService CQS split, ClinicContextGuard consolidation,
SHUTDOWN_TIMEOUT_MS env var, empty test dir cleanup, prettier auto-fix,
`seed-constants` pretest, 3 unspecced crons, file-size-budget gate extension,
IPD sub-feature removal, 3 barrel inlines, `ClinicTierType` alias deletion,
`ConsentContent` export demotion, Dead `ColumnMapping` import, knip false-positive
allowlist, `ApprovalService.approveInvoice` tenant-scope fix, Internal-admin
DTOs → Zod-first, test fix for `approval.service.spec.ts`.

## Contributing to this index

When you add a new audit doc:

1. Create the doc under `docs/audits/YYYY-MM-DD-<short-name>.md`.
2. End with a Tracker section (Previous / Next / Related architecture / Related runbook / Fixed in / Verified by / Open follow-ups).
3. Add a row to the date table above (or to the consolidated doc it feeds).
4. If the doc introduces open findings, add a row to the severity table.

When you close an audit doc:

1. Mark the date-table status `closed`.
2. Move the open findings from the severity table to the closed doc with a link to the PR that closed them.
3. If the doc is fully closed and superseded by a consolidated doc, prune it in a `chore(docs)` commit and update the prior-audits table above.

## See also

- [`AGENTS.md`](../../AGENTS.md) §10 — testing and verification rules.
- [`AGENTS.md`](../../AGENTS.md) §11 — repo hygiene and documentation.
- `pnpm verify:standard` — the authoritative quality gate.
- `pnpm knip` — unused exports / dependencies.
- `pnpm check:fallow` — dead-code score.
