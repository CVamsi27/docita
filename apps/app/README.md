# Docita App

Next.js main clinical application (Cloudflare-deployed via OpenNext).

## Feature catalogue

`_shared`, `ai-assistant`, `analytics`, `appointments`, `auth`, `consultation`, `dashboard`, `desk`, `dialogs`, `documents`, `excel`, `feedback`, `follow-ups`, `help`, `import`, `inbox`, `inventory`, `invoices`, `ipd`, `lab-tests`, `legal`, `medical-coding`, `medical-documents`, `mobile-upload`, `ocr`, `onboarding`, `patient-portal`, `patients`, `prescriptions`, `public-booking`, `search`, `settings`, `subscription`

All features follow the layout: `features/<feature>/{components,hooks,rules,lib,types,index.ts}`. Public imports go through `index.ts`.

## AppPageScaffold pattern

The standard page wrapper. Route files stay thin; compose in feature UI components.

```tsx
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";

export function PatientsPageUI({ ... }) {
  return (
    <AppPageScaffold header={<PageHeader title="Patients" ... />} density="default">
      {/* sections */}
    </AppPageScaffold>
  );
}
```

Reference: `apps/app/features/patients/components/list/PatientsPageUI.tsx`.

## When to add to @workspace/ui vs apps/app/features/_shared

| Add to `@workspace/ui` | Add to `apps/app/features/_shared` |
|---|---|
| Stable primitive used in 2+ apps or packages | App-only component used in 2+ features |
| No data fetching, no domain knowledge | May import app hooks or domain types |
| Pure presentational | Specific to the main app UX |

## Feature pattern

- Route files under `app/` compose feature shells — no business logic.
- Feature code lives under `features/<feature>`.
- Server state comes from `@workspace/data-access` hooks or approved API wrappers (`apps/app/hooks/api/`).
- Shared UI primitives come from `@workspace/ui`.
- Loading, error, and empty page states use `DataState` patterns.
- Inline `fetch` in client features is blocked by `scripts/check-frontend-fetch.mjs`.

The Cloudflare deployment path intentionally keeps `middleware.ts`; Next.js may warn about the newer proxy convention.
