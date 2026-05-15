# Docita App

Next.js main clinical application.

## Feature Pattern

- Route files under `app/` compose feature components and stay thin.
- Feature code lives under `features/<feature>`.
- Server state comes from `packages/data-access` hooks or approved API wrappers.
- Shared UI primitives come from `@workspace/ui`.
- Loading, error, and empty page states use `DataState` patterns.

The Cloudflare deployment path intentionally keeps `middleware.ts`; Next.js may warn about the newer proxy convention.
