# Standard Turborepo Folder Structure

This is a recommended, production-grade structure for a Turborepo using:

- Next.js (frontend apps)
- NestJS (backend API)
- Prisma
- PostgreSQL
- TypeScript

Use this as the baseline across all modules to keep architecture consistent and scalable.

## 1) Root Workspace Layout

.
├── apps/
│   ├── app/                      # Next.js main product app
│   ├── admin/                    # Next.js admin app (optional)
│   ├── landing/                  # Next.js marketing site (optional)
│   └── api/                      # NestJS API
├── packages/
│   ├── ui/                       # Shared React UI components
│   ├── types/                    # Shared TS types and schemas
│   ├── auth/                     # Shared auth client/server helpers
│   ├── data-access/              # API clients, query keys, fetch wrappers
│   ├── db/                       # Prisma schema + generated client + DB utils
│   ├── config/                   # Shared eslint/tsconfig/tailwind/jest configs
│   └── utils/                    # Shared pure utilities
├── prisma/                       # Optional central prisma if not using packages/db
├── scripts/                      # Workspace scripts and automation
├── docs/                         # Architecture and operational docs
├── .github/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.json

## 2) Next.js App Structure (apps/app, apps/admin, apps/landing)

apps/app/
├── app/                          # App Router routes and layouts
├── features/                     # Feature-first UI/business modules
│   ├── patients/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── utils/
│   │   └── index.ts
│   └── ...
├── components/                   # Shared app-only presentational components
├── hooks/                        # Cross-feature app hooks
├── lib/                          # App runtime setup (api client, auth, config)
├── providers/                    # React context providers
├── styles/
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json

Guideline:

- Keep domain logic in features, not in app route files.
- Keep route files thin and orchestration-focused.

## 3) NestJS API Structure (apps/api)

apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── config/                   # Environment/config modules
│   ├── common/                   # Shared backend concerns
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── pipes/
│   │   ├── middleware/
│   │   ├── exceptions/
│   │   └── utils/
│   ├── modules/                  # Feature modules (DDD-lite recommended)
│   │   ├── patients/
│   │   │   ├── presentation/     # controllers/dto
│   │   │   ├── application/      # use-cases/services
│   │   │   ├── domain/           # entities/value objects
│   │   │   ├── infrastructure/   # repositories/prisma adapters
│   │   │   └── patients.module.ts
│   │   └── ...
│   └── health/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── prisma/                       # Optional local prisma files if not in packages/db
└── package.json

Guideline:

- Controllers thin, services/use-cases focused.
- Keep Prisma calls in infrastructure/repository layers.
- Keep shared cross-cutting code in common only.

## 4) Prisma and Postgres Placement

Preferred monorepo approach:

- Place Prisma schema and migrations in packages/db.
- Generate Prisma client from packages/db and consume from apps/api.

packages/db/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── client.ts                 # PrismaClient singleton/factory
│   ├── extensions/
│   ├── seed/
│   └── index.ts
├── package.json
└── tsconfig.json

Guideline:

- Keep all database schema evolution in one place.
- Avoid duplicated Prisma schemas in multiple apps.

## 5) Shared Packages Standards

packages/ui/

- Pure UI components only.
- No app-specific business logic.

packages/types/

- Shared contracts, zod schemas, DTO-compatible types.
- Keep request/response types stable and versionable.

packages/data-access/

- Centralized HTTP clients, React Query key factories, mutation/query helpers.
- Avoid direct fetch logic spread across apps.

packages/config/

- Shared lint/build/test config packages.
- Ensure every app extends from these defaults.

## 6) Naming and Boundaries

- Use feature folders by business capability, not by technical layer only.
- Keep file names explicit:
  - something.controller.ts
  - something.service.ts
  - something.repository.ts
  - something.schema.ts
  - something.dto.ts
- Enforce module boundaries:
  - apps can import from packages
  - packages should not import from apps

## 7) Minimal Turborepo Pipeline Targets

Recommended tasks per package/app:

- build
- dev
- lint
- typecheck
- test

Recommended top-level flow:

- lint and typecheck in CI for all packages/apps.
- test targeted first, then full test matrix.
- build only affected packages/apps in PR checks where possible.

## 8) Migration Plan for Existing Repos

When adopting this structure in an existing codebase:

1. Freeze architecture changes and create a branch for restructuring.
2. Standardize one app and one module first as reference.
3. Move shared code into packages progressively.
4. Convert imports in batches with typecheck/build after each batch.
5. Add boundary lint rules to prevent regressions.

## 9) Suggested Target Mapping for This Repository

- Keep apps/app, apps/admin, apps/landing as Next.js apps.
- Keep apps/api as NestJS app.
- Keep packages/db as single source of Prisma schema and DB client.
- Keep packages/ui, packages/types, packages/data-access as the shared contract/UI/data layer.
- Continue moving cross-app utilities from apps into packages/utils or packages/data-access.

This gives a clean separation:

- apps = deployable products
- packages = shared building blocks
- db = schema and persistence foundation

## 10) Baseline Enforced in This Repo

The following baseline structure has been created to standardize app layout:

- apps/app/tests/{unit,integration,e2e}
- apps/admin/tests/{unit,integration,e2e}
- apps/landing/{features,lib,providers,hooks}
- apps/landing/tests/{unit,integration,e2e}
- apps/api/test/{unit,integration,e2e}

The following baseline structure has also been created for shared runtime packages:

- packages/auth/{src,tests/unit,tests/integration}
- packages/data-access/{src,tests/unit,tests/integration}
- packages/db/{src,tests/unit,tests/integration}
- packages/hooks/{src,tests/unit,tests/integration}
- packages/types/{src,tests/unit,tests/integration}
- packages/ui/{src,tests/unit,tests/integration}
- packages/utils/{src,tests/unit,tests/integration}

Runtime package entrypoint convention:

- Each runtime package must expose `src/index.ts` as the package root contract.
- Consumers should prefer importing from package root first, then documented subpath exports.

Use this command to verify required structure paths:

- pnpm verify:structure

Use this command to verify package entrypoint/export contracts:

- pnpm verify:contracts

Use this command to run full standard verification:

- pnpm verify:standard

The verifier lives at:

- scripts/verify-turborepo-structure.mjs
- scripts/verify-package-contracts.mjs
