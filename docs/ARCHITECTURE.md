# Architecture

Docita is a Turborepo monorepo for a healthcare product handling PHI.

```mermaid
flowchart LR
  app["apps/app\nNext.js clinic app"] --> data["packages/data-access"]
  internal["apps/internal\nNext.js internal app"] --> data
  landing["apps/landing\nAstro marketing"] --> ui["packages/ui"]
  data --> types["packages/types\nZod contracts"]
  app --> ui
  internal --> ui
  api["apps/api\nNestJS API"] --> types
  api --> db["packages/db\nPrisma/Postgres"]
  worker["apps/worker\nbackground jobs"] --> db
  api --> redis["Redis/BullMQ"]
  worker --> redis
  api --> r2["R2 uploads"]
  api --> payments["Stripe/Razorpay"]
  api --> whatsapp["WhatsApp Business API"]
  api --> sentry["Sentry"]
```

## Boundaries

- `packages/types` owns Zod request/response contracts.
- `packages/data-access` owns API clients, query keys, response parsing, and React Query hooks.
- `packages/ui` owns presentational primitives only.
- `packages/db` owns Prisma schema, generated client, and DB scripts.
- API controllers stay thin; services/use-cases own orchestration; repositories own persistence.
- Frontend route files compose feature shells; feature hooks/components own app behavior.
