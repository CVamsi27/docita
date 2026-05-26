# @workspace/utils

Framework-agnostic TypeScript helpers.

**Rule:** no React imports allowed — no JSX, no hooks, no `react` imports anywhere in this package.

## Boundaries

- No React, Next.js, browser-only globals, or app-local imports.
- Prefer pure functions with focused tests.
- Formatting helpers for dates, currency, and clinical calculations live here when they are reused across features or apps.

Future i18n should enter through a dedicated package rather than scattering localization helpers here.

## Exports

| Module / folder | What it exports |
|---|---|
| `src/date/` | Date formatting, parsing, comparison, timezone helpers, ISO date utils, schedule time utils, clinic scheduling wall |
| `src/medical/` | Allergy validation, contraindication checker, dosage validation, medication safety, vital validation, vital status, medical calculations, temperature conversions, chief-complaint persistence |
| `src/config/` | Config schema, config options, config types, facility label helpers |
| `src/constants/` | Dental constants, document constants |
| `src/ui/` | Severity styles (pure CSS-class helpers, no React) |
| `src/security.ts` | Sanitisation helpers |
| `src/country.ts` | Country list and helpers |
| `src/currency.ts` | Currency formatting |
| `src/locale-numbers.ts` | Locale-aware number formatting |
| `src/imports.ts` | Shared import helpers |

All exports are re-exported from `src/index.ts`.

## What does NOT belong here

- React hooks (use `@workspace/hooks`)
- UI components (use `@workspace/ui`)
- API-call logic (use `@workspace/data-access`)
- Permission/tier checks (use `@workspace/auth` or `@workspace/types/access`)
