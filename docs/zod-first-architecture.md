# Docita — Zod-First Type Architecture

> **Holy grail of monorepo sanity**: one source of truth → validated → inferred → reused everywhere.
> Not "types copied around" — **types generated from runtime truth**.

---

## Table of Contents

1. [Core Principle](#core-principle)
2. [Why NOT Other Approaches](#why-not-other-approaches)
3. [Data Flow Architecture](#data-flow-architecture)
4. [packages/types — The Brain](#packagestypes--the-brain)
5. [Schema Splitting by Use Case](#schema-splitting-by-use-case)
6. [Backend NestJS Integration](#backend-nestjs-integration)
7. [Prisma Boundary Layer](#prisma-boundary-layer)
8. [Frontend & Data Access](#frontend--data-access)
9. [React Forms Integration](#react-forms-integration)
10. [Domain Contract Index](#domain-contract-index)
11. [Error Handling Patterns](#error-handling-patterns)
12. [Testing with Zod](#testing-with-zod)
13. [Migration Strategy](#migration-strategy)
14. [What You Gain](#what-you-gain)
15. [Package Dependencies](#package-dependencies)

---

## Core Principle

**Zod schemas are the only source of truth — not TypeScript interfaces, not Prisma models, not NestJS DTOs.**

The canonical flow:

```
Zod Schema → infer TS types → API contracts → UI forms → DB-safe DTOs
```

> ⚠️ **Never reverse this flow.** The moment you create a TypeScript interface first and then try to "match" a Zod schema to it, you've introduced drift potential.

### Why Zod Specifically?

| Feature                   | TypeScript | Zod                                          |
| ------------------------- | ---------- | -------------------------------------------- |
| Compile-time types        | ✅         | ✅ (via `z.infer`)                           |
| Runtime validation        | ❌         | ✅                                           |
| Structured error messages | ❌         | ✅                                           |
| Schema composition        | ❌         | ✅ (`.pick`, `.omit`, `.partial`, `.extend`) |
| Transform / coerce        | ❌         | ✅                                           |
| Default values            | ❌         | ✅ (`.default()`)                            |
| Works in Node + Browser   | N/A        | ✅                                           |

---

## Why NOT Other Approaches

### ❌ TypeScript Interfaces as Source

```ts
// ANTI-PATTERN — types vanish at runtime
interface Patient {
  id: string;
  name: string;
}
```

**Problems:**

- No runtime validation — API accepts any garbage that compiles
- Cannot validate incoming JSON
- Interfaces cannot enforce `min(2)`, `regex`, `int()`
- When DB returns `null` instead of `undefined`, TS won't catch it

### ❌ Prisma as Type Source

```ts
// ANTI-PATTERN — persistence leaks everywhere
import { Patient } from "@prisma/client";
```

**Problems:**

- DB column names leak into frontend (`created_at` vs `createdAt`)
- Internal columns exposed (soft-delete flags, audit fields)
- DB migration = breaking change for the entire app
- Cannot differentiate create vs update vs response shapes

### ❌ NestJS DTOs with class-validator

```ts
// ANTI-PATTERN — duplicate typing, no reuse
class CreatePatientDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @Matches(/^[0-9]{10}$/)
  phone: string;
}
```

**Problems:**

- Decorators cannot be shared with frontend
- No schema composition (`.omit()`, `.partial()`)
- Must manually keep DTO and frontend types in sync
- `class-transformer` quirks with nested objects

---

## Data Flow Architecture

```
packages/types          ← Zod schemas live here (the brain)
        ↓
apps/api                ← NestJS consumes schemas via nestjs-zod
        ↓
packages/data-access    ← Typed API client, parses responses with Zod
        ↓
apps/app                ← Next.js consumes typed client + zodResolver
        ↓
packages/db             ← Prisma = storage only, mapped to domain types
```

### Dependency Direction Rules

| Package                | Can Import From                        | CANNOT Import From             |
| ---------------------- | -------------------------------------- | ------------------------------ |
| `packages/types`       | `zod` only                             | anything else                  |
| `packages/db`          | `@prisma/client`                       | `@workspace/types` (optional)     |
| `apps/api`             | `@workspace/types`, `@workspace/db`          | `@workspace/data-access`          |
| `packages/data-access` | `@workspace/types`                        | `@workspace/db`, `@prisma/client` |
| `apps/app`             | `@workspace/types`, `@workspace/data-access` | `@workspace/db`, `@prisma/client` |

> 🚨 **Critical boundary**: `@prisma/client` must NEVER appear outside `packages/db` and `apps/api/infrastructure`.

---

## `packages/types` — The Brain

### Directory Structure

```
packages/types/
├── src/
│   ├── patient/
│   │   ├── patient.schema.ts       ← Zod schemas (all variants)
│   │   ├── patient.types.ts        ← z.infer<> only, zero manual interfaces
│   │   └── index.ts
│   ├── appointment/
│   │   ├── appointment.schema.ts
│   │   ├── appointment.types.ts
│   │   └── index.ts
│   ├── common/
│   │   ├── pagination.schema.ts
│   │   ├── id.schema.ts
│   │   └── index.ts
│   ├── contracts/
│   │   ├── patients.contract.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

### `package.json`

```json
{
  "name": "@workspace/types",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

> `packages/types` has **zero internal dependencies**. It depends only on `zod`.

### Common / Reusable Schemas

```ts
// common/id.schema.ts
import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const TimestampSchema = z.date();

export const BaseEntitySchema = z.object({
  id: UuidSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
```

```ts
// common/pagination.schema.ts
import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
    totalPages: z.number().int(),
  });
```

### Patient Domain

#### `patient.schema.ts`

```ts
import { z } from "zod";
import { BaseEntitySchema } from "../common";

// ─── Base (DB / domain canonical shape) ───────────────────────────────────────
export const PatientSchema = BaseEntitySchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^[0-9]{10}$/, "Phone must be 10 digits"),
  age: z.number().int().min(0).max(120),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

// ─── Create (POST body — no server-generated fields) ──────────────────────────
export const CreatePatientSchema = PatientSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ─── Update (PATCH body — all fields optional) ────────────────────────────────
export const UpdatePatientSchema = CreatePatientSchema.partial();

// ─── Response (what the API safely returns to clients) ────────────────────────
export const PatientResponseSchema = PatientSchema.omit({
  // omit sensitive / internal-only fields here if needed
});

// ─── List Response ─────────────────────────────────────────────────────────────
import { PaginatedResponseSchema } from "../common";
export const PatientListResponseSchema = PaginatedResponseSchema(
  PatientResponseSchema,
);
```

#### `patient.types.ts`

```ts
import { z } from "zod";
import {
  PatientSchema,
  CreatePatientSchema,
  UpdatePatientSchema,
  PatientResponseSchema,
  PatientListResponseSchema,
} from "./patient.schema";

// NO manual interfaces. EVER.
export type Patient = z.infer<typeof PatientSchema>;
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type UpdatePatient = z.infer<typeof UpdatePatientSchema>;
export type PatientResponse = z.infer<typeof PatientResponseSchema>;
export type PatientListResponse = z.infer<typeof PatientListResponseSchema>;
```

---

## Schema Splitting by Use Case

> ⚠️ Using one schema for everything is the #1 mistake teams make. It works for demos and breaks in production.

### Why You Need Variants

| Scenario                 | Single-schema problem                        | Split-schema solution                   |
| ------------------------ | -------------------------------------------- | --------------------------------------- |
| Frontend POSTs with `id` | Schema allows it → DB error or ignored field | `CreatePatientSchema` omits `id`        |
| PATCH sends only `name`  | Schema requires all fields → 400 error       | `UpdatePatientSchema` uses `.partial()` |
| API leaks `passwordHash` | Schema includes it → security risk           | `ResponseSchema` omits sensitive fields |
| DB returns `_count`      | Exposed to frontend → tight coupling         | Mapper strips before response           |

### Composition Patterns

```ts
// Pick specific fields for lightweight lists
export const PatientSummarySchema = PatientSchema.pick({
  id: true,
  name: true,
  phone: true,
});

// Extend with related entities
export const PatientWithAppointmentsSchema = PatientResponseSchema.extend({
  appointments: z.array(AppointmentResponseSchema),
  nextAppointment: AppointmentResponseSchema.nullable(),
});

// Merge two schemas
export const PatientSearchResultSchema = PatientSummarySchema.merge(
  z.object({ relevanceScore: z.number() }),
);
```

---

## Backend NestJS Integration

### Installation

```bash
pnpm add nestjs-zod
```

### Global Setup

```ts
// main.ts
import { cleanupOpenApiDoc } from "nestjs-zod";

const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup("docs", app, cleanupOpenApiDoc(document));
```

```ts
// app.module.ts
import { APP_PIPE } from "@nestjs/core";
import { ZodValidationPipe } from "nestjs-zod";

@Module({
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
```

### Controller Pattern

```ts
import { createZodDto } from "nestjs-zod";
import {
  CreatePatientSchema,
  UpdatePatientSchema,
  PaginationQuerySchema,
} from "@workspace/types";

class CreatePatientDto extends createZodDto(CreatePatientSchema) {}
class UpdatePatientDto extends createZodDto(UpdatePatientSchema) {}
class PaginationDto extends createZodDto(PaginationQuerySchema) {}

@Controller("patients")
export class PatientsController {
  constructor(private readonly patientService: PatientsService) {}

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.patientService.findAll(query);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientService.update(id, dto);
  }
}
```

### What This Eliminates

| Before (class-validator)                 | After (nestjs-zod)                    |
| ---------------------------------------- | ------------------------------------- |
| `@IsString()`, `@MinLength()` decorators | Zod schema handles it                 |
| Separate DTO file per operation          | One-liner `createZodDto()`            |
| `class-transformer` quirks               | Zod `.parse()` handles transforms     |
| Manual Swagger decorators                | `cleanupOpenApiDoc(document)` post-processes OpenAPI |
| DTO ↔ frontend drift                     | Same schema validates both sides      |

---

## Prisma Boundary Layer

### The Rule

```
Prisma = storage model  (how data is persisted)
Zod   = domain model   (how data is validated and shaped)
```

These MUST be separated by an explicit mapper.

### File Location

```
apps/api/src/modules/patients/infrastructure/patient.mapper.ts
```

### Mapper Implementation

```ts
import { Patient as PrismaPatient, Prisma } from "@prisma/client";
import { PatientSchema, PatientResponseSchema } from "@workspace/types";
import type { Patient, CreatePatient, PatientResponse } from "@workspace/types";

export class PatientMapper {
  // DB row → validated domain object
  static toDomain(raw: PrismaPatient): Patient {
    return PatientSchema.parse({
      id: raw.id,
      name: raw.name,
      phone: raw.phone,
      age: raw.age,
      email: raw.email,
      address: raw.address,
      createdAt: raw.created_at, // handles DB naming differences
      updatedAt: raw.updated_at,
    });
  }

  // Domain object → safe API response
  static toResponse(patient: Patient): PatientResponse {
    return PatientResponseSchema.parse(patient);
  }

  // Create input → Prisma write shape
  static toPersistence(input: CreatePatient): Prisma.PatientCreateInput {
    return {
      name: input.name,
      phone: input.phone,
      age: input.age,
      email: input.email ?? null,
      address: input.address ?? null,
    };
  }
}
```

### Repository Usage

```ts
@Injectable()
export class PatientsRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Patient> {
    const raw = await this.prisma.patient.findUniqueOrThrow({ where: { id } });
    return PatientMapper.toDomain(raw);
  }

  async create(data: CreatePatient): Promise<Patient> {
    const raw = await this.prisma.patient.create({
      data: PatientMapper.toPersistence(data),
    });
    return PatientMapper.toDomain(raw);
  }

  async findAll(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.patient.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.patient.count(),
    ]);

    return {
      items: items.map(PatientMapper.toDomain),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

> 💡 If `PatientSchema.parse()` throws in `toDomain()`, your DB has data that violates domain rules — a critical signal that either a migration is needed or your schema is wrong. Either way, you want to know immediately.

---

## Frontend & Data Access

### `packages/data-access`

Centralizes all API calls with Zod-validated responses.

```ts
// packages/data-access/src/patients/patients.api.ts
import { z } from "zod";
import {
  PatientResponseSchema,
  PatientListResponseSchema,
  CreatePatientSchema,
} from "@workspace/types";
import type {
  CreatePatient,
  PatientResponse,
  PatientListResponse,
} from "@workspace/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function safeFetch<T>(
  url: string,
  schema: z.ZodSchema<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message ?? "Request failed");
  }
  const json = await res.json();
  return schema.parse(json);
}

export function getPatient(id: string): Promise<PatientResponse> {
  return safeFetch(`${API_BASE}/patients/${id}`, PatientResponseSchema);
}

export function listPatients(
  page = 1,
  limit = 20,
): Promise<PatientListResponse> {
  return safeFetch(
    `${API_BASE}/patients?page=${page}&limit=${limit}`,
    PatientListResponseSchema,
  );
}

export function createPatient(data: CreatePatient): Promise<PatientResponse> {
  CreatePatientSchema.parse(data);
  return safeFetch(`${API_BASE}/patients`, PatientResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
```

**No `as Patient`. No `any`. No unsafe casting — ever.**

---

## React Forms Integration

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreatePatientSchema } from "@workspace/types";
import type { CreatePatient } from "@workspace/types";
import { createPatient } from "@workspace/data-access";

export function CreatePatientForm() {
  const form = useForm<CreatePatient>({
    resolver: zodResolver(CreatePatientSchema),
    defaultValues: { name: "", phone: "", age: 0 },
  });

  const onSubmit = async (data: CreatePatient) => {
    await createPatient(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register("name")} placeholder="Full Name" />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
        // ↑ "Name must be at least 2 characters" — comes straight from the Zod schema
      )}

      <input {...form.register("phone")} placeholder="Phone (10 digits)" />
      {form.formState.errors.phone && (
        <span>{form.formState.errors.phone.message}</span>
      )}

      <input {...form.register("age", { valueAsNumber: true })} type="number" />
      <button type="submit" disabled={form.formState.isSubmitting}>
        Create Patient
      </button>
    </form>
  );
}
```

### One rule, three enforcement points

| Location       | Mechanism                                |
| -------------- | ---------------------------------------- |
| React form     | `zodResolver` shows inline field errors  |
| API request    | `ZodValidationPipe` rejects bad payloads |
| Domain mapping | `toDomain()` validates DB output         |

---

## Domain Contract Index

For future auto-generation of API clients, OpenAPI specs, and React Query hooks.

```
packages/types/src/contracts/
├── patients.contract.ts
├── appointments.contract.ts
└── index.ts
```

```ts
// contracts/patients.contract.ts
import {
  CreatePatientSchema,
  UpdatePatientSchema,
  PatientResponseSchema,
  PatientListResponseSchema,
  PaginationQuerySchema,
} from "../index";

export const PatientsContract = {
  create: {
    method: "POST" as const,
    path: "/patients",
    input: CreatePatientSchema,
    output: PatientResponseSchema,
  },
  update: {
    method: "PATCH" as const,
    path: "/patients/:id",
    input: UpdatePatientSchema,
    output: PatientResponseSchema,
  },
  getById: {
    method: "GET" as const,
    path: "/patients/:id",
    output: PatientResponseSchema,
  },
  list: {
    method: "GET" as const,
    path: "/patients",
    query: PaginationQuerySchema,
    output: PatientListResponseSchema,
  },
} as const;
```

**What this unlocks:**

- Auto-generated OpenAPI / Swagger spec
- `@tanstack/react-query` typed hooks
- Mock server handlers (MSW)
- API client SDK generation

---

## Error Handling Patterns

### Standardised API Errors

```ts
// common/error.schema.ts
import { z } from "zod";

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});
```

### Structured Zod Exception Filter

```ts
import { ZodValidationException } from "nestjs-zod";

@Catch(ZodValidationException)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.status(400).json({
      statusCode: 400,
      message: "Validation failed",
      errors: exception.getZodError().errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
}
```

---

## Testing with Zod

Schemas double as test fixtures. Use `.safeParse()` to test boundaries without throwing.

```ts
import { CreatePatientSchema } from "@workspace/types";

const validPatient = {
  name: "John Doe",
  phone: "9876543410",
  age: 30,
};

describe("CreatePatientSchema", () => {
  it("accepts valid data", () => {
    expect(CreatePatientSchema.safeParse(validPatient).success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = CreatePatientSchema.safeParse({
      ...validPatient,
      name: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone number", () => {
    const result = CreatePatientSchema.safeParse({
      ...validPatient,
      phone: "123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative age", () => {
    const result = CreatePatientSchema.safeParse({ ...validPatient, age: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects age above 120", () => {
    const result = CreatePatientSchema.safeParse({ ...validPatient, age: 121 });
    expect(result.success).toBe(false);
  });
});
```

---

## Migration Strategy

> Don't rewrite everything at once. Migrate incrementally — one domain at a time.

### Phase 1 — Foundation

- [ ] Create `packages/types` with `package.json` and `tsconfig`
- [ ] Add `zod` dependency
- [ ] Build `common/` schemas (`BaseEntity`, `Pagination`, `Id`)
- [ ] Build first domain: `patient/` with all four schema variants
- [ ] Export from root `index.ts`

### Phase 2 — Backend Adoption

- [ ] Install `nestjs-zod` in `apps/api`
- [ ] Register `ZodValidationPipe` globally
- [ ] Replace patient DTOs with `createZodDto()`
- [ ] Add `PatientMapper` in infrastructure layer
- [ ] Add `ZodExceptionFilter` for structured error responses

### Phase 3 — Frontend Adoption

- [ ] Install `@hookform/resolvers` in `apps/app`
- [ ] Migrate patient forms to `zodResolver(CreatePatientSchema)`
- [ ] Parse all API responses via `PatientResponseSchema.parse()`

### Phase 4 — Data Access Cleanup

- [ ] Centralise all fetch calls into `packages/data-access`
- [ ] Add `safeFetch` utility with schema validation
- [ ] Remove raw `fetch` usage from components
- [ ] Remove all `as SomeType` casts

### Phase 5 — Contract Layer _(future)_

- [ ] Add `packages/types/src/contracts/`
- [ ] Evaluate `@ts-rest` or `tRPC` for end-to-end contract enforcement
- [ ] Auto-generate React Query hooks from contracts

---

## What You Gain

| Problem Eliminated                | How                                                  |
| --------------------------------- | ---------------------------------------------------- |
| Frontend / backend shape mismatch | Same schema validates both                           |
| Invalid payload bugs              | Parsed at API boundary — garbage in, error out       |
| Silent breaking changes           | TS errors propagate from schema change               |
| Runtime surprises from DB drift   | Mapper validates Prisma output against domain schema |
| Unsafe `as` casts                 | Schema `.parse()` returns a properly typed value     |

| Capability Gained              | How                                                    |
| ------------------------------ | ------------------------------------------------------ |
| Refactor confidence            | Change schema → TS finds all breakages at compile time |
| Auto type propagation          | `z.infer<>` derives types with zero maintenance        |
| Faster feature shipping        | Add field to schema, types flow to API, UI, forms      |
| Future: auto-generated clients | Contract index enables codegen                         |

---

## Package Dependencies

```
packages/types          → zod
packages/data-access    → @workspace/types, zod
packages/db             → @prisma/client  (internal only)
apps/api                → @workspace/types, nestjs-zod, @workspace/db
apps/app                → @workspace/types, @workspace/data-access,
                          react-hook-form, @hookform/resolvers
```

> 🚨 `@prisma/client` must never appear outside `packages/db` and `apps/api/infrastructure`.
