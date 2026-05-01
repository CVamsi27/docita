# AGENTS.md

This file defines mandatory operating rules for coding agents working in this repository.
It adapts and consolidates guidance from `CLAUDE.md`, `CONTRIBUTING.md`, and `.github/copilot-instructions.md`.

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

### 4.1 Import path standards

- Use path aliases, not deep relative imports.
- App code: prefer `@/...`.
- Workspace packages: prefer `@workspace/...`.

### 4.2 Global styles standard

- All web apps share global styles from `packages/ui/src/styles/globals.css`.
- Do not create app-specific global css variants that diverge from this standard.

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

- No `any`; use Zod-inferred and domain types from `packages/types`.
- Replace lingering `unknown` at boundaries with narrowing: Zod `safeParse`, custom type guards, or explicit discriminated unions—not permanent `unknown`-typed values flowing through the app.
- Do not use type escape hatches (`as any`, unchecked casts to widen types, double assertions) except where the platform truly lacks types; then isolate in a single guarded helper with a one-line rationale.
- Avoid `@ts-expect-error`, `@ts-ignore`, and broad `eslint-disable` comments—fix the root cause (types, dependency arrays, or API shape). Only suppress with a narrow scope and a one-line rationale when the ecosystem leaves no alternative.
- At external boundaries (webhooks, third-party JSON), parse with Zod or narrow `unknown` immediately; do not leave unconstrained `Record<string, unknown>` where a schema exists.
- Remove dead code and commented-out blocks.
- No emojis in code, comments, or commit messages.
- Prefer small cohesive functions and descriptive naming.

### 7.4 Unused dependencies and exports (Knip)

- Run `pnpm knip` for consolidated or workspace-wide changes and treat failures like lint: fix unused exports and dependencies or adjust `knip.json` only when the pattern is intentional.
- In CI, Knip runs in the Repository Standards job only when the diff touches dependency manifests, `knip.json`, `turbo.json`, or paths under `apps/`, `packages/`, or `scripts/` (see `isKnipChange` in [`scripts/detect-workflow-scope.mjs`](scripts/detect-workflow-scope.mjs)). Workflow-only edits skip Knip to conserve minutes per section 11.2.

## 8) UX and Design Rules (Project-Wide)

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
- Remove stray `*.log` and scratch `*.txt` files from the working tree; do not commit them. Legitimate text fixtures belong next to tests with clear naming.
- Avoid temporary/untracked project junk unless explicitly required.
- Run `pnpm check:hygiene` and `pnpm verify:standard` when needed.
- Periodically remove unused modules, duplicate implementations, and orphaned assets; prefer consolidation into shared packages when the behavior is cross-cutting.

## 11.1) Deployment workflow scope

- Do not deploy every app on every push to `main`.
- Production deployment workflows must use path-based filtering so only the deployable apps affected by the change are released.
- The production deploy workflow currently targets the API and the worker independently; keep those deploy paths and jobs scoped separately.
- Include relevant shared packages, lockfiles, build scripts, and infra manifests in those path filters so dependent apps still deploy when their runtime inputs change.
- When a new package becomes a runtime dependency of `apps/api` or `apps/worker`, update both [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) `on.push.paths` and the deploy detection logic in [`scripts/detect-workflow-scope.mjs`](scripts/detect-workflow-scope.mjs) so migrations and Fly deploys still trigger when appropriate.
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

### 12.1 SOLID (pragmatic)

- **S**ingle responsibility: one module owns one reason to change.
- **O**pen/closed: extend behavior via new types/strategies rather than editing core switches when feasible.
- **L**iskov: substitutable implementations honor the same contracts (especially repository and client interfaces).
- **I**nterface segregation: small, focused ports instead of fat god-interfaces.
- **D**ependency inversion: depend on abstractions (repositories, queues, clocks) injected at the edge.

### 12.2 KISS and DRY

- Prefer the simplest design that meets requirements and tests; avoid speculative abstraction.
- DRY shared validation and transport shapes via Zod in `packages/types`, not via copy-pasted DTO classes.

### 12.3 Common patterns

- **Repository** for persistence and Prisma mapping.
- **Factory/builder** for complex aggregates or seeded test data where it reduces duplication safely.
- **Application services** orchestrate use cases; domain objects encode invariants where the codebase already uses them.

### 12.4 Performance expectations

- **Frontend**: code-split heavy routes; lazy-load rare panels where patterns already exist; right-size React Query `staleTime`/`gcTime`; avoid rerenders from unstable callbacks and oversized context; prefer shared UI primitives to reduce bundle duplication; run `pnpm perf:budget:warn` / `pnpm perf:budget:enforce` when changing bundles.
- **Backend**: bound query cost per request (pagination, selective fields); avoid synchronous fan-out; cache only with explicit TTL and invalidation strategy where already introduced; measure hot paths before micro-optimizing.

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
- Changed behavior is covered by appropriate tests/checks; E2E routes and selectors updated when flows move.
- When your change is Knip-relevant per the CI scope detector, `pnpm knip` passes locally and the Knip step runs in CI; otherwise run Knip locally before merging if you touched dependencies or exports.
- `pnpm lint`, targeted `check-types`, tests, and Knip (when applicable) pass before push.
- Relevant local tests/builds were run and passed before the final push.
- If CI was red, the corresponding local workflow commands were run and passed before the final push.
