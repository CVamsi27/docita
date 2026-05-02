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

## 3) Non-Negotiable Architecture Rules

### 3.1 Zod-first type system

- Zod schemas in `packages/types` are the single source of truth.
- Define/update schema first, then infer TypeScript types via `z.infer`.
- Do not create parallel handwritten interfaces for the same shape.
- Use Zod through all layers:
  - API DTOs via `nestjs-zod` / `createZodDto()`
  - frontend forms via React Hook Form + `zodResolver`
  - API response parsing via `schema.parse()`

### 3.2 Prisma boundary

- `@prisma/client` must never leak outside:
  - `packages/db`
  - API repository layer(s)
- Services/controllers must consume domain/application types, not Prisma model types.
- Map Prisma models to domain objects inside repositories.
- Validate boundary with `pnpm check:prisma-boundary`.

### 3.3 Layering and separation

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

### 4.1 Import path standards

- Use path aliases, not deep relative imports.
- App code: prefer `@/...`.
- Workspace packages: prefer `@workspace/...`.

### 4.2 Global styles standard

- All web apps share global styles from `packages/ui/src/styles/globals.css`.
- Do not create app-specific global css variants that diverge from this standard.

### 4.3 UI design consistency (mandatory)

- [`docs/UI_UX_STANDARD_2026.md`](docs/UI_UX_STANDARD_2026.md) is the authoritative UI/UX source for `apps/app`, `apps/internal`, and `apps/landing`. It supersedes any conflicting older guidance in `docs/DESIGN_SYSTEM.md` or `docs/UI_UX_CONTRACT.md`; those files remain for history and detail.
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
- If a needed pattern is missing, add it to `packages/ui/src/components` rather than creating an app-local duplicate, and update `UI_UX_STANDARD_2026.md` if the pattern is new.

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

### 7.3 General code hygiene

- No new `any` unless explicitly justified and constrained; prefer Zod-inferred and domain types from `packages/types`.
- Avoid `@ts-expect-error`, `@ts-ignore`, and broad `eslint-disable` comments—fix the root cause (types, dependency arrays, or API shape). Only suppress with a narrow scope and a one-line rationale when the ecosystem leaves no alternative.
- At boundaries (`catch`, webhook payloads, untyped JSON), use `unknown` and narrow immediately with guards or Zod `safeParse`; do not use `any` or permanent `Record<string, unknown>` where a schema already exists.
- Remove dead code and commented-out blocks.
- No emojis in code, comments, or commit messages.
- Prefer small cohesive functions and descriptive naming.

### 7.4 Unused dependencies and exports (Knip)

- Run `pnpm knip` for consolidated or workspace-wide changes and treat failures like lint: fix unused exports and dependencies or adjust `knip.json` only when the pattern is intentional.
- In CI, Knip runs in the Repository Standards job only when the diff touches dependency manifests, `knip.json`, `turbo.json`, or paths under `apps/`, `packages/`, or `scripts/` (see `isKnipChange` in [`scripts/detect-workflow-scope.mjs`](scripts/detect-workflow-scope.mjs)). Workflow-only edits skip Knip to conserve minutes per section 11.2.

## 8) UX and Design Rules (Project-Wide)

The Origin-inspired standard in [`docs/UI_UX_STANDARD_2026.md`](docs/UI_UX_STANDARD_2026.md) is authoritative for all web UI work going forward. The rules below are the minimum hierarchy/spacing/responsiveness contract that applies even when that standard does not call something out explicitly.

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

## 10) Testing and Verification

- Test strategy:
  - Unit tests for logic
  - Integration tests for module interactions
  - E2E for critical user journeys
- Framework split:
  - API uses Jest
  - Frontend uses Vitest
  - E2E uses Playwright
- API specs that stub NestJS `Reflector#getAllAndOverride` should use `@/test-utils` keyed helpers (`createKeyedReflectorMock`, `mockGetAllAndOverrideKeyMap`, `mockGetAllAndOverrideKeyBranch`); see `docs/TESTING.md` (Backend unit tests).
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
- Avoid temporary/untracked project junk (`.txt`, `.log`, scratch artifacts) unless explicitly required.
- Run `pnpm check:hygiene` and `pnpm verify:standard` when needed.

## 11.1) Deployment workflow scope

- Do not deploy every app on every push to `main`.
- Production deployment workflows must use path-based filtering so only the deployable apps affected by the change are released.
- The production deploy workflow currently targets the API and the worker independently; keep those deploy paths and jobs scoped separately.
- Include relevant shared packages, lockfiles, build scripts, and infra manifests in those path filters so dependent apps still deploy when their runtime inputs change.
- Fly.io API deployments must be driven by [`fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/fly.toml), including the resolved app name and config path, instead of duplicating those values elsewhere in CI.
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
3. `git checkout -b <type>/<short-description>` (for example `feat/`, `fix/`, `docs/`, or a scoped consolidation branch such as `fix/consolidate-all-into-one-pr`)

Open a **pull request into `main`**. Consolidation or umbrella branches must still be created from up-to-date `main`, not from `staging`.

### Staging environment

- After merges to `main`, automation keeps `staging` in sync by moving the `staging` branch ref to the exact `main` commit.
- Validate the staging environment against `staging` knowing it should match `main` (barring sync lag or blocked required checks).

### Hotfixes

Use a branch from **up-to-date `main`**, merge via PR **into `main`**, and let the `main` → `staging` sync automation update staging.

## 12) Design Principles

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
- UI primitives live once in `@workspace/ui`. Do not introduce app-local duplicates of `EmptyState`, `BackButton`, navigation chrome, etc.; remove duplicates when you find them (see `docs/UI_UX_STANDARD_2026.md` §8).
- Tokens live once in `packages/ui/src/styles/globals.css` and are mirrored by `packages/ui/src/design-tokens.ts`. Do not redefine spacing, radius, or color in app code.
- Repository mappers live once per aggregate inside `packages/db` / API repositories; do not duplicate Prisma-to-domain mapping in services.

### 12.4 Patterns

- Repository pattern for persistence; controllers and services never touch `@prisma/client` directly (see §3.2).
- Dependency injection for cross-cutting concerns (logging, auth, tenant scope, external clients).
- Factory functions for complex object creation (test fixtures, seeded patients, multi-step entities) so call sites stay readable.
- Strategy/adapter pattern when integrating multiple external providers (payments, messaging) so the API surface stays uniform.

## 12.5) Future work convention

- Every PR opened from this point on MUST comply with §4.3 (UI consistency), §7 (logging/comments/hygiene), §8 (typography), §12 (SOLID/KISS/DRY/patterns), and the Origin-inspired standard in [`docs/UI_UX_STANDARD_2026.md`](docs/UI_UX_STANDARD_2026.md).
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
- No security or tenant/auth guard regressions.
- No PHI plaintext logging or secret leakage.
- No console logging, emoji noise, or dead code.
- Imports use aliases (`@/...` and `@workspace/...`) instead of deep relative paths.
- TODO/FIXME-style comments are resolved or removed from touched areas; redundant comments are removed per section 7.2.
- Typographic hierarchy is preserved (headings > body > sub-points).
- New or changed pages comply with [`docs/UI_UX_STANDARD_2026.md`](docs/UI_UX_STANDARD_2026.md) (sectioned sidebar, minimal topbar, Origin visual language, AI surface contract, modal/wizard patterns, per-page test contract).
- Loading, error, and empty states use `DataState` at page level; no inline `Loading...` text.
- No decorative motion: no `animate-pulse` on chrome, no skeleton `animation="wave"`, no `animate-in fade-in slide-in-from-bottom-*`, no `transition-all` (per `UI_UX_STANDARD_2026.md` §5).
- Origin sidebar IA preserved: TRACK / SERVICES sections, Settings / Help / Theme / Plan footer, Ask AI pinned at the bottom; command palette parity with the sidebar.
- New surfaces use `@workspace/ui` primitives (`AppPageScaffold`, `PageHeader`, `DataState`, `PageTabs`, `MicroLabel`, `WizardDialog`, `RightRailCardStack`, `PromptInput`, `CategoryAvatar`, `ProgressGauge`, `EmptyState`, `ErrorState`, `LoadingState`) instead of app-local duplicates.
- SOLID, KISS, and DRY were considered before introducing new abstractions; any new abstraction has at least one current consumer and removes at least one duplicate.
- Changed behavior is covered by appropriate tests/checks.
- When your change is Knip-relevant per the CI scope detector, `pnpm knip` passes locally and the Knip step runs in CI; otherwise run Knip locally before merging if you touched dependencies or exports.
- Relevant local tests/builds were run and passed before the final push.
- If CI was red, the corresponding local workflow commands were run and passed before the final push.
