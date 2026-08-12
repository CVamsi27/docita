# @workspace/auth

Framework-agnostic access and session semantics shared by the API and the frontend apps.

## Contents

- `src/session-semantics.ts` — canonical CSRF cookie/header names and token TTL constants. Import these instead of ad-hoc strings (enforced in AGENTS.md §7.3).
- Tests live in `src/session-semantics.test.ts` (co-located, Vitest).

## Rules

- This package stays framework-agnostic: no NestJS, React, or Next.js imports.
- New session/auth constants that must agree across API and browser belong here, not in app-local files.
