# Today schedule recovery implementation plan

> Execute inline using the installed executing-plans workflow. This implements the approved roadmap's Phase 3 requirement to verify actual loading/error/empty states on today's schedule before cosmetic changes.

**Goal:** An unavailable appointment schedule must render Today’s existing error/retry or session-recovery state instead of suggesting that the clinic has no appointments.

**Architecture:** `useDashboardLogic` combines failures from its two primary queries (dashboard stats and today's appointments). It exposes one primary error to both existing consumers through the existing `statsError` compatibility property. Today retains its shared `DataState` shell and session recovery. Optional recent-patient and join-request failures do not block the schedule. No new UI primitive, copy, medical policy, route, permission, API contract or database field. Browser verification also reproduced insufficient dark-mode contrast in the existing shared EmptyState link action; use the existing foreground token for both link and callback actions, retaining the primitive and interaction.

**Tech stack:** React Query/Vitest, React Router, shared DataAccessProvider and Zod contracts, Playwright, pnpm 10.30.3.

## Task 1 — Reproduce using actual query hooks

**Create:** `apps/app/src/features/dashboard/hooks/use-dashboard-logic.test.tsx`.

- [x] Render the real dashboard hook with QueryClientProvider and DataAccessProvider, a typed synthetic stats response and empty recent patients. Mock only auth/permission context; do not mock the query hooks.
- [x] Fail the appointments endpoint while stats succeeds: after loading settles, require `state.isError` and the same primary error; ensure successful empty appointments still produces a healthy empty state.
- [x] Restore appointments and invoke `refetchAll`: require successful recovery. Cover malformed appointment responses through the real Zod parser and a 401 appointment error reaching the existing session-recovery classification.
- [x] Record the failing assertions before implementation.

## Task 2 — Preserve page-state semantics

**Modify:** `apps/app/src/features/dashboard/hooks/use-dashboard-logic.ts`.

- [x] Alias stats' `isError` to `isStatsError`; read appointment `isError` / `error`. Expose `isError: isStatsError || isAppointmentsError` and `statsError: statsError ?? appointmentsError`. Preserve loading, permissions, query keys and refresh behavior.
- [x] Verify stats failures still propagate and optional query failures remain non-blocking. Session recovery consumes the selected primary error through the existing Today component.
- [x] Run the full app unit suite and app typecheck/lint/build, repository standards and Knip.

## Task 3 — Browser evidence and companion docs

**Modify:** `apps/app/e2e/today.spec.ts`, `apps/app/e2e/utils/patient-helpers.ts`, `docs/ui/UI_UX_ALL_SCREENS_AUDIT_MATRIX.md`, approved roadmap and backlog.

- [x] Add a browser regression that intercepts only today's appointments as HTTP 503 while leaving authenticated setup/stats on the fixture API. Verify the visible error and retry; restore the real endpoint, click retry and require actual loaded/empty workspace readiness.
- [x] Run affected Today/browser accessibility checks at mobile/desktop with the disposable fixture. Record any fixture or provider limitation explicitly; never count login redirects as a Today audit.
- [x] Record exact results in a dated acceptance record, clean up only owned local resources and commit through normal hooks. No push, deployment or production data writes.

## Fixture correction discovered during verification

The initial browser setup failed security verification before rendering Today. Cloudflare's current testing documentation requires `XXXX.DUMMY.TOKEN.XXXX` with its public test secret; the helper used an arbitrary token. Correct only that test helper and run the local API with the documented public test secret. Production verification remains unchanged. Source: https://developers.cloudflare.com/turnstile/troubleshooting/testing/.

The Today browser spec also used an older token-only seed without the refresh cookie required by current bootstrap. Reuse the existing `fetchUserSession` / `applyUserSession` helpers, exchanging credentials once per suite and seeding the complete real session per page. No production auth logic changes.

## Browser findings on 10 October

The error shell already rendered during the failed browser run: the shared user-facing message sanitizer removes the trailing “Please try again” and period, so assert its actual alert text and visible retry action. The mobile header helper selected a hidden desktop navigation label; assert the visible level-one heading inside main instead. The dark-mode empty-state action measured 3.89:1 against its background; repair the existing shared EmptyState action with `text-foreground` and require axe to pass on the recovered state and AI overlay in both themes. Keep HTTP 503 interception and the real successful refetch; do not substitute a login page or bypass outage handling.

Acceptance: [10 October local validation](releases/2026-10-10-today-ux-validation.md). Owned fixture cleanup is deferred until the immediately following clinician audit slice; no push or deployment.
