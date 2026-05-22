# Page standardization checklist (doctor app)

Use this when touching primary workflows. Goals align with [AGENTS.md](../AGENTS.md) (§8 typography hierarchy, §4 loading/error/empty) and the UI reference at `apps/app/app/(tools)/visual-test/ui-contract/page.tsx`.

## Patterns

| Pattern | When |
| ------- | ---- |
| `AppPageScaffold` | Full-width workspace pages with a single primary header |
| `PageHeader` | Title (dominant), description (body), actions (secondary) |
| `DataState` | Loading, error (with retry when applicable), empty (with primary action) |
| `PageContainer` | Acceptable alternative where scaffold is already provided by parent |

## Focus routes (audit status)

| Route | Scaffold / header | Data states | Notes |
| ----- | ----------------- | ----------- | ----- |
| `/login` | Via `AuthPageContainer` | Inline auth feedback | OK |
| `(setup)/*` onboarding | Step UIs | Per-step | Spot-check heading hierarchy |
| `/dashboard` | `AppPageScaffold` + dashboard header | `DataState` error/empty | OK |
| `/today` | `AppPageScaffold` + `PageHeader` | Loading/error/empty | Today workspace hub |
| `/appointments` | Feature-specific | Yes | Verify modal forms |
| `/patients` | `PageHeader` in `PageContainer` | Table empty/search empty | Optional **Consultation queue** header action when `canStartConsultation` |
| `/patients/[id]` | Detail layout | Tabs/skeletons | Verify tab labels vs body |
| `/consultation` / `[id]` | Workspace chrome | Draft/status | Save chip in **page header** (md+) and workspace toolbar (mobile); Save draft + autosave unchanged |
| `/settings` | Tabbed workspace | Per-tab | Subscription tab is canonical billing |
| `/upgrade` | Redirect only | N/A | Alias → `SUBSCRIPTION_SETTINGS_PATH` |
| `/billing-locked` | Centered card layout | Copy-only | Primary title is semantic `<h1>` for screen readers and smoke tests |
| `/whatsapp` | `AppPageScaffold` + `PageHeader` | `DataState` loading/error + inline alert when no patients | OK |

## Deviation process

1. Note the route and what diverges (missing retry, heading order, etc.).
2. Prefer fixing in the same PR as functional work.
3. Run `pnpm audit:app` when markup or interactive roles change materially.
