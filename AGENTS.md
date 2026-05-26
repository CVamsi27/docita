# AGENTS.md

This file defines mandatory operating rules for coding agents working in this repository.
It adapts and consolidates guidance from `CONTRIBUTING.md` and `.github/copilot-instructions.md`.

## 1) Scope and Priority

- Treat this as a production healthcare system handling PHI.
- Prioritize safety, correctness, and maintainability over speed.
- When in doubt, follow existing repository patterns instead of introducing new ones.

## 2) Stack and Repository Model

- Monorepo: Turborepo + pnpm workspaces.
- Runtime baseline:
  - Node.js `>=22.12.0`
  - Package manager: **pnpm only** (`pnpm@10.30.3`)
  - Do not use npm or yarn in this repo.
- Apps:
  - `apps/api` (NestJS)
  - `apps/worker` (NestJS background worker)
  - `apps/app` (Next.js main app)
  - `apps/internal` (Next.js internal)
  - `apps/landing` (Astro marketing)
- Shared packages:
  - `packages/types` (Zod schemas, source of truth)
  - `packages/data-access` (API clients + React Query)
  - `packages/ui` (shared UI)
  - `packages/db` (Prisma)
  - `packages/hooks` (framework-agnostic React hooks)
  - `packages/utils` (framework-agnostic helpers)
  - `packages/eslint-config`, `packages/typescript-config` (shared configs)

### 2.1 Repository layout (canonical)

```
docita/
├── apps/
│   ├── api/                  NestJS backend
│   │   └── src/
│   │       ├── domains/<domain>/{application,core,infrastructure,presentation}
│   │       └── shared/
│   │           ├── modules/  NestJS feature modules (auth, audit, cache, database, ...)
│   │           ├── common/   legacy generic utilities migrated from src/common/ (interceptors, pipes, builders, ...)
│   │           ├── schedule/, services/
│   ├── worker/               NestJS background worker (shares infra with api)
│   ├── app/                  Next.js - main clinician app
│   │   ├── app/              App Router routes
│   │   ├── features/<feature>/{components,hooks,rules,lib,api,index.ts}
│   │   ├── providers/        app-level React providers (query, navigation)
│   │   ├── types/            ambient declarations + barrel re-export of @workspace/types
│   │   ├── test/             test-helper render() wrapper
│   │   └── shared/           non-feature code reused across features
│   │       ├── components/   common/{auth,buttons,dialogs,inputs,i18n,loaders,monitoring,navigation,pwa}/ + a few loose primitives
│   │       ├── hooks/        generic hooks + api/ subfolder of data-access hook aggregators
│   │       └── lib/          grouped by concern (see below)
│   │           ├── auth/            auth-context, session, fetch-with-session, browser-session/request, csrf, safe-return-path, permissions
│   │           ├── contexts/        app-config, clinic, socket, tier-config providers
│   │           ├── api/             api-client + error handler + config + core + query-keys/hooks + react-query-config + optimistic-updates + network-error
│   │           ├── monitoring/      logger, client-error-reporting, sentry.client.config, sentry-phi-redactor
│   │           ├── security/        security-headers
│   │           ├── access-control/  policy engine + routes (extends existing decorators/rules)
│   │           ├── subscription/    lockout + settings-path
│   │           ├── errors/          error-parser + user-facing-errors
│   │           ├── formatters/, validation/, rules/, services/, stores/, types/, i18n/, http/, constants/, utils/
│   │           └── (root)           branding, config, tier-config, support-contact, url, utils, plus a few feature-helper files
│   ├── internal/             Next.js - admin/internal dashboard (same shape as app)
│   │   ├── app/
│   │   ├── features/
│   │   ├── providers/
│   │   └── shared/{components,hooks,lib{auth,api,monitoring,errors,formatters,stores}}
│   └── landing/              Astro marketing site
├── packages/
│   ├── auth/                 access + token semantics (tests in __tests__/)
│   ├── data-access/          API clients + React Query
│   ├── db/                   Prisma client + migrations
│   ├── hooks/                framework-agnostic React hooks
│   ├── types/                Zod schemas + inferred TS types
│   ├── ui/                   presentational primitives
│   ├── utils/                pure helpers
│   ├── eslint-config/
│   └── typescript-config/
├── scripts/
│   ├── checks/               check-*.{mjs,js} - repo-wide invariants and boundaries
│   ├── perf/                 perf budgets, a11y budgets, baselines, audits
│   ├── ui/                   contrast, hardcoded-color detection, UI copy fixers
│   ├── db/                   db-check, ICD imports
│   ├── deploy/               startup smoke tests, header verifiers, OpenNext patches
│   ├── workflow/             CI scope detection, repo hygiene, contract verifiers
│   ├── lib/                  shared helpers used by other scripts
│   └── kill-ports.js         dev-loop utility
├── docs/
│   ├── architecture/         ARCHITECTURE, zod-first-architecture, DATA_FOUNDATIONS, API_DOCUMENTATION, TURBOREPO_STANDARD_STRUCTURE
│   ├── ui/                   DESIGN_SYSTEM, UI_UX_STANDARD_2026, UI_UX_CONTRACT, UI_UX_ALL_SCREENS_AUDIT_MATRIX, PAGE_STANDARDIZATION_CHECKLIST, UI_REDESIGN_CHECKLIST
│   ├── operations/           DEPLOYMENT, RUNBOOKS, STAGING, RATE_LIMITS, MIGRATION_NOTES
│   ├── compliance/           ACCESS_AUDIT, RLS_ROLLOUT, SECURITY_ALLOWLIST
│   ├── product/              INDIA_FIRST_EXECUTION, ONBOARDING, PAYMENT_FLOWS, NOTIFICATIONS_*, WHATSAPP_BROADCAST_TEMPLATES, BILLING_AND_GATING_AUDIT_2026-05-07
│   ├── testing/              TESTING
│   ├── audits/               point-in-time audit reports
│   └── UpcomingPlans/        planning notes
├── AGENTS.md
├── CLAUDE.md                 thin pointer to AGENTS.md for Claude Code
├── README.md
└── (root configs: turbo.json, pnpm-workspace.yaml, knip.json, ...)
```

Import-path conventions for `apps/app` and `apps/internal`:

| Alias | Resolves to |
|---|---|
| `@/components/...` | `apps/<app>/shared/components/...` |
| `@/hooks/...`      | `apps/<app>/shared/hooks/...` |
| `@/lib/...`        | `apps/<app>/shared/lib/...` |
| `@/features/...`   | `apps/<app>/features/...` |
| `@/app/...`        | `apps/<app>/app/...` |
| `@workspace/...`   | shared workspace packages |

The `shared/` folder is the home for **non-feature** code reused across features (theme toggles, generic dialogs, app-wide logger, etc.). New work belongs in a feature; only put code in `shared/` when at least two features need it.

## 3) Non-Negotiable Architecture Rules

### 3.1 Zod-first type system

- Zod schemas in `packages/types` are the single source of truth.
- Define/update schema first, then infer TypeScript types via `z.infer`.
- Do not create parallel handwritten interfaces for the same shape.
- Use Zod through all layers:
  - API DTOs via `nestjs-zod` / `createZodDto()`
  - frontend forms via React Hook Form + `zodResolver`
  - API response parsing via `schema.parse()`

### 3.2 HTTP contract parity (API and clients)

- For each HTTP route, request and response bodies must be defined once in `packages/types` and reused by the API (DTOs) and by `packages/data-access` (or equivalent clients).
- Do not add fields to responses “for convenience” if clients do not consume them; prefer focused schemas (`.pick()`, `.omit()`, separate response schemas) so payloads stay minimal and typing stays honest.
- Do not fork divergent TypeScript interfaces for the same endpoint; derive from the shared Zod schema.
- When introducing list or detail variants, compose from shared base schemas rather than duplicating field lists.

### 3.3 Prisma boundary

- `@prisma/client` must never leak outside:
  - `packages/db`
  - API repository layer(s)
- Services/controllers must consume domain/application types, not Prisma model types.
- Map Prisma models to domain objects inside repositories.
- Validate boundary with `pnpm check:prisma-boundary`.

### 3.4 Layering and separation

- Controllers stay thin (orchestration only).
- Services own business logic.
- Repositories own persistence and DB mapping.
- Do not mix UI, data access, and business rules in one module.

## 4) Frontend Rules

- Prefer `@workspace/ui` components over ad-hoc duplicates.
- Use React Query for server state.
- Use React Hook Form + Zod for forms.
- In Next.js apps, use Next.js navigation APIs (`Link`, `router.push`) for internal routing.
- In Astro pages, prefer native anchors for static routes and hydrate React islands only when interactivity is required.
- Always handle loading, error, and empty states.
- Keep components accessible and keyboard-friendly.
- Never import `@prisma/client` or `@workspace/db` in frontend code.
- For `apps/app` Cloudflare builds, keep the route guard file as `middleware.ts`; Next 16 may warn about the newer `proxy` convention, but this deployment path does not use it.
- For browser-side web-vitals or client-error telemetry in `apps/app` and `apps/internal`, do not post directly from the browser to `https://api.docita.work` or any other cross-origin API URL. Use a same-origin app/internal route proxy, or first update and verify the API CORS allowlist for the exact production origin. Telemetry failures must be non-blocking and must not create console noise for clinicians.
- For `apps/internal` production browser API traffic, keep `NEXT_PUBLIC_API_URL` same-origin (`/api/v1`) and route it through the internal Next proxy. Do not point internal browser builds directly at `https://api.docita.work/api/v1` unless API CORS is deliberately updated and verified for `https://internal.docita.work`.
- Do not remove Cloudflare/OpenNext runtime shims such as the `globalThis.__name` bootstrap in `apps/app/app/layout.tsx` unless the matching production Cloudflare artifact and local preview prove the helper is no longer needed. The check must include `build:cloudflare:production`, an artifact search for `__name`/telemetry URLs, and a browser or Playwright smoke of the affected production route.

### 4.1 Import path standards

- Use path aliases, not deep relative imports.
- App code: prefer `@/...`.
- Workspace packages: prefer `@workspace/...`.

### 4.2 Global styles standard

- All web apps share global styles from `packages/ui/src/styles/globals.css`.
- Do not create app-specific global css variants that diverge from this standard.

### 4.3 UI design consistency (mandatory)

- [`docs/ui/UI_UX_STANDARD_2026.md`](docs/ui/UI_UX_STANDARD_2026.md) is the authoritative UI/UX source for `apps/app`, `apps/internal`, and `apps/landing`. It supersedes any conflicting older guidance in `docs/ui/DESIGN_SYSTEM.md` or `docs/ui/UI_UX_CONTRACT.md`; those files remain for history and detail.
- Every new page, modal, or feature surface MUST be assembled from `@workspace/ui` primitives. Do not reinvent a primitive that already exists.
  - Layout/chrome: `AppPageScaffold`, `PageHeader`, `PageContainer`, `Section`, `AppShell`, `TopBar`, `Breadcrumbs`, `PageTabs`.
  - State: `DataState`, `LoadingState`, `EmptyState`, `ErrorState`, `Skeleton`.
  - Origin patterns: `MicroLabel`, `WizardDialog`, `RightRailCardStack`, `PromptInput`, `CategoryAvatar`, `ProgressGauge`, `FloatingInput`.
- Sidebar IA must remain sectioned (TRACK / SERVICES + Settings / Help / Theme / Plan footer + Ask AI pinned) per `UI_UX_STANDARD_2026.md` §1.1. The command palette must stay in lockstep with the sidebar.
- AI surfaces follow the contract in `UI_UX_STANDARD_2026.md` §4 (`AskAiButton` pinned, `AskAiOverlay` shell, contextual scope chip, "AI suggestions are not medical advice" footer).
- Motion policy is fixed: no `animate-pulse` on chrome, no skeleton `animation="wave"`, no decorative `animate-in fade-in slide-in-from-bottom-*`, no `transition-all`. Only `animate-spin` for explicit loading and `transition-colors duration-150` for hover/focus.
- Loading, error, and empty states must use `DataState` at page level (not inline rows or ad-hoc text).
- Inputs default to the floating-label `Input` variant; password fields ship the eye toggle and inline rules list per `UI_UX_STANDARD_2026.md` §3.2.
- Tokens are the only source of color/typography/spacing. No raw hex outside `packages/ui/src/styles/globals.css`. No `text-[10px]/[11px]/[13px]/[15px]`; use `--fs-2xs/xs/sm/md`.
- If a needed pattern is missing, add it to `packages/ui/src/components/<group>/` (groups: `form/`, `overlay/`, `layout/`, `feedback/`, `data-display/`, `navigation/`, `indicators/`) rather than creating an app-local duplicate, and update `UI_UX_STANDARD_2026.md` if the pattern is new. Consumers reach primitives via `@workspace/ui/components/<group>/<name>`.

## 5) Backend Rules

- Preserve tenant-aware and role-aware constraints on all sensitive operations.
- Never weaken auth guards, tenant middleware, or RBAC checks.
- Validate and sanitize inputs at boundaries.
- Keep audit-sensitive operations traceable.
- Prefer dependency injection and repository abstractions over hard-coded dependencies.

## 6) Security and Compliance Rules

- Never log PHI in plaintext.
- Never hardcode secrets/tokens/credentials.
- Use environment variables for keys and secrets.
- Do not remove audit logging for sensitive workflows.
- Respect DPDP-oriented retention/compliance expectations in data flows.
- Treat these env vars as critical:
  - `DATABASE_URL`
  - `JWT_SECRET` (minimum 32 characters)
  - `ENCRYPTION_KEY` (64-character hex key)
  - `NEXT_PUBLIC_API_URL`

## 7) Logging, Comments, and Code Hygiene

### 7.1 Logging

- Do not use `console.log` / `console.error`.
- Backend: use NestJS `Logger`.
- Frontend: use project logger utility (`@/lib/logger`).

### 7.2 Comments

- Do not leave stale TODO/FIXME comments: implement the behavior (with tests when behavior is user-visible or regression-prone), then remove the note.
- Remove comments that only restate the code; keep comments that explain non-obvious intent, security/compliance constraints, or invariant “why.”
- If a comment prescribes missing work in code you are changing, implement it and delete the comment instead of extending the backlog.

### 7.3 General code hygiene and typing

- No new `any` unless explicitly justified and constrained; prefer Zod-inferred and domain types from `packages/types`.
- Replace lingering `unknown` at boundaries with narrowing: Zod `safeParse`, custom type guards, or explicit discriminated unions—not permanent `unknown`-typed values flowing through the app.
- Do not use type escape hatches (`as any`, unchecked casts to widen types, double assertions) except where the platform truly lacks types; then isolate in a single guarded helper with a one-line rationale.
- Avoid `@ts-expect-error`, `@ts-ignore`, and broad `eslint-disable` comments—fix the root cause (types, dependency arrays, or API shape). Only suppress with a narrow scope and a one-line rationale when the ecosystem leaves no alternative.
- At boundaries (`catch`, webhook payloads, untyped JSON), use `unknown` and narrow immediately with guards or Zod `safeParse`; do not use `any` or permanent `Record<string, unknown>` where a schema already exists.
- Remove dead code and commented-out blocks.
- No emojis in code, comments, or commit messages.
- Prefer small cohesive functions and descriptive naming.
- **File naming:** kebab-case for hooks (`use-patients.ts`), rules (`patient-rules.ts`), and feature modules; PascalCase for React components.
- **Handlers:** prefix user-triggered callbacks with `handle` (`handleSubmit`, `handleClose`).
- **Session semantics:** import CSRF cookie/header names and token TTL constants from `@workspace/auth`, not ad-hoc strings.

### 7.4 Unused dependencies and exports (Knip)

- Run `pnpm knip` for consolidated or workspace-wide changes and treat failures like lint: fix unused exports and dependencies or adjust `knip.json` only when the pattern is intentional.
- In CI, Knip runs in the Repository Standards job only when the diff touches dependency manifests, `knip.json`, `turbo.json`, or paths under `apps/`, `packages/`, or `scripts/` (see `isKnipChange` in [`scripts/workflow/detect-workflow-scope.mjs`](scripts/workflow/detect-workflow-scope.mjs)). Workflow-only edits skip Knip to conserve minutes per section 11.2.

## 8) UX and Design Rules (Project-Wide)

The Origin-inspired standard in [`docs/ui/UI_UX_STANDARD_2026.md`](docs/ui/UI_UX_STANDARD_2026.md) is authoritative for all web UI work going forward. The rules below are the minimum hierarchy/spacing/responsiveness contract that applies even when that standard does not call something out explicitly.

### 8.1 Typography hierarchy (mandatory)

- Primary headings must be clearly larger and visually prominent.
- Numbered section headings must be larger than body paragraph text.
- Sub-points/inner options (nested bullets, secondary help text) must be noticeably smaller than section headings.
- Preserve this hierarchy consistently across modals, onboarding, settings, and forms.

### 8.2 Readability and spacing

- Keep list indentation and alignment consistent after `1.`, `2.`, `3.` markers.
- Maintain sufficient spacing between section headers, body copy, and inner options.
- Avoid cramped modal content and overcrowded action areas.

### 8.3 Responsiveness

- Ensure UI remains readable and usable on desktop and mobile.
- Validate critical flows where typography/spacing changed.

### 8.4 Motion and visual consistency

- Keep animations minimal (short durations, purpose-driven feedback such as loading/success); avoid decorative or distracting motion.
- Prefer consistent spacing, radii, and components from `@workspace/ui` for a clean, modern clinical product surface.

### 8.5 Form placeholders

- Use either the field label alone as placeholder text or the pattern `Enter ` followed by the label (for example `Enter phone number`), not generic filler such as “Type here” or lorem-style text.

### 8.6 Clinical workflows and design artifacts

- Optimize flows for busy clinicians: fewer steps to reach today’s schedule, active consultation, prescriptions/labs, and patient summary; keep primary actions visible without excessive nesting.
- When UX planning artifacts exist under `artifacts/` at the repo root, under `docs/artifacts/`, or in another team-approved location, align navigation, density, and terminology with those artifacts; do not invent divergent patterns without updating the artifacts or recording an explicit product decision elsewhere in docs.

## 9) Development Workflows

### 9.1 New feature flow

1. Define/update Zod schemas in `packages/types`.
2. Update/create API domain module in `apps/api/src/domains/...`.
3. Update data-access clients/hooks in `packages/data-access`.
4. Implement UI in `apps/*/features/...`.
5. Add/update tests closest to changed behavior.

### 9.2 Database change flow

1. Edit `packages/db/prisma/schema.prisma`.
2. Run migration in `packages/db`.
   For shared/staging/prod-style validation or deploys, prefer the safe migration scripts (`pnpm --filter @workspace/db run db:migrate:dry-run` / `db:migrate:safe`) over invoking raw deploy steps directly.
3. Update affected Zod schemas.
4. Update repository mappers.
5. Regenerate Prisma client (`pnpm db:generate`).
6. Do not rely on broad seed shortcuts for core medical code refresh; use the API medical-code sync job where applicable.

### 9.3 Database queries and performance

- Prefer selective `select`/`include` over loading full graphs when handlers only need a subset of fields.
- Avoid N+1 patterns: use appropriate `include`, batched queries, or explicit joins consistent with repository patterns.
- Add or adjust indexes when queries filter or sort on columns under realistic data volume; validate with `@workspace/db` guardrails (`db:analyze-indexes`, `db:check-query-plans`, etc.) when changing hot paths.
- Use pagination for large lists; avoid unbounded `findMany` in request paths.
- Normalize for integrity and update consistency; denormalize only with a documented read-performance rationale and a single source of truth for updates.

## 10) Testing and Verification

- Test strategy:
  - Unit tests for logic
  - Integration tests for module interactions
  - E2E for critical user journeys
- Framework split:
  - API uses Jest
  - Frontend uses Vitest
  - E2E uses Playwright
- End-to-end tests must stay aligned with real routes, auth, and selectors: update Playwright specs when navigation, feature flags, or critical flows change; add coverage when adding new clinician-critical journeys.
- API specs that stub NestJS `Reflector#getAllAndOverride` should use `@/test-utils` keyed helpers (`createKeyedReflectorMock`, `mockGetAllAndOverrideKeyMap`, `mockGetAllAndOverrideKeyBranch`); see `docs/testing/TESTING.md` (Backend unit tests).
- For large or consolidated pull requests, prefer this baseline before push:
  - `pnpm lint`
  - `pnpm verify:standard`
  - `pnpm check:hygiene`
  - `pnpm knip`
  - `pnpm turbo check-types --continue` (or per-package checks matching CI)
  - `pnpm test`
  - `pnpm build` when impact spans multiple apps or packages
  - `pnpm check:prisma-boundary` when API repositories or Prisma usage changed
- Minimum pre-merge checks for touched areas:
  - `pnpm lint`
  - relevant typecheck (`pnpm --filter @docita/app run check-types` / API equivalents)
  - relevant tests
  - build checks where change impact is broad
- For worker changes, run `pnpm --filter @docita/worker run lint`, `pnpm --filter @docita/worker run check-types`, and the relevant build check before pushing.
- For API flows covered by the API E2E workflow, run `pnpm --filter @docita/api run test:e2e` locally before pushing.
- For frontend UX or markup changes, run the relevant accessibility audit (`pnpm audit:app`, `pnpm audit:internal`, or `pnpm audit:landing`).
- For design-system or theme-token changes, run `pnpm check:colors`.
- For `packages/db` changes that affect indexes, query plans, or migration safety, run the relevant DB guardrails from `@workspace/db` (`db:check-integrity`, `db:analyze-indexes`, `db:profile-queries`, `db:check-query-plans`, or `db:guardrail`).
- When a pull request is already failing a GitHub Actions workflow, run the matching local command for that workflow before committing or pushing.
- For dependency or lockfile changes, run `pnpm audit --audit-level=high` locally before pushing.
- Before creating a commit or pushing a branch, run the relevant local checks for the touched area and do not push until they pass.
- For Render/OpenNext or Cloudflare-related app changes, verify the matching local `build:cloudflare` task before pushing.

## 11) Repo Hygiene and Documentation

- Keep documentation concise, current, and non-duplicative.
- Update docs when behavior or architecture changes.
- Avoid generated/runtime artifacts in git (`playwright-report`, `test-results`, logs, etc.).
- Remove stray `*.log` and scratch `*.txt` files from the working tree; do not commit them. Legitimate text fixtures belong next to tests with clear naming.
- Avoid temporary/untracked project junk unless explicitly required.
- Run `pnpm check:hygiene` and `pnpm verify:standard` when needed.
- Periodically remove unused modules, duplicate implementations, and orphaned assets; prefer consolidation into shared packages when the behavior is cross-cutting.

## 11.1) Deployment workflow scope

- Do not deploy every app on every push to `main`.
- Production deployment workflows must use path-based filtering so only the deployable apps affected by the change are released.
- The production deploy workflow currently targets the API and the worker independently; keep those deploy paths and jobs scoped separately.
- Include relevant shared packages, lockfiles, build scripts, and infra manifests in those path filters so dependent apps still deploy when their runtime inputs change.
- When a new package becomes a runtime dependency of `apps/api` or `apps/worker`, update both [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) `on.push.paths` and the deploy detection logic in [`scripts/workflow/detect-workflow-scope.mjs`](scripts/workflow/detect-workflow-scope.mjs) so migrations and Fly deploys still trigger when appropriate.
- Fly.io API deployments must be driven by [`fly.toml`](fly.toml), including the resolved app name and config path, instead of duplicating those values elsewhere in CI.
- Fly.io worker deployments must be driven by [`apps/worker/fly.toml`](apps/worker/fly.toml), including the resolved app name and config path, instead of duplicating those values elsewhere in CI.
- Staging API deployments are handled by Render auto-deploys from the `staging` branch; GitHub Actions should not add a separate deploy hook for the staging API.
- Cloudflare frontend deployments are not handled by GitHub Actions in this repository; manage their auto-deploy behavior through Cloudflare watch-path settings instead.

## 11.2) CI scope and cost

- Keep pull request workflows focused on the minimum checks required to block unsafe merges.
- Path-filter expensive workflows so unrelated app or docs changes do not consume full CI minutes.
- Frontend CI jobs should be scoped by app so `app`, `internal`, and `landing` run independently based on the files that changed.
- Prefer running full-repo build, coverage, critical E2E, bundle analysis, and other heavyweight jobs on pushes to `main`.
- Keep dependency audits scoped to dependency-manifest changes unless there is a specific reason to run them more broadly.

## 11.3) Branch model: `main`, `staging`, and feature branches

### Roles

- **`main`** is the **canonical branch** for production-bound code. All releases are cut from here (tags or deploy from `main`).
- **`staging` is a replica of `main`**: the **same tree** (identical files at the branch tip) as `main`. It is **not** an integration line. The staging environment exists to validate **the same code that is on `main`**.
- **All feature/hotfix work lands in `main` via pull request.** After merge, automation **fast-forwards** `staging` to the exact `main` commit so `staging` continuously mirrors `main` (no sync PRs).

### Never commit on `main` or `staging`

- Do **not** commit, cherry-pick, or push directly on `main` or `staging`.
- Do **not** use `staging` as a place to land work. `staging` exists only as an automated mirror of `main`.

### Start every change from `main`

1. `git fetch origin`
2. `git checkout main && git pull origin main`
3. `git fetch origin staging` (optional; confirms remote refs are current)
4. `git checkout -b <type>/<short-description>` (for example `feat/`, `fix/`, `docs/`, or a scoped consolidation branch such as `fix/consolidate-all-into-one-pr`)

Open a **pull request into `main`**. Consolidation or umbrella branches must still be created from up-to-date `main`, not from `staging`.

### Staging environment

- After merges to `main`, automation keeps `staging` in sync by moving the `staging` branch ref to the exact `main` commit.
- Validate the staging environment against `staging` knowing it should match `main` (barring sync lag or blocked required checks).

### Hotfixes

Use a branch from **up-to-date `main`**, merge via PR **into `main`**, and let the `main` → `staging` sync automation update staging.

## 12) Design Principles, Patterns, and Performance

These principles are mandatory for every change. Apply them pragmatically; do not introduce abstractions that no current caller needs.

### 12.1 SOLID

- **Single responsibility**: one reason to change per module/class/component. Split a NestJS service when it spans two unrelated domains; split a React component when its render and data orchestration both grow.
- **Open/closed**: extend behaviour through new strategies, providers, or props rather than editing stable call sites. Prefer adding a new repository implementation, NestJS provider, or `@workspace/ui` variant over branching inside an existing one.
- **Liskov substitution**: subclasses, repository implementations, and React component variants must honour the parent contract (return shapes, error semantics, accessibility roles). A `Mock*Repository` must satisfy the same interface as the real one.
- **Interface segregation**: keep DTOs, Zod schemas, and TypeScript interfaces focused. Do not force a controller to depend on fields it never reads; split schemas in `packages/types` instead.
- **Dependency inversion**: depend on abstractions, not concretions. Controllers depend on service interfaces; services depend on repository interfaces; React features depend on `packages/data-access` hooks, not on `fetch` directly.

### 12.2 KISS (keep it simple)

- Choose the simplest design that satisfies the current requirement and the next obvious one. Do not pre-build for hypothetical futures.
- Prefer flat, sequential code over nested abstractions, premature generics, or clever metaprogramming.
- Prefer composing existing `@workspace/ui` primitives over wrapping them in new abstractions.
- Small focused modules and functions over large multi-purpose ones; if a function needs section comments, split it.
- If a new pattern is added, it must replace at least one duplicate; standalone "framework" PRs are not acceptable.

### 12.3 DRY (do not repeat yourself)

- Zod schemas live once in `packages/types` and are reused via `z.infer` everywhere. Never hand-redefine the same shape in API DTOs and frontend forms.
- API clients and React Query hooks live once in `packages/data-access`. Apps must consume them, not re-roll `fetch` calls.
- UI primitives live once in `@workspace/ui`. Do not introduce app-local duplicates of `EmptyState`, `BackButton`, navigation chrome, etc.; remove duplicates when you find them (see `docs/ui/UI_UX_STANDARD_2026.md` §8).
- Tokens live once in `packages/ui/src/styles/globals.css` and are mirrored by `packages/ui/src/design-tokens.ts`. Do not redefine spacing, radius, or color in app code.
- Repository mappers live once per aggregate inside `packages/db` / API repositories; do not duplicate Prisma-to-domain mapping in services.

### 12.4 Patterns

- Repository pattern for persistence; controllers and services never touch `@prisma/client` directly (see §3.3).
- Dependency injection for cross-cutting concerns (logging, auth, tenant scope, external clients).
- Factory functions for complex object creation (test fixtures, seeded patients, multi-step entities) so call sites stay readable.
- Strategy/adapter pattern when integrating multiple external providers (payments, messaging) so the API surface stays uniform.
- **Application services** orchestrate use cases; domain objects encode invariants where the codebase already uses them.

### 12.5 Performance expectations

- **Frontend**: code-split heavy routes; lazy-load rare panels where patterns already exist; right-size React Query `staleTime`/`gcTime`; avoid rerenders from unstable callbacks and oversized context; prefer shared UI primitives to reduce bundle duplication; run `pnpm perf:budget:warn` / `pnpm perf:budget:enforce` when changing bundles.
- **Backend**: bound query cost per request (pagination, selective fields); avoid synchronous fan-out; cache only with explicit TTL and invalidation strategy where already introduced; measure hot paths before micro-optimizing.

### 12.6 Principle-first review (SOLID, patterns, KISS)

Line count is a **backstop**, not the definition of quality. Before splitting or merging modules, ask:

1. **Single responsibility** — Does this file have one reason to change? Flag mixes of routing, server I/O, business rules, and large JSX trees in one module.
2. **KISS** — Is this the simplest structure that works? Reject splits that only shuffle lines (thin pass-through wrappers, duplicate props drilling) or abstractions with a single caller and no duplicate removed.
3. **Required patterns** — Does the change follow §15.1–15.3 and §15.6–15.7 (repository, CQS, facade, feature layout, hooks vs sections, `DataState`, Zod/data-access boundaries)?
4. **Dependency direction** — Do apps depend on `packages/*` and feature hooks, not on Prisma, raw `fetch`, or cross-feature deep imports?

Use `pnpm verify:standard`, targeted tests, and the automation map in §15.11. Run `pnpm audit:structure` when relocating or splitting large surfaces (advisory report, not a substitute for review).

### 12.7 Future work convention

- Every PR opened from this point on MUST comply with §4.3 (UI consistency), §7 (logging/comments/hygiene), §8 (typography), §12 (SOLID/KISS/DRY/patterns), and the Origin-inspired standard in [`docs/ui/UI_UX_STANDARD_2026.md`](docs/ui/UI_UX_STANDARD_2026.md).
- Deviations are allowed only when documented inline in the PR description with a one-line rationale and, when relevant, a follow-up issue link. "We will fix it later" is not a rationale.
- Reviewers should block merges that introduce app-local duplicates of `@workspace/ui` primitives, parallel hand-written types alongside Zod schemas, or new pages that skip `AppPageScaffold` / `PageHeader` / `DataState` without justification.

## 13) Commands Reference

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm audit:app
pnpm audit:internal
pnpm audit:landing
pnpm check:hygiene
pnpm verify:standard
pnpm knip
pnpm check:prisma-boundary
pnpm check:colors
pnpm db:generate
pnpm db:migrate
pnpm --filter @workspace/db run db:migrate:dry-run
pnpm --filter @workspace/db run db:migrate:safe
pnpm --filter @docita/api run test:e2e
pnpm --filter @docita/worker run check-types
pnpm perf:baseline
pnpm perf:budget:warn
pnpm perf:budget:enforce
```

## 14) Agent Final Checklist

Before finalizing changes:

- Work is on a **branch created from `main`** (after pull), not on `main` or `staging` directly; PRs target **`main`**.
- Architecture/layer boundaries are respected.
- HTTP handlers and clients share Zod-defined shapes; payloads omit unused fields.
- No security or tenant/auth guard regressions.
- No PHI plaintext logging or secret leakage.
- No console logging, emoji noise, or dead code.
- Imports use aliases (`@/...` and `@workspace/...`) instead of deep relative paths.
- TODO/FIXME-style comments are resolved or removed from touched areas; redundant comments are removed per section 7.2.
- No unnecessary `any`, unchecked `unknown`, or type escape hatches outside isolated, justified helpers.
- Typographic hierarchy is preserved (headings > body > sub-points).
- New or changed pages comply with [`docs/ui/UI_UX_STANDARD_2026.md`](docs/ui/UI_UX_STANDARD_2026.md) (sectioned sidebar, minimal topbar, Origin visual language, AI surface contract, modal/wizard patterns, per-page test contract).
- Loading, error, and empty states use `DataState` at page level; no inline `Loading...` text.
- No decorative motion: no `animate-pulse` on chrome, no skeleton `animation="wave"`, no `animate-in fade-in slide-in-from-bottom-*`, no `transition-all` (per `UI_UX_STANDARD_2026.md` §5).
- Origin sidebar IA preserved: TRACK / SERVICES sections, Settings / Help / Theme / Plan footer, Ask AI pinned at the bottom; command palette parity with the sidebar.
- New surfaces use `@workspace/ui` primitives (`AppPageScaffold`, `PageHeader`, `DataState`, `PageTabs`, `MicroLabel`, `WizardDialog`, `RightRailCardStack`, `PromptInput`, `CategoryAvatar`, `ProgressGauge`, `EmptyState`, `ErrorState`, `LoadingState`) instead of app-local duplicates.
- SOLID, KISS, and DRY were applied per §12.6 (not line-count alone); any new abstraction has at least one current consumer and removes at least one duplicate.
- Required patterns in §15.6–15.7 are followed for new pages, hooks, and backend domains (or deviation is documented in the PR).
- Changed behavior is covered by appropriate tests/checks; E2E routes and selectors updated when flows move.
- When your change is Knip-relevant per the CI scope detector, `pnpm knip` passes locally and the Knip step runs in CI; otherwise run Knip locally before merging if you touched dependencies or exports.
- `pnpm lint`, targeted `check-types`, tests, and Knip (when applicable) pass before push.
- Relevant local tests/builds were run and passed before the final push.
- If CI was red, the corresponding local workflow commands were run and passed before the final push.

## 15) Pattern Catalogue

When this file says to follow existing patterns, use these concrete references before adding a new instance. Subsections 15.1–15.3 are stable references; subsections 15.4–15.10 codify patterns validated during the 2026-05 audit sprint.

### 15.1 Backend Patterns

- **Domain layout**: `apps/api/src/domains/<domain>/{application,core,infrastructure,presentation}`. Reference: `apps/api/src/domains/appointments`.
- **Controller posture**: every route declares `@Public`, `@Roles`, `@RequireFeature`, or inherits an explicit controller-level posture. Enforced by `scripts/checks/check-controller-rbac.mjs`.
- **DTOs**: schemas originate in `packages/types` and API DTOs wrap them with `createZodDto`.
- **Persistence**: repositories isolate Prisma access and map database rows to application/domain objects.
- **Tier/feature gates**: never compare `Tier.INTELLIGENCE` or `Tier.FRONT_DESK` numerically. Use `hasFeatureAccess`, `getMinimumTierForFeature`, and the feature guards. Front Desk clinical blocking uses `isFrontDeskTier(clinic.tier)` only (§15.8) — not a `workspaceProfile` setting.
- **Pure rules/calculators**: keep deterministic business math free of NestJS decorators and dependency injection.

### 15.2 Frontend Patterns

- **Feature layout**: `apps/app/features/<feature>/{components,hooks,rules,lib,types,index.ts}` with public imports through `index.ts`.
- **Non-feature code** (shared across features) lives in `apps/<app>/shared/{components,hooks,lib}` and is reached via `@/components/...`, `@/hooks/...`, `@/lib/...` (the aliases now resolve into `shared/`). Promote into `packages/ui`, `packages/hooks`, or `packages/utils` once a second app needs it.
- **Per-domain data hooks** live in `packages/data-access/src/hooks/` (e.g. `useAppointments`, `usePatients`, `useBillingHistory`). The package owns the React Query wrappers; the app injects the session-aware fetcher via `<DataAccessProvider>` (mounted by `apps/app/providers/data-access-bridge.tsx`). Add new data hooks here, not in app-local API hook folders. App-only composition (auth, locale, toasts) belongs in `apps/app/features/<feature>/hooks/` (e.g. `features/subscription/hooks/use-pricing.ts`, `features/patients/hooks/use-patient-history.ts`). The legacy `apps/app/shared/hooks/api/` directory must stay deleted (`check:legacy-app-api-hooks`).
- **Pages**: route files compose feature shells; business logic belongs in feature components/hooks.
- **Data fetching**: feature code consumes `packages/data-access` hooks or approved app API wrappers. Inline `fetch` in client features is blocked by `scripts/checks/check-frontend-fetch.mjs`.
- **State**: React Query for server state, established stores for cross-cutting client state, and local state only for view-local behavior.
- **UI**: assemble from `@workspace/ui` primitives and follow `docs/ui/UI_UX_STANDARD_2026.md`.

### 15.3 Shared Package Boundaries

- `packages/types`: Zod schemas and inferred types only.
- `packages/data-access`: API clients, query keys, React Query hooks, and response parsing. No UI.
- `packages/ui`: presentational primitives. No data fetching or business rules.
- `packages/hooks`: framework-agnostic React hooks. No Next.js imports.
- `packages/utils`: framework-agnostic helpers. No React or Next.js imports.
- `packages/db`: Prisma schema/client and database scripts only.

### 15.4 SOLID Principles Applied (2026-05 audit)

- **Single Responsibility**: one reason to change per module. Backend: Command/Query/calculator split when a service owns unrelated reads and writes. Frontend: route/page composes; `use-*` hook owns state and I/O; `*-sections.tsx` / row components own JSX fragments.
- **Open/Closed**: `Feature` enum + `FEATURE_TIER_MAP` are the extension point — add features without modifying guards. New tier capabilities extend the matrix, not existing code.
- **Liskov Substitution**: repository interfaces (`IAppointmentRepository`, etc.) allow DI swapping. The `StorageProvider` abstraction lets R2/S3 swap without touching service logic.
- **Interface Segregation**: controllers depend on split services (Command vs Query), not fat facades. React components receive only the props they render.
- **Dependency Inversion**: NestJS `@Inject('IAppointmentRepository')` tokens bind interfaces, not concretions. React hooks (`usePatientMetricsUI`, `useOnboardingDraft`) abstract data from render; UI must not call `fetch` or Prisma directly.

### 15.5 Module shape and decomposition (principle-first)

Split or extract when **responsibility**, **pattern fit**, or **duplication** demand it — not to chase a line target.

**Split when (review criteria):**

| Signal | Backend | Frontend |
| --- | --- | --- |
| Mixed read/write orchestration | Introduce `XQueryService` + `XCommandService`; optional `XCalculator` for pure math | — |
| Fat persistence in a “facade” | Delegate to command/query; keep `XService` as thin facade if needed for tests | — |
| UI + data + navigation in one component | — | `use-<feature>.ts` + `*-sections.tsx` / row components + thin page shell |
| Repeated JSX or rules | Shared helper or `@workspace/ui` primitive | `*-helpers.ts` (no React) or shared section component |
| Cross-feature coupling | — | Move to `packages/*` or `shared/` only when ≥2 features need it |

**KISS guardrails:**

- Do not add a new file unless it **removes duplication** or **isolates a distinct responsibility**.
- Prefer one clear hook over several single-use 10-line wrappers.
- Barrel re-exports (`index.ts`) expose the feature API; avoid deep imports around the public surface.

**Canonical frontend split (when the table above applies):**

- `use-<surface>.ts` — `useState`, `useMemo`, `useEffect`, React Query, mutations, derived values.
- `<surface>-sections.tsx` or `<surface>-<part>.tsx` — presentational blocks; props in, events out; no `fetch`.
- `<surface>-helpers.ts` — pure functions/constants; no React imports.
- Route/page file — composes feature shell only (`AppPageScaffold`, `PageHeader`, `DataState`).

**Canonical backend split (when the table above applies):**

- `XCommandService` / `XQueryService` (+ optional calculator) registered in the domain module.
- Facade `XService` may remain for stable constructor/DI compatibility; must delegate (`check:facade-delegation`).

**Line-count backstop (automation only):** `pnpm check:file-size-budget` fails API `*.service.ts` and `apps/app/features/**` files above **400** lines (tests excluded). `pnpm audit:structure` may **advise** splits (e.g. feature components >400 lines, controllers >260, route pages >180). Passing the backstop does **not** prove SOLID; failing it means split or document an exception in the PR.

**Imports:** cross-directory imports use `@/` or `@workspace/...`. Sibling `./` imports are allowed; parent `../` is ESLint-banned.

### 15.6 Design Patterns in Use

- **Facade**: `AppointmentService`, `InvoicesService`, `UsageTrackingService` keep a stable public API while delegating to split internals.
- **Command/Query Separation (CQS)**: backend services split on the read vs. mutate axis. Query services must not be imported into command chains.
- **Repository Pattern**: every domain has an `IXRepository` interface + `PrismaXRepository` implementation. Controllers never touch Prisma directly.
- **Strategy Pattern**: `StorageProvider` abstraction; `OnboardingStepEngine` (pure state machine callable with any persistence strategy).
- **Observer Pattern**: `EventEmitter2` for `appointment.created`, `invoice.paid`, etc. — producers and consumers are decoupled.
- **Decorator Pattern**: `@AuditLogged`, `@RequireFeature`, `@Roles` — cross-cutting concerns added without modifying method logic.
- **Template Method**: `BasePdfService` defines the PDF render pipeline; `InvoicePdfRenderer`/`PrescriptionPdfRenderer` fill in the steps.

### 15.7 Frontend Component Architecture

- **Page shell**: `AppPageScaffold → PageHeader → DataState → Content` is the mandatory pattern for every new page.
- **Colocation rule**: types used only within one feature stay in `features/<feature>/types.ts`. Shared types go to `packages/types`. Never duplicate.
- **Draft pattern**: `useOnboardingDraft` is the canonical pattern for localStorage persistence — hook encapsulates read/write/expiry; component only calls handlers.
- **Sections file** (`*-sections.tsx`): sub-components that accept props from the orchestrator. Pure render, no data fetching.
- **Helpers file** (`*-helpers.ts`): pure functions and constants. No React imports. Fully unit-testable without DI.

### 15.8 Tier/Feature Gating Contract (critical)

- `Tier.INTELLIGENCE` and `Tier.FRONT_DESK` are **never** compared with `>=`. Use the `hasIntelligence` flag or `hasFeatureAccess(Feature.X)`.
- All 56 `Feature` enum values map to tiers via `FEATURE_TIER_MAP`. Both backend (`assertClinicHasFeatureOrThrow`) and frontend (`<FeatureGate>`) derive from this single source of truth.
- **Front Desk is tier-only.** A clinic on the Front Desk billed SKU has `clinic.tier === Tier.FRONT_DESK`. There is no `settings.workspaceProfile`, workspace-mode picker, or plan→profile resolver — onboarding and billing set the tier directly.
- **Canonical Front Desk helpers** (all in `@workspace/types`): `isFrontDeskTier(tier)`; `FRONT_DESK_BLOCKED_FEATURES` for `@RequireFeature` / `hasFeatureAccess` denials; `FRONT_DESK_BLOCKED_ACCESS_TARGETS` and `shouldDenyAccessForFrontDeskTier` for route/API access policy. Prefer these helpers over ad-hoc `tier === "FRONT_DESK"` checks at call sites.
- **Removed symbols** (do not reintroduce): `workspaceProfile`, `isFrontDeskClinicMode`, `isFrontDeskWorkspace`, `resolveWorkspaceProfileForPlan`, `WorkspaceModeCard`, `WorkspaceSelector`. `pnpm check:workspace-profile-gating` fails the build if they appear outside migration SQL and [`scripts/checks/check-workspace-profile-gating.mjs`](scripts/checks/check-workspace-profile-gating.mjs) (historical script name).

### 15.9 Import Discipline

| Package | Allowed contents | Banned |
|---|---|---|
| `packages/types` | Zod schemas + `z.infer` types | Runtime logic, React |
| `packages/data-access` | React Query hooks | Direct `fetch()`, UI |
| `packages/ui` | Presentational primitives | Data fetching, business logic |
| `packages/hooks` | Framework-agnostic React hooks | Next.js-specific imports |
| `packages/utils` | Pure functions | React, Next.js |

Relative parent imports (`../`) are ESLint-banned across all apps. Use `@/` absolute paths for cross-directory references.

### 15.10 Testing Expectations (2026-05 audit)

- Service constructor changes require test mock updates. Use `Object.create(X.prototype) as X` to create mock instances of NestJS services without invoking the constructor.
- Spec files live next to the service file. Integration specs for controllers go in `apps/api/test/`.
- Pure helpers (`XCalculator`, `*-helpers.ts`) must have standalone unit tests — no DI container required.
- When a service is split into Command/Query/Calculator, each file gets its own spec. The facade spec covers only delegation and module wiring.

### 15.11 Automation map (what CI enforces vs what agents must review)

Mechanical checks catch **boundary violations**; they do not fully enforce SOLID or KISS. Agents and reviewers must still apply §12.6 and §15.5.

| Principle / pattern | Command(s) | What it actually checks |
| --- | --- | --- |
| **Layering / DDD** | `pnpm check:prisma-boundary`, `pnpm check:api-domain-layout`, `pnpm check:cross-domain-*-imports` | Prisma and domain folder boundaries |
| **Repository + thin controller** | `pnpm check:controller-cqs`, `pnpm check:route-thinness` | Controllers orchestrate; routes stay thin |
| **Facade / CQS** | `pnpm check:facade-delegation --enforce` | Large application services delegate instead of embedding persistence |
| **Zod-first / contracts** | `pnpm check:contracts-strict`, `pnpm verify:contracts`, `pnpm check:type-duplicates` | Shared schemas; no duplicate DTO shapes |
| **Data access (frontend)** | `pnpm check:frontend-fetch`, `pnpm check:legacy-app-api-hooks` | No inline client `fetch`; legacy app API hook dir stays gone |
| **Feature / package boundaries** | `pnpm check:feature-boundaries`, `pnpm check:package-boundaries` | Imports stay inside feature and package rules |
| **Tier / feature gating** | `pnpm check:tier-comparisons`, `pnpm check:workspace-profile-gating` | No numeric tier compares; blocks legacy `workspaceProfile` symbols; tier-only Front Desk via `isFrontDeskTier` |
| **RBAC** | `pnpm check:controller-rbac` | Controller auth posture declared |
| **Tenant / RLS** | `pnpm check:auth-tenant-safety`, `pnpm check:rls-rollout-readiness` | Tenant-safe auth; RLS rollout config |
| **DRY / hygiene** | `pnpm knip`, `pnpm check:hygiene` | Unused exports/deps; repo junk |
| **Typing discipline** | `pnpm check:as-cast-density`, `pnpm lint`, `pnpm turbo check-types` | Limit type escapes; ESLint rules |
| **UI contract** | `pnpm check:colors`, `pnpm check:a11y-budget`, Origin standard in §4.3 | Tokens, a11y baseline, page primitives |
| **Size backstop** | `pnpm check:file-size-budget`, `pnpm audit:structure` | Oversized files (advisory unless `--enforce` on structure) |
| **Rules unit tests** | `pnpm check:domain-rules-tests` | Feature `rules/*.test.ts` present where required |

**Bundle:** `pnpm verify:standard` runs the production guardrail set above (plus hygiene, deployment contracts, PHI/audit checks). Run it before push when touching architecture, auth, data access, or large feature surfaces.
