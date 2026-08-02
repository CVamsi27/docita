# Codebase Analysis Series

Point-in-time, evidence-based analysis of the Docita monorepo. Each doc is independent and was produced from live tooling output + code reads on **2026-08-02** (migration branch: `apps/app` + `apps/internal` staged for deletion, Vite apps untracked). Where a number changes as the port proceeds, the doc that owns the topic should be refreshed.

| Doc | Scope | Headline numbers |
|---|---|---|
| [FEATURES_ANALYSIS.md](FEATURES_ANALYSIS.md) | What the product does: frontend features, API domains, shared modules, gating model | 46 app features (38 COMPLETE, 8 SHELL), 29 API domains, 56 feature flags |
| [TRASH_ANALYSIS.md](TRASH_ANALYSIS.md) | Dead code, dead deps, dead docs, orphaned exports | 278 unused exports + 287 unused types; 11 dead DB enums; 0-usage `@ClinicScoped` |
| [UI_UX_ANALYSIS.md](UI_UX_ANALYSIS.md) | Design system, components, themes, i18n, a11y | 133 `@workspace/ui` files, 802 app-vite TSX components, dark mode wired |
| [DATABASE_ANALYSIS.md](DATABASE_ANALYSIS.md) | Prisma schema, RLS, retention, index health, growth | 147 models, 112 enums, 488 indexes, 159 migrations, 469 timestamptz, RLS live |
| [STANDARDS_ANALYSIS.md](STANDARDS_ANALYSIS.md) | AGENTS.md rules vs automation, tests, CI, docs | 97 check scripts, 646 test files, 8 workflows |
| [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md) | Auth, guards, PHI, secrets, advisories | 10-guard pipeline, AES-256-GCM on 13 patient fields, 3 open high advisories |
| [PERFORMANCE_ANALYSIS.md](PERFORMANCE_ANALYSIS.md) | Bundles, routes, API hot paths, query health | app-vite 755 KB gzip total, per-route budgets, scale-to-zero |
| [COST_ANALYSIS.md](COST_ANALYSIS.md) | Infra footprint and monthly run-rate | Fly 2 GB API + 512 MB worker, RDS t4g.micro, 3 Cloudflare Workers |

**Companion documents** (these docs defer to them and do not duplicate):

- [`../PORTING_PLAN_APP_VITE.md`](../PORTING_PLAN_APP_VITE.md) — the migration execution plan and per-feature parity matrix (71% by file count, 44% by test count).
- [`../REPO_GAPS_AND_IMPROVEMENTS.md`](../REPO_GAPS_AND_IMPROVEMENTS.md) — non-frontend audit trail (checks, deps, docs mismatches).
- [`../CODEBASE_CLEANUP_PLAN.md`](../CODEBASE_CLEANUP_PLAN.md) — the removal inventory (trash docs feed into it).
- [`../FUTURE_FEATURE_REQUIREMENTS.md`](../FUTURE_FEATURE_REQUIREMENTS.md) — prioritized product/engineering requirements backlog.
- [`EXECUTION_PLAN.md`](EXECUTION_PLAN.md) — the single execution plan for all remaining fixes across the analysis series.
- [`../FINAL_MIGRATION_ROADMAP.md`](../FINAL_MIGRATION_ROADMAP.md) — **single source of truth** consolidating PORTING_PLAN + REPO_GAPS + EXECUTION_PLAN + CODEBASE_CLEANUP.

**Refresh rule**: rerun the headline commands before citing a number in a PR:

```bash
pnpm knip                                   # unused exports/types/deps
find apps/app-vite/src -name "*.ts" -o -name "*.tsx" | wc -l   # feature port %
pnpm audit --audit-level=high               # advisories
cat apps/app-vite/dist/assets/*.js | gzip -c | wc -c            # total bundle gzip
grep -c "^model \|^enum " packages/db/prisma/schema.prisma     # DB shape
```
