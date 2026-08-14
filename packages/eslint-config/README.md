# @workspace/eslint-config

Shared ESLint flat configs for workspace packages and apps.

## Exports

| Subpath | File | Consumers |
|---|---|---|
| `@workspace/eslint-config/base` | `base.js` | `apps/api` (via `noProcessEnvSyntaxRule`) and legacy backend packages |
| `@workspace/eslint-config/react-internal` | `react-internal.js` | `packages/ui`, `packages/hooks` (named `config` export) |

The Next.js config (`next.js` + `@next/eslint-plugin-next`) was removed with the Next → Vite migration (2026-07-31).

## Rules

- Flat config (ESLint 9) only; no `.eslintrc`.
- `check-types` runs `node --check` over the shipped config files (syntax validation).
