# Developer Guide

This is the source of truth for how we build and maintain Docita.

## 1) Engineering Principles

- Prefer simple, explicit, maintainable code over clever code.
- Keep UI clean, modern, and consistent across all apps.
- Business logic belongs in domain/rules layers, not inside UI components.
- Optimize for safety and correctness first (healthcare context), then speed.
- Keep diffs focused; avoid unrelated refactors in feature PRs.

## 2) Monorepo Conventions

- Apps live in `apps/*`.
- Shared packages live in `packages/*`.
- Reusable UI belongs in `@workspace/ui`.
- Shared types + schemas belong in `@workspace/types`.
- Shared utilities belong in `@workspace/utils`.
- New functionality should be added to a feature module first, then extracted if reused.

## 3) Frontend Architecture

## 3.1 Feature Structure

Use this structure for each feature:

```text
features/<feature>/
  api/
  hooks/
  components/
  rules/
  types/
  index.ts
```

## 3.2 Container + UI Split

- `*Container.tsx`: data fetching, orchestration, mutations, permissions.
- `*UI.tsx`: presentational only, receives props.

Do not place data fetching directly in route components when a feature module exists.

## 3.3 State Management

- Server state: React Query.
- Shared client state: Zustand.
- Cross-cutting app state: Context (auth/theme/clinic).
- Local component state: `useState` only for UI-local concerns.

## 3.4 Forms

- Use React Hook Form + Zod.
- Define schema once, infer TS types from schema.
- Show validation near fields and summary on submit failures.

## 3.5 Navigation

- Use Next.js `Link` and `router.push`.
- Do not use `window.location.href` for internal routes.

## 4) UI/UX System

## 4.1 Styling Rules

- Use semantic Tailwind tokens only (`bg-background`, `text-foreground`, etc.).
- Avoid hardcoded color utility families unless tokenized through design decisions.
- Validate all new screens in dark mode.

## 4.2 Consistency Rules

- Keep spacing rhythm consistent (`p-4 md:p-6`, `space-y-*`).
- Prefer shared primitives from `@workspace/ui`.
- Standardize empty, loading, and error states using shared components.

## 4.3 Accessibility Rules

- Keyboard-navigable interactions only.
- Proper labels/aria for form and table controls.
- Use semantic HTML and focus-visible states.
- Accessibility audit must pass for changed routes.

## 5) Backend Architecture

- Controllers: transport only (validation + delegation).
- Services: business logic.
- Data layer: Prisma/repositories.
- Guards/interceptors: auth, tenancy, auditing, security concerns.

Every new endpoint must have:
- explicit auth posture (`@Public()` or `@Roles(...)`),
- input validation,
- documented response shape,
- error handling that avoids leaking internals.

## 6) Data, Security, and Compliance

- Treat all patient data as sensitive.
- Never log PHI in plaintext.
- Keep tenancy boundaries explicit and tested.
- Use least-privilege access patterns.
- Secrets must come from environment variables only.

## 7) Testing Requirements

- Add tests for new behavior (unit or integration minimum).
- Critical user workflows need E2E coverage.
- Bug fixes require regression tests where practical.
- Keep tests deterministic and isolated.

## 8) Performance Rules

- Avoid unnecessary client components.
- Prefer SSG/ISR for marketing/static content.
- Paginate large datasets.
- Cache reference/read-heavy data where safe.

## 9) Pull Request Standards

A PR is ready when:
- Scope is focused and documented.
- Lint/typecheck/tests pass.
- UX states covered (loading/error/empty).
- Accessibility considered.
- Security implications reviewed.

Use `.github/PULL_REQUEST_TEMPLATE.md`.

## 10) Release Hygiene

Before release:
- Remove temp files, test artifacts, debug output.
- Verify production env values and health checks.
- Confirm runbooks/contact lists are current.

## 11) What Not To Do

- Don’t bypass shared packages for duplicate utilities/components.
- Don’t add dead/commented-out code blocks.
- Don’t suppress errors without explanation.
- Don’t ship debug logs to production paths.
