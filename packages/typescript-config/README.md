# @workspace/typescript-config

Shared TypeScript compiler presets consumed via `extends`.

## Presets

| File | Consumers |
|---|---|
| `base.json` | `packages/{auth,data-access,hooks,utils,ui}` |
| `nestjs.json` | `apps/api`, `apps/worker` |
| `react-library.json` | Vite app/package tsconfigs |

## Rules

- Config-only package: no runtime source, no dependencies.
- `check-types` validates that every preset parses as JSON (the package has no TS sources to type-check).
- The Next.js preset (`nextjs.json`) and its `next` devDependency were removed with the Next → Vite migration (2026-07-31).
