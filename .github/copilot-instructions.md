# Copilot Instructions (Project-Specific)

Apply these rules when generating or editing code in this repository.

## 0) Authoritative Sources

- Engineering rules (typing, security, hygiene, SOLID/KISS/DRY/patterns, final checklist): [`AGENTS.md`](../AGENTS.md), especially §3 (architecture), §7 (hygiene), §12 (design principles), §14 (final checklist).
- UI/UX rules for `apps/app`, `apps/internal`, `apps/landing`: [`docs/ui/UI_UX_STANDARD_2026.md`](../docs/ui/UI_UX_STANDARD_2026.md). It supersedes [`docs/ui/DESIGN_SYSTEM.md`](../docs/ui/DESIGN_SYSTEM.md) and [`docs/ui/UI_UX_CONTRACT.md`](../docs/ui/UI_UX_CONTRACT.md) where they conflict.
- SOLID, KISS, and DRY are mandatory; do not invent abstractions without a current consumer, and do not duplicate Zod schemas, API clients, UI primitives, or tokens.

## 1) Architecture First

- Follow existing feature/module structure.
- Prefer extending existing patterns over inventing new ones.
- Keep files cohesive; avoid mixing UI, data access, and business logic.

## 2) Frontend Rules

- Use shared UI from `@workspace/ui` whenever possible. Required primitives for new pages: `AppPageScaffold`, `PageHeader`, `DataState`, `PageTabs`, `MicroLabel`, `WizardDialog`, `RightRailCardStack`, `PromptInput`, `CategoryAvatar`, `ProgressGauge`, `EmptyState`, `ErrorState`, `LoadingState`. Do not introduce app-local duplicates.
- Sidebar IA: TRACK / SERVICES sections, Settings / Help / Theme / Plan footer, Ask AI pinned at the bottom; command palette stays in lockstep with the sidebar (see [`docs/ui/UI_UX_STANDARD_2026.md`](../docs/ui/UI_UX_STANDARD_2026.md) §1).
- AI surfaces follow the contract in [`docs/ui/UI_UX_STANDARD_2026.md`](../docs/ui/UI_UX_STANDARD_2026.md) §4 (`AskAiButton`, `AskAiOverlay`, scope chip, "AI suggestions are not medical advice" footer).
- Motion: no `animate-pulse` on chrome, no skeleton `animation="wave"`, no decorative `animate-in fade-in slide-in-from-bottom-*`, no `transition-all`. Only `animate-spin` for loading and `transition-colors duration-150` for hover/focus.
- Use React Query for server data.
- Use `router.push` / `Link` for internal navigation.
- Use React Hook Form + Zod for forms; floating-label `Input` variant by default.
- Always cover loading/error/empty states via `DataState` at page level.
- Keep components accessible and keyboard-friendly.

## 3) Backend Rules

- Keep controllers thin and services focused.
- Preserve role-based and tenant-aware constraints.
- Validate inputs and sanitize outputs.
- Avoid introducing plaintext PHI logs.

## 4) Safety Rules

- Do not hardcode credentials, tokens, or secrets.
- Do not weaken auth/tenant/security middleware.
- Do not remove audit logging for sensitive operations.

## 5) Code Quality Rules

- No new `any` unless justified and constrained.
- Avoid dead code and commented-out blocks.
- Prefer descriptive names and small functions.
- Reuse utilities rather than duplicating logic.

## 6) Testing Rules

- Add/adjust tests for changed behavior.
- Prefer focused tests nearest the changed code.
- For user flows, update E2E when applicable.
- API guard specs: stub `Reflector#getAllAndOverride` via `@/test-utils` keyed helpers (`docs/testing/TESTING.md`, Backend unit tests).

## 7) Documentation Rules

- Update docs when behavior/architecture changes.
- Keep runbooks and checklists consistent with actual code.

## 8) PR Readiness

Before finalizing, ensure:

- lint/typecheck/tests are green,
- `pnpm knip` passes when your change affects dependencies or exports; CI runs Knip only for Knip-relevant paths (see `AGENTS.md` sections 7.4 and 10),
- no debug artifacts are added,
- user-impact and rollout risk are clearly described.

Authoritative agent rules live in `AGENTS.md` (typing, comments, Knip, verification).
