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

- Do not leave stale TODO/FIXME comments.
- If a comment describes missing work and you are implementing that area, implement and remove the stale comment.
- Keep comments only when they explain non-obvious intent/constraints.

### 7.3 General code hygiene

- No new `any` unless explicitly justified and constrained.
- Remove dead code and commented-out blocks.
- No emojis in code, comments, or commit messages.
- Prefer small cohesive functions and descriptive naming.

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
- Minimum pre-merge checks for touched areas:
  - `pnpm lint`
  - relevant typecheck (`pnpm --filter @docita/app run check-types` / API equivalents)
  - relevant tests
  - build checks where change impact is broad
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
- Include relevant shared packages, lockfiles, build scripts, and infra manifests in those path filters so dependent apps still deploy when their runtime inputs change.
- Fly.io API deployments must be driven by [`fly.toml`](/Users/vamsikrishnachandaluri/repos/docita/fly.toml), including the resolved app name and config path, instead of duplicating those values elsewhere in CI.
- Staging API deployments use the Render deploy hook from `.github/workflows/deploy-staging.yml` and should be gated so Prisma migrations land before the new API revision is released.
- Cloudflare frontend deployments are not handled by GitHub Actions in this repository; manage their auto-deploy behavior through Cloudflare watch-path settings instead.

## 11.2) CI scope and cost

- Keep pull request workflows focused on the minimum checks required to block unsafe merges.
- Path-filter expensive workflows so unrelated app or docs changes do not consume full CI minutes.
- Frontend CI jobs should be scoped by app so `app`, `internal`, and `landing` run independently based on the files that changed.
- Prefer running full-repo build, coverage, critical E2E, bundle analysis, and other heavyweight jobs on pushes to `main`.
- Keep dependency audits scoped to dependency-manifest changes unless there is a specific reason to run them more broadly.

## 11.3) Branch Promotion Flow

- Use `staging` as the integration branch for pre-production validation.
- Open feature PRs into `staging` first.
- After staging checks pass, open a promotion PR from `staging` into `main`.
- Keep `main` protected and production-only; do not merge feature work directly into `main`.
- If a hotfix lands on `main`, merge `main` back into `staging` before the next release cycle so both branches stay aligned.

## 12) Design Principles

- Apply SOLID and clean layering pragmatically:
  - Single responsibility for modules/classes.
  - Dependency injection over direct instantiation.
  - Open/closed design for extensible workflows.
  - Interface segregation for focused contracts.
- Prefer repository and factory patterns for persistence and complex object creation flows.

## 13) Commands Reference

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm check:hygiene
pnpm verify:standard
pnpm check:prisma-boundary
pnpm db:generate
pnpm db:migrate
```

## 14) Agent Final Checklist

Before finalizing changes:

- Architecture/layer boundaries are respected.
- No security or tenant/auth guard regressions.
- No PHI plaintext logging or secret leakage.
- No console logging, emoji noise, or dead code.
- Imports use aliases (`@/...` and `@workspace/...`) instead of deep relative paths.
- TODO/FIXME-style comments are resolved or removed from touched areas.
- Typographic hierarchy is preserved (headings > body > sub-points).
- Changed behavior is covered by appropriate tests/checks.
- Relevant local tests/builds were run and passed before the final push.
- If CI was red, the corresponding local workflow commands were run and passed before the final push.
