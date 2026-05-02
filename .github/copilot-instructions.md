# Copilot Instructions (Project-Specific)

Apply these rules when generating or editing code in this repository.

## 1) Architecture First

- Follow existing feature/module structure.
- Prefer extending existing patterns over inventing new ones.
- Keep files cohesive; avoid mixing UI, data access, and business logic.

## 2) Frontend Rules

- Use shared UI from `@workspace/ui` whenever possible.
- Use React Query for server data.
- Use `router.push` / `Link` for internal navigation.
- Use React Hook Form + Zod for forms.
- Always cover loading/error/empty states.
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
- API guard specs: stub `Reflector#getAllAndOverride` via `@/test-utils` keyed helpers (`docs/TESTING.md`, Backend unit tests).

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
