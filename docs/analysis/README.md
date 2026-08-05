# Codebase Analysis Series

Point-in-time, evidence-based analysis of the Docita monorepo. Each doc is independently refreshed from live tooling output and code reads; the migration snapshot was refreshed on **2026-08-05** after the P5/P6 priority workstream and the suppression/post-cutover/stability/security/patterns companion docs were added. Where a number changes as the port proceeds, refresh the doc that owns the topic instead of copying the old number into another document.

## Analysis and execution contract

The analysis series explains risk; [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) orders the work; the companion migration, cleanup, and gap documents own the detailed inventories. A finding is not closed because a command exits zero: closure requires the relevant code change, a passing gate, and evidence that the intended files were actually scanned.

The production-readiness bar has six dimensions:

- behavior and existing-user compatibility;
- Zod/API/Prisma contract integrity;
- tenant, RBAC, PHI, audit, RLS, webhook, and upload safety;
- accessible, localized, responsive UI built from shared primitives;
- hermetic unit, integration, contract, E2E, accessibility, and performance tests;
- reproducible, observable, secret-safe, and rollback-capable delivery.

External credentials, seeded databases, or deployment access are explicit **BLOCKED** prerequisites. They must never be reported as green merely because local discovery or unit tests pass.

| Doc                                                | Scope                                                                               | Headline numbers                                                                 |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [FEATURES_ANALYSIS.md](FEATURES_ANALYSIS.md)       | What the product does: frontend features, API domains, shared modules, gating model | 46 app features (38 COMPLETE, 8 SHELL), 29 API domains, 56 feature flags         |
| [TRASH_ANALYSIS.md](TRASH_ANALYSIS.md)             | Dead code, dead deps, dead docs, orphaned exports                                   | 278 unused exports + 287 unused types; 11 dead DB enums; 0-usage `@ClinicScoped` |
| [UI_UX_ANALYSIS.md](UI_UX_ANALYSIS.md)             | Design system, components, themes, i18n, a11y                                       | 133 `@workspace/ui` files, 802 app-vite TSX components, dark mode wired          |
| [DATABASE_ANALYSIS.md](DATABASE_ANALYSIS.md)       | Prisma schema, RLS, retention, index health, growth                                 | 147 models, 112 enums, 488 indexes, 159 migrations, 469 timestamptz, RLS live    |
| [STANDARDS_ANALYSIS.md](STANDARDS_ANALYSIS.md)     | AGENTS.md rules vs automation, tests, CI, docs                                      | 97 check scripts, 646 test files, 8 workflows                                    |
| [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md)       | Auth, guards, PHI, secrets, advisories                                              | 10-guard pipeline, AES-256-GCM on 13 patient fields, 0 high / 2 low advisories   |
| [ABAC_MIGRATION_PLAN.md](ABAC_MIGRATION_PLAN.md)   | Attribute-based access control: attribute model, policy engine, phased rollout     | RBAC baseline + `AuthorizationService` precursor; 4 resource policies today      |
| [PERFORMANCE_ANALYSIS.md](PERFORMANCE_ANALYSIS.md) | Bundles, routes, API hot paths, query health                                        | app-vite 755 KB gzip total, per-route budgets, scale-to-zero                     |
| [COST_ANALYSIS.md](COST_ANALYSIS.md)               | Infra footprint and monthly run-rate                                                | Fly 2 GB API + 512 MB worker, RDS t4g.micro, 3 Cloudflare Workers                |
| **[SUPPRESSION_LEDGER.md](SUPPRESSION_LEDGER.md) (NEW 2026-08-05)** | Every static-analysis suppression: allow-file, jscpd ignore, eslint-disable, allowlist | **166 measurable suppressions**, all owned + ratcheted; 79 as-cast + 7 NNA + 45 jscpd + 15 zod-parity + 1 i18n + 6 eslint-disable |
| **[POST_CUTOVER_GAPS.md](POST_CUTOVER_GAPS.md) (NEW 2026-08-05)** | P5 ratchets: 22 jscpd pairs, 129 JSX-literal growth, Web Vitals, API latency, CSP, internal-vite admin/users, CSRF webhook regression | 9 ratchets, 4 blocked on credentials, 0 currently-failing |
| **[../architecture/PATTERNS_QUICK_REFERENCE.md](../architecture/PATTERNS_QUICK_REFERENCE.md) (NEW 2026-08-05)** | One-page lookup: "I need X" → pattern + copy-paste snippet | 11 problem→pattern mappings + 12 gotchas |
| **[../operations/STABILITY_RUNBOOK.md](../operations/STABILITY_RUNBOOK.md) (NEW 2026-08-05)** | SLOs, error budgets, alerts, rollback, capacity, common failure patterns | 15 SLOs, 14 alert→runbook mappings, 8 failure patterns |
| **[../operations/SECURITY_HARDENING_CHECKLIST.md](../operations/SECURITY_HARDENING_CHECKLIST.md) (NEW 2026-08-05)** | Defense-in-depth matrix, threat model, pre-deploy security gates, compliance mapping | 35 protections, 32 ✅ + 3 🟡, 13+ static security checks |

**Companion documents** (these docs defer to them and do not duplicate):

- [`../PORTING_PLAN_APP_VITE.md`](../PORTING_PLAN_APP_VITE.md) — the migration execution plan and per-feature parity matrix (71% by file-count audit snapshot, 48% by current app-vite unit-file snapshot).
- [`../REPO_GAPS_AND_IMPROVEMENTS.md`](../REPO_GAPS_AND_IMPROVEMENTS.md) — non-frontend audit trail (checks, deps, docs mismatches).
- [`../CODEBASE_CLEANUP_PLAN.md`](../CODEBASE_CLEANUP_PLAN.md) — the removal inventory (trash docs feed into it).
- [`../FUTURE_FEATURE_REQUIREMENTS.md`](../FUTURE_FEATURE_REQUIREMENTS.md) — prioritized product/engineering requirements backlog.
- [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) — the single execution plan for all remaining fixes across the analysis series.
- [`../FINAL_MIGRATION_ROADMAP.md`](../FINAL_MIGRATION_ROADMAP.md) — consolidated migration roadmap and phase status; it must stay consistent with the execution plan.
- [`../REFERRAL_PARTNER_PROGRAM_PLAN.md`](../REFERRAL_PARTNER_PROGRAM_PLAN.md) — authoritative partner economics, facility-lead workflow, internal operations, payout controls, anti-abuse, and release gates.
- [`ABAC_MIGRATION_PLAN.md`](ABAC_MIGRATION_PLAN.md) — phased plan for the RBAC → attribute-based access control migration (layered, guard-preserving).

**Document ownership**:

| Question                                                         | Source of truth                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| What is being built, retained, dropped, or deferred?             | [`../PORTING_PLAN_APP_VITE.md`](../PORTING_PLAN_APP_VITE.md)           |
| What must happen next and what blocks release?                   | [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) (P0–P6)                       |
| Which files, exports, dependencies, and docs are safe to remove? | [`../CODEBASE_CLEANUP_PLAN.md`](../CODEBASE_CLEANUP_PLAN.md)           |
| Which non-frontend gaps and regressions remain?                  | [`../REPO_GAPS_AND_IMPROVEMENTS.md`](../REPO_GAPS_AND_IMPROVEMENTS.md) |
| What is the consolidated migration status?                       | [`../FINAL_MIGRATION_ROADMAP.md`](../FINAL_MIGRATION_ROADMAP.md)       |
| What is the partner/referral contract and release backlog?       | [`../REFERRAL_PARTNER_PROGRAM_PLAN.md`](../REFERRAL_PARTNER_PROGRAM_PLAN.md) |
| Which static-analysis suppressions exist and why?                 | [`SUPPRESSION_LEDGER.md`](SUPPRESSION_LEDGER.md)                      |
| What ratchets/gates remain after cutover?                        | [`POST_CUTOVER_GAPS.md`](POST_CUTOVER_GAPS.md)                         |
| What is the SLO / incident / rollback contract?                   | [`../operations/STABILITY_RUNBOOK.md`](../operations/STABILITY_RUNBOOK.md) |
| What is the security posture + threat model?                      | [`../operations/SECURITY_HARDENING_CHECKLIST.md`](../operations/SECURITY_HARDENING_CHECKLIST.md) |
| Where do I find a code sample for pattern X?                      | [`../architecture/PATTERNS_QUICK_REFERENCE.md`](../architecture/PATTERNS_QUICK_REFERENCE.md) |

Before a release PR, refresh the owning analysis doc, update the consolidated roadmap, and link the command output or CI artifact. Do not silently rewrite historical audit records.

**Refresh rule**: rerun the headline commands before citing a number in a PR:

```bash
pnpm knip                                                              # unused exports/types/deps
find apps/app-vite/src -name "*.ts" -o -name "*.tsx" | wc -l            # feature port %
pnpm audit --audit-level=high                                          # advisories
cat apps/app-vite/dist/assets/*.js | gzip -c | wc -c                   # total bundle gzip
grep -c "^model \|^enum " packages/db/prisma/schema.prisma            # DB shape
node -e "console.log(require('./.jscpd.json').ignore.length)"          # suppression ratchet (P5.4)
grep -rE "check-as-cast-density: allow-file" apps packages --include="*.{ts,tsx}" 2>/dev/null \
  | grep -v node_modules | grep -v "/dist/" | wc -l                     # as-cast ratchet (P5.2)
grep -rE "check-non-null-assertion: allow-file" apps packages --include="*.{ts,tsx}" 2>/dev/null \
  | grep -v node_modules | grep -v "/dist/" | wc -l                     # NNA ratchet (P5.3)
cat scripts/checks/allowlists/zod-interface-parity.json \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"     # zod-parity ratchet (P5.5)
```
