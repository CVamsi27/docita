# Data-Access Migration Plan

Status: **Phases 1–4 executed (2026-05-18); 6 hooks deferred to follow-up.**

## What was done

- `packages/data-access` is now React-aware (peer deps for `react` + `@tanstack/react-query`, `jsx: react-jsx`).
- `DataAccessProvider` + `useDataAccessContext()` + `useDataAccessFetcher()` shipped (`src/provider/`).
- Core hooks live in `src/core/`: `useAPIQuery`, `useAPIQueryValidated`, `useAPIMutation`, plus `stale-time.ts` policy table.
- `query-string` utility moved into the package (`src/lib/query-string.ts`).
- `apps/app/providers/data-access-bridge.tsx` mounts the provider inside `ReactQueryProvider`. Config supplies `fetcher` (= `fetchAPI`), `getClinicId`, `getClinicTimezone`, `isTierFeatureEnabled`.
- `apps/app/shared/lib/api/api-core.ts` is now a thin shim: it re-exports `useAPIQuery` / `useAPIMutation` / `useAPIQueryValidated` typed to the app's `ApiError`, keeping legacy call sites green.
- 19 per-domain hooks moved into `packages/data-access/src/hooks/`: `use-analytics`, `use-appointments`, `use-billing-history`, `use-common`, `use-contact`, `use-dashboard`, `use-feature-flags`, `use-import`, `use-inventory`, `use-leaves`, `use-medical-coding`, `use-notifications`, `use-patient-portal`, `use-patient-timeline`, `use-patients`, `use-public-booking`, `use-settings`, `use-signature-upload`, `use-whatsapp`. ~162 consumer imports rewritten to `@workspace/data-access`.
- 3 dead hook files purged on the way: `use-ai`, `use-feedback`, `use-referrals` (15 unused exports).
- Two non-hook files relocated: `tier-feature-guards.ts` → `apps/app/shared/lib/access-control/use-tier-feature-enabled.ts`; `medication-validation-api.ts` → `apps/app/shared/lib/api/medication-validation.ts`.
- `whatsapp` variants of notification hooks renamed to avoid barrel ambiguity (`useWhatsappUnreadNotificationCount`, `useWhatsappDeleteNotification`, `useWhatsappDeleteAllNotifications`).
- `uploadSignature` / `validateToken` imperative helpers moved to `apps/app/shared/lib/api/signature-helpers.ts` (they need session-aware fetch outside React).
- Full `pnpm turbo check-types --force` green (17/17).

## What was deferred

Six hooks still in `apps/app/shared/hooks/api/` because they bypass the provider abstraction — they call `fetch-with-session` / `api-client` directly or reach into app-internal helpers (`auth-context`, `locale-currency`, `sonner`, `logger`, `features/patients/api`). Migrating them properly needs a per-hook refactor, not a relocation:

- `use-billing.ts` — calls `fetchWithSession` + `fetchAPI` + checks `instanceof ApiError`
- `use-clinical.ts` — uses `api-client.get/post` directly + checks `ApiError`
- `use-billing-history.ts` is already migrated; `use-resume-subscription-payment.ts`, `use-schedule-plan-change.ts` use `fetchWithSession`
- `use-pricing.ts` — depends on `auth-context`, `locale-currency` hook, `fetchWithSession`
- `use-patient-history.ts` — reaches into `features/patients/api/patients.api`, uses `sonner` toasts, `logger`

To complete the follow-up: rewrite each to use only `useAPIQuery` / `useAPIMutation` / `useAPIQueryValidated` (with the provider fetcher), drop direct `fetch-with-session` calls, and extract side effects (toast/logger) into composed app-level hooks if necessary. The `apps/app/shared/hooks/api/` folder can then be deleted.

## Original design (reference)

## Problem

`apps/app/shared/hooks/api/` holds 30 per-domain React Query hook files (`use-appointments.ts`, `use-patients.ts`, `use-billing.ts`, etc.). They are app-scoped today, which means:

- `apps/internal` cannot reuse them.
- They violate AGENTS.md §15.2 ("Data fetching: feature code consumes `packages/data-access` hooks").
- The wrapped HTTP client (`apps/app/shared/lib/api/api-core.ts`) and these hooks form a single data-access layer that should be a shared package.

Two non-hook files in `shared/hooks/api/` also break the `use-*` naming convention:
- `medication-validation-api.ts`
- `tier-feature-guards.ts`

## Target architecture

```
packages/data-access/
├── src/
│   ├── lib/                          (existing) types, errors, client-factory, query-keys, idempotency, ...
│   ├── provider/
│   │   ├── context.ts                React context: { fetcher, getClinicId, isTierFeatureEnabled }
│   │   ├── data-access-provider.tsx  <DataAccessProvider> wrapper component
│   │   └── hooks.ts                  internal useDataAccessContext()
│   ├── core/
│   │   ├── use-api-query.ts          extracted from apps/app/shared/lib/api/api-core.ts
│   │   ├── use-api-mutation.ts
│   │   └── use-api-query-validated.ts
│   ├── hooks/
│   │   ├── use-appointments.ts       moved from apps/app/shared/hooks/api/
│   │   ├── use-patients.ts
│   │   ├── ... (30 hooks total)
│   └── index.ts                      barrel
└── package.json                       must add react + @tanstack/react-query peer deps
```

## Contract

```ts
export interface DataAccessConfig {
  fetcher: (path: string, init?: RequestInit) => Promise<unknown>;
  getClinicId: () => string | undefined;
  isTierFeatureEnabled: (feature: string) => boolean;
}

export function DataAccessProvider(props: {
  config: DataAccessConfig;
  children: ReactNode;
}): JSX.Element;

// internal — every hook calls this to reach the injected app glue
function useDataAccessContext(): DataAccessConfig;
```

## App wiring (`apps/app/providers/`)

```tsx
<DataAccessProvider config={{
  fetcher: apiFetch,                                 // from apps/app/shared/lib/api/api-client
  getClinicId: () => useClinic().id,                 // from apps/app/shared/lib/contexts/clinic-context
  isTierFeatureEnabled: useTierFeatureEnabled,       // from apps/app/shared/hooks/api/tier-feature-guards
}}>
```

`apps/internal` will later add its own provider with its own session glue.

## What stays in app

- `apps/app/shared/lib/api/api-client.ts` (session-aware fetch — the thing the provider injects)
- `apps/app/shared/lib/api/api-config.ts`, `api-error.ts`, `network-error.ts`, `optimistic-updates.ts` (app-level config / error model)
- `apps/app/shared/lib/contexts/clinic-context.tsx` (React provider for clinic state)
- Renamed: `tier-feature-guards.ts` → `apps/app/shared/lib/access-control/`
- Renamed: `medication-validation-api.ts` → `apps/app/shared/lib/api/`

## What moves to packages/data-access

- All 30 `apps/app/shared/hooks/api/use-*.ts` files
- The React Query wrappers (`useAPIQuery`, `useAPIMutation`, `useAPIQueryValidated`) currently in `apps/app/shared/lib/api/api-core.ts`
- Any inline Zod schemas defined in the hooks (they travel with the hook file)

## Phasing

Each phase ends with `pnpm turbo check-types --continue --force` green before moving on.

### Phase 1 — Make `packages/data-access` React-aware
1. Update `packages/data-access/package.json`: add `react`, `react-dom`, `@tanstack/react-query` as peer deps; matching versions added to `devDependencies` for typecheck.
2. Update `packages/data-access/tsconfig.json`: set `jsx: "react-jsx"`, include `.tsx`.
3. Run `pnpm install`.
4. Build provider + context + `useDataAccessContext`. No hooks yet.

### Phase 2 — Move the core
1. Extract `useAPIQuery`, `useAPIMutation`, `useAPIQueryValidated` from `apps/app/shared/lib/api/api-core.ts` into `packages/data-access/src/core/`.
2. The extracted hooks read their fetcher from `useDataAccessContext()` instead of the local `apiFetch` import.
3. Update `apps/app/shared/lib/api/api-core.ts` to re-export from `@workspace/data-access` (temporary shim — keeps existing imports working).
4. Add `<DataAccessProvider>` to `apps/app/providers/react-query-provider.tsx`.
5. Build `packages/data-access` and `pnpm turbo check-types` green.

### Phase 3 — Vertical slice
1. Move one small hook (recommended: `use-feedback.ts`) to `packages/data-access/src/hooks/`.
2. Rewrite its imports to use the data-access internal context and types instead of `@/lib/...`.
3. Update the 3-5 import sites that consume it: `@/hooks/api/use-feedback` → `@workspace/data-access`.
4. Confirm typecheck + the one test that touches it still passes.
5. **Stop and verify the pattern works end-to-end before continuing.**

### Phase 4 — Bulk migration
1. Move the remaining 29 hooks.
2. Bulk-rewrite import sites: `@/hooks/api/use-*` → `@workspace/data-access`. Use a sed pass since the rename is mechanical.
3. Delete the now-empty `apps/app/shared/hooks/api/` (after moving the 2 non-hooks files out to their proper homes).
4. Update AGENTS.md §2.1 + §15.2 to reflect the new layout.

### Phase 5 — Verify and cleanup
1. `pnpm turbo check-types --continue --force`
2. `pnpm check:prisma-boundary`
3. `pnpm check:hygiene`
4. `pnpm knip`
5. `pnpm test` across affected packages
6. Run `apps/app` dev server briefly to confirm the provider wiring works at runtime (typecheck alone won't catch missing provider mounts).

## Risks and caveats

1. **Runtime-only failures**: typecheck won't catch a missing `<DataAccessProvider>` mount. Phase 5 must include a smoke run.
2. **Tests that use `apps/app/vitest.config.ts` alias** to `@workspace/data-access` → `packages/data-access/src` will work; tests that rely on the built `dist/` need a rebuild.
3. **React version alignment**: `packages/data-access` should declare React as a peer dep (not a regular dep) to avoid two copies of React.
4. **Some hooks read `useClinic()` directly** in the function body. These need to switch to `useDataAccessContext().getClinicId()`. A handful of judgment calls per hook.
5. **`apps/internal` follow-up**: once the move is done, `apps/internal` can add its own `<DataAccessProvider>`. That's a separate task, not part of this migration.

## Estimated effort

6–10 hours of focused work, ~150 import-site rewrites, 30+ file moves, 1 new provider, 3 new core hook files. Best done as a dedicated session (not a sweep).

## How to resume

Open a new Claude Code session and say:

> Continue the data-access migration described in `docs/architecture/DATA_ACCESS_MIGRATION_PLAN.md`. Start with Phase 1.

The agent should read this file first, confirm the approach is still desired, then proceed phase by phase, running typecheck after each.
