# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Source of truth

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the authoritative spec for:

- Stack and runtime (Turborepo, pnpm, Node, NestJS, Next.js, Astro)
- Repository layout (see AGENTS.md §2.1 — apps, packages, scripts, docs)
- Non-negotiable architecture rules (Zod-first, Prisma boundary, layering)
- Frontend rules (UI primitives, `@workspace/ui`, design tokens, motion policy)
- Backend rules (tenant/RBAC, audit, repositories)
- Security and compliance (PHI handling, secret hygiene)
- Logging, comments, typing, and Knip hygiene
- UX hierarchy and Origin-inspired UI standard ([`docs/ui/UI_UX_STANDARD_2026.md`](./docs/ui/UI_UX_STANDARD_2026.md))
- Development workflows (new feature, DB change, queries/performance)
- Testing strategy and pre-merge checks
- Branch model (`main` canonical, `staging` mirrors `main`, PRs target `main`)
- Pattern Catalogue (§15: backend DDD, frontend features, design patterns, decomposition rules, tier/feature gating, import discipline, testing expectations)

Everything in this file is shorthand — defer to AGENTS.md when in doubt.

## Repository layout (quick reference)

```
apps/
  api/          NestJS — src/domains/<domain>/{application,core,infrastructure,presentation}
  worker/       NestJS background worker
  app/          Next.js main app — features/<feature>/* + shared/{components,hooks,lib/{auth,contexts,api,monitoring,security,access-control,subscription,errors,formatters,...}}
  internal/     Next.js admin app — same shape as app/ (smaller shared/lib: auth, api, monitoring, errors, formatters)
  landing/      Astro marketing
packages/
  types/        Zod schemas + inferred types (single source of truth)
  data-access/  API clients + React Query hooks
  ui/           Presentational primitives + design tokens — components grouped under form/, overlay/, layout/, feedback/, data-display/, navigation/, indicators/
  db/           Prisma client + migrations
  auth/         Access + token semantics
  hooks/        Framework-agnostic React hooks
  utils/        Pure helpers
  eslint-config/, typescript-config/
scripts/
  checks/       Boundary and invariant checks (check-*.mjs)
  perf/         Perf + a11y budgets and baselines
  ui/           Color/contrast/UI-copy tools
  db/           db-check and data imports
  deploy/       Startup smoke, header verifiers, OpenNext patches
  workflow/     CI scope detection, repo hygiene, contract verifiers
  lib/          Shared helpers for other scripts
docs/
  architecture/, ui/, operations/, compliance/, product/, testing/, audits/, UpcomingPlans/
```

## Import aliases (apps/app, apps/internal)

| Alias | Resolves to |
|---|---|
| `@/components/...` | `apps/<app>/shared/components/...` |
| `@/hooks/...`      | `apps/<app>/shared/hooks/...` |
| `@/lib/...`        | `apps/<app>/shared/lib/...` |
| `@/features/...`   | `apps/<app>/features/...` |
| `@/app/...`        | `apps/<app>/app/...` |
| `@workspace/<pkg>` | `packages/<pkg>` |
| `@workspace/ui/components/<group>/<name>` | grouped UI primitive (form, overlay, layout, feedback, data-display, navigation, indicators) |

Never use parent-relative imports (`../`). They are ESLint-banned across all apps.

## Where to put new code

- **A feature surface** (a page, modal, flow) → `apps/<app>/features/<feature>/...`. Owns its components, hooks, rules, and local types. Public API through `index.ts`.
- **Cross-feature primitive** used by ≥2 apps → `packages/ui` (presentational) or `packages/hooks` / `packages/utils`.
- **Cross-feature primitive** used by 1 app only → `apps/<app>/shared/{components,hooks,lib}`. Promote to a package once a second app needs it.
- **Per-domain data hook** (`use-appointments`, `use-patients`, etc.) → `packages/data-access/src/hooks/`. Get the fetcher / clinic id / tier guard via `useDataAccessContext()`. The app wires the provider in `apps/app/providers/data-access-bridge.tsx`. See [`docs/architecture/DATA_ACCESS_MIGRATION_PLAN.md`](./docs/architecture/DATA_ACCESS_MIGRATION_PLAN.md) for the contract.
- **Schema, type, or DTO** → `packages/types` (Zod first; infer types with `z.infer`).
- **Backend domain** → `apps/api/src/domains/<domain>/...` following the DDD layout in AGENTS.md §15.1.
- **Repo-wide invariant check** → `scripts/checks/check-*.mjs` and wire into CI via `scripts/workflow/detect-workflow-scope.mjs`.

## Things that will trip you up

- The `@/components/...`, `@/hooks/...`, and `@/lib/...` aliases do **not** point at `apps/<app>/{components,hooks,lib}/` anymore — those folders no longer exist. They resolve through tsconfig into `apps/<app>/shared/{components,hooks,lib}/`. The `@/lib/` tree is further grouped into subfolders by concern (`@/lib/auth/...`, `@/lib/contexts/...`, `@/lib/api/...`, `@/lib/monitoring/...`, `@/lib/security/...`, `@/lib/access-control/...`, `@/lib/subscription/...`, `@/lib/errors/...`). Look there before adding a new top-level file.
- Feature-specific code belongs in `apps/<app>/features/<feature>/`, not `shared/`. Promote into `packages/` once a second app needs it.
- `@workspace/db` is allowed only in `apps/api/**`, `packages/db/**`, and `scripts/**`. Frontend apps must stay DB-agnostic ([`scripts/checks/check-prisma-boundary.js`](./scripts/checks/check-prisma-boundary.js)).
- Inline `fetch()` in client features is blocked. Use `packages/data-access` hooks ([`scripts/checks/check-frontend-fetch.mjs`](./scripts/checks/check-frontend-fetch.mjs)).
- Tier comparisons (`tier >= Tier.INTELLIGENCE`) are banned. Use `hasFeatureAccess(Feature.X)` (AGENTS.md §15.8).
- Don't compare `_dirname` script paths with `..` once you move a script — repo-root resolution depends on depth.

## Routine commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm check:hygiene             # scripts/workflow/check-repo-hygiene.mjs
pnpm verify:standard
pnpm knip
pnpm check:prisma-boundary     # scripts/checks/check-prisma-boundary.js
pnpm check:colors              # scripts/ui/check-contrast.mjs
pnpm db:generate
pnpm db:migrate
pnpm audit:app                 # frontend a11y audit
pnpm perf:baseline             # scripts/perf/perf-baseline.mjs
```

## Final checklist before claiming done

Run the AGENTS.md §14 checklist. Highlights for Claude:

- Work is on a branch cut from `main` (never commit to `main` or `staging`).
- Imports use aliases (`@/...`, `@workspace/...`), never `../`.
- No `console.log`/`console.error` (use NestJS `Logger` or `@/lib/logger`).
- No new `any` or `@ts-ignore` without an isolated, justified helper.
- Loading/error/empty states use `DataState` at page level.
- New surfaces are assembled from `@workspace/ui` primitives, not app-local duplicates.
- `pnpm lint`, targeted `check-types`, tests, and Knip (when applicable) pass before push.
