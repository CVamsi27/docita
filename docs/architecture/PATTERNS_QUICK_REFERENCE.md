# Patterns — Quick Reference

Point-in-time: **2026-08-05**. TL;DR companion to
[`DESIGN_PRINCIPLES_AND_PATTERNS.md`](DESIGN_PRINCIPLES_AND_PATTERNS.md)
(worked examples, 780 lines) and [`AGENTS.md`](../../AGENTS.md) §15
(principle catalogue). This doc is the **lookup table** for "I need X,
where do I find it?".

> Read this when you are mid-implementation and need to copy a pattern.
> For *why* a pattern exists, see the worked examples doc.

---

## Index: problem → pattern

| You need to…                                            | Use this pattern                                | Worked example in DESIGN_PRINCIPLES |
| ------------------------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| Render a list with loading / error / empty / data        | `<DataState>` + page-level `status`             | §2.1                                |
| Add a button                                            | `<Button>` from `@workspace/ui/components/form/button` | §2.1 |
| Add a modal / dialog                                    | `<Dialog>`, `<AlertDialog>`, `<WizardDialog>` from `@workspace/ui` | §4 (UI standard) |
| Make a backend call                                     | `packages/data-access` hook, or `features/*/api/*.api.ts` adapter | §3.2 |
| Define a shape that flows API ↔ client ↔ form            | Zod schema in `packages/types`                   | §3.1                                |
| Add a new API endpoint                                  | `Controller` (thin) + `*Service` (logic) + repository (DB) | §15.1 (AGENTS) |
| Split a service into read/write                          | `*QueryService` + `*CommandService` (+ optional `*Calculator`) | §15.1 (AGENTS) |
| Show a patient's full name                              | `getPatientFullName(p)` from `@workspace/utils`  | §3.3                                |
| Compare a clinic's tier to "what's allowed"             | `hasFeatureAccess(tier, feature, hasIntelligence, overrides, mode)` | §15.8 (AGENTS) |
| Check if a clinic is on Front Desk                       | `isFrontDeskPlanMode(tier, planMode)`            | §15.8 (AGENTS) |
| Validate a clinic feature on the backend                | `assertClinicHasFeatureOrThrow(tier, feature, mode)` | §15.8 |
| Log a PHI access                                        | Inject `AuditLoggerService` + `logPhiRead({action, resource, resourceId, ip, userAgent})` | §15.6 (AGENTS) |
| Show a toast                                            | `toast()` from `@workspace/ui` (Sonner)         | §4 (UI standard) |
| Add a route                                              | `src/routes/route-pages-<group>.ts` registry + `<Routes>` in `App.tsx` | §P4.1 |
| Add a new test                                           | Colocate `*.test.ts(x)` next to source; for pure helpers, a sibling unit test is enough | §P2 |
| Add a new env var                                        | `.env.example` + `turbo.json` `env` passthrough + `wrangler.toml` (if prod Worker) | AGENTS §16.2 |
| Add a new dependency                                     | One library per concern area; rationale in PR; `pnpm knip` | AGENTS §16.1 |
| Add a static-check suppression                           | `// check-as-cast-density: allow-file` + entry in `SUPPRESSION_LEDGER.md` | [SUPPRESSION_LEDGER.md](../analysis/SUPPRESSION_LEDGER.md) |
| Touch a webhook                                          | HMAC verify (raw body) + replay dedupe table; CSRF-exempt POSTs to `/webhooks/*` | §1 (SECURITY_HARDENING) |
| Touch an upload                                          | Magic-byte + extension + MIME triple check + server-side re-encode | §1 |
| Touch PHI encryption                                    | `AES-256-GCM` via `EncryptionPatientFieldsService` only; never inline | §PHI_ENCRYPTION_POLICY |
| Touch RLS                                                | `@BypassRLS` annotation required; rationale in comment | §RLS_ROLLOUT |
| Touch audit logging                                     | Use the shared `auditLogSchema` field names (`action`/`resource`/`resourceId`/`details`); never hand-define | §1 (SECURITY_HARDENING) |
| Roll back a release                                      | `fly releases rollback` (API/worker) or `wrangler rollback` (web) | §5 (STABILITY_RUNBOOK) |
| Investigate an incident                                  | Open the relevant playbook in `docs/operations/playbooks/` | §3 (STABILITY_RUNBOOK) |

---

## 1. Page-level composition (mandatory shape)

```tsx
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { usePatients } from "@workspace/data-access/hooks/use-patients";

export function PatientsPage() {
  const { data, isLoading, error, refetch } = usePatients();

  const status = isLoading ? "loading" : error ? "error" : data?.length === 0 ? "empty" : "success";

  return (
    <AppPageScaffold>
      <PageHeader title="Patients" />
      <DataState status={status} loadingMessage="Loading patients…" onRetry={refetch}>
        <PatientsTable rows={data} />
      </DataState>
    </AppPageScaffold>
  );
}
```

**Don't**: `if (isLoading) return <Spinner/>; if (error) return <ErrorPage/>;` — branches
are not reusable and often miss the empty state.

---

## 2. Data fetching (single source of truth)

```ts
// packages/data-access/src/hooks/use-patients.ts — the only place this is defined
export function usePatients(params?: PatientSearchParams) {
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: () => apiClient.getPatients(params),
  });
}
```

```tsx
// app feature consumer
import { usePatients } from "@workspace/data-access/hooks/use-patients";
const { data, isLoading, error } = usePatients({ clinicId });
```

**Don't**: `const res = await fetch('/api/patients', { headers: ... })` in a component
or feature hook. Use the data-access hook, or — for binary downloads or external
sagas — a `features/*/api/*.api.ts` adapter (the only sanctioned `fetch` site).

**Enforced by**: `pnpm check:frontend-fetch --enforce` (zero raw `fetch(` in features).

---

## 3. CQS / Command-Query separation (backend)

```ts
// controller — thin
@Controller("patients")
export class PatientsController {
  constructor(
    private readonly query: PatientsQueryService,
    private readonly command: PatientsCommandService,
  ) {}

  @Get(":id")
  get(@Param("id") id: string) { return this.query.getById(id); }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreatePatientDto) { return this.command.create(dto); }
}

// query service — read-only, no Prisma writes
@Injectable()
export class PatientsQueryService {
  constructor(@Inject("IPatientReadRepository") private readonly repo: PatientReadRepository) {}
  async getById(id: string): Promise<Patient> { /* … */ }
}

// command service — writes go through Prisma in the repository
@Injectable()
export class PatientsCommandService {
  constructor(
    @Inject("IPatientWriteRepository") private readonly repo: PatientWriteRepository,
    private readonly audit: AuditLoggerService,
  ) {}
  async create(dto: CreatePatientDto): Promise<Patient> {
    const patient = await this.repo.create(dto);
    await this.audit.logPhiRead({ action: "CREATE", resource: "Patient", resourceId: patient.id });
    return patient;
  }
}
```

**Suffix rule** (enforced by `pnpm check:controller-cqs --enforce`): a
backend service file must end in `QueryService`, `CommandService`,
`FacadeService`, or be in `scripts/lib/controller-cqs-allowlist.mjs`.

---

## 4. Repository pattern (Prisma boundary)

```ts
// core — interface, no Prisma import
export interface PatientReadRepository {
  findById(id: string): Promise<Patient | null>;
  list(filter: PatientFilter): Promise<Patient[]>;
}

// infrastructure — implementation, Prisma lives here only
@Injectable()
export class PrismaPatientReadRepository implements PatientReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.patient.findUnique({ where: { id } });
    return row ? toDomainPatient(row) : null;  // ← Prisma row → domain object
  }
}
```

**Boundary rule** (enforced by `pnpm check:prisma-boundary`): `@prisma/client`
is only importable from `packages/db` and API repository implementations.
Services and controllers consume domain types only.

---

## 5. SSOT — Zod in `packages/types`

```ts
// packages/types/src/patient/patient.ts — single source of truth
export const patientSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/),
});
export type Patient = z.infer<typeof patientSchema>;
```

```ts
// API DTO — wraps the schema
import { createZodDto } from "nestjs-zod";
import { patientSchema } from "@workspace/types";
export class PatientDto extends createZodDto(patientSchema) {}
export class CreatePatientDto extends createZodDto(patientSchema.omit({ id: true })) {}
```

```tsx
// Frontend form — same schema, same types
import { zodResolver } from "@hookform/resolvers/zod";
import { patientSchema } from "@workspace/types";
const form = useForm<z.infer<typeof patientSchema>>({
  resolver: zodResolver(patientSchema.omit({ id: true })),
});
```

**Enforced by**: `pnpm check:contracts-strict`, `pnpm check:type-duplicates`,
`pnpm check:zod-interface-parity` (15 documented form-local divergences in
`allowlists/zod-interface-parity.json`).

---

## 6. Frontend feature structure (mandatory)

```
apps/app/src/features/<feature>/
├── components/        ← presentational, props in / events out
│   ├── <feature>-page.tsx
│   ├── <feature>-page-sections.tsx     ← sections file
│   └── <feature>-helpers.ts            ← pure helpers (no React)
├── hooks/
│   ├── use-<feature>.ts                ← React Query + state
│   └── use-<feature>-dialog.ts
├── api/
│   └── <feature>.api.ts                ← only sanctioned fetch site
├── lib/                               ← feature-local types, constants
├── pages/                             ← route composition
├── rules/
│   ├── <feature>-rules.ts             ← pure functions
│   └── <feature>-rules.test.ts        ← required by check:domain-rules-tests
├── types.ts                           ← feature-local types (NOT in packages/types)
└── index.ts                           ← public barrel
```

**Cross-feature imports**: must go through the barrel (`@/features/<other-feature>`),
not deep imports. Enforced by `pnpm check:feature-boundaries`.

---

## 7. Audit logging (PHI read pattern)

```ts
// In a query service
@Injectable()
export class PatientsQueryService {
  constructor(
    @Inject("IPatientReadRepository") private readonly repo: PatientReadRepository,
    private readonly audit: AuditLoggerService,
  ) {}

  async getById(id: string, ctx: RequestContext) {
    const patient = await this.repo.findById(id);
    if (patient) {
      await this.audit.logPhiRead({
        action: "VIEW_PROFILE",
        resource: "Patient",
        resourceId: id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
    return patient;
  }
}
```

**Enforced by**: `pnpm check:phi-read-audit --enforce` (every controller method
reading PHI must have a sibling audit emit) and the e2e
`patient-phi-read-audit.e2e-spec.ts` (6 tests).

---

## 8. Error boundary at the route level (mandatory)

```tsx
// In App.tsx route tree — every functional layout wraps content
<Route
  path="patients"
  element={
    <AppLayout>
      <ErrorBoundary fallback={<RouteErrorPage />}>
        <PatientsPage />
      </ErrorBoundary>
    </AppLayout>
  }
/>
```

**Enforced by**: `pnpm check:error-boundary-coverage` (5/5 functional layouts
must wrap content). Don't add `try { … } catch { return <ErrorPage /> }` in
feature components — let the boundary catch.

---

## 9. Telemetry — same-origin only

```ts
// app/src/lib/monitoring/web-vitals.ts
const ENDPOINT = "/api/internal/telemetry/web-vitals";  // same-origin proxy
```

**Don't**: `fetch("https://api.docita.work/telemetry", …)` — cross-origin
POSTs to the API domain break the same-origin CSP and leak data through
CDN logs. Use the app's own proxy route.

**Enforced by**: `pnpm check:browser-telemetry-same-origin`.

---

## 10. Common gotchas (learned the hard way)

| Gotcha                                                                                         | Fix                                                                                              |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Service tests fail with "X is not a function" after constructor change                          | Use `Object.create(X.prototype) as X` to build the mock without invoking the constructor          |
| `pnpm check:as-cast-density` fails on a real cast                                              | Add `// check-as-cast-density: allow-file — <rationale>` to the file; entry in `SUPPRESSION_LEDGER.md` |
| `pnpm check:zod-interface-parity` fails on a form-local type                                    | Add a `allowlists/zod-interface-parity.json` entry with the rationale; never hand-redefine      |
| `pnpm check:frontend-fetch` fails on a binary download                                          | Move to `features/*/api/*.api.ts` (sanctioned boundary)                                            |
| `pnpm check:tier-comparisons` fails on `tier >= Tier.INTELLIGENCE`                              | Use `hasIntelligence` or `hasFeatureAccess(Feature.X)` instead                                   |
| `pnpm check:workspace-profile-gating` fails                                                     | You reintroduced a removed symbol; check the removed list in AGENTS.md §15.8                     |
| `pnpm check:circular:enforce` fails on a new NestJS module                                     | The two intentional cycles (auth↔clinics, whatsapp↔support-whatsapp) are allowlisted; any new cycle must be fixed with `forwardRef` or split |
| `pnpm check:client-storage-usage` flags `localStorage.setItem`                                  | Add `check-client-storage-usage: allow-file — <no-PHI rationale>`; never store PHI in localStorage |
| `pnpm check:jsx-literal-density` fails after adding a page                                       | Audit the literals: brand strings → constants, UI copy → en.json/hi.json, dates → `Intl.DateTimeFormat` |
| `pnpm check:circular-deps` finds a cycle through the new feature barrel                        | Re-export from a single index; use `@/features/<feature>` for cross-feature imports               |
| `pnpm check:route-thinness` flags a >180-line route page                                         | Split into `*-page.tsx` + `*-page-sections.tsx`                                                   |
| `pnpm check:file-size-budget` flags a >400-line file                                            | Apply the [split criteria in AGENTS.md §15.5](https://github.com/vamsikrishnachandaluri/repos/docita/AGENTS.md#15-pattern-catalogue) |

---

## 11. Where to look for more

- **Principle catalogue**: [`AGENTS.md`](../../AGENTS.md) §15 (15.1 backend,
  15.2 frontend, 15.3 shared packages, 15.4 SOLID, 15.5 module shape,
  15.6 patterns, 15.7 frontend shapes, 15.8 tier/feature gating, 15.9
  imports, 15.10 testing, 15.11 automation map).
- **Worked before/after examples**: [`DESIGN_PRINCIPLES_AND_PATTERNS.md`](DESIGN_PRINCIPLES_AND_PATTERNS.md).
- **Single source of truth mapping**: [`SINGLE_SOURCE_OF_TRUTH.md`](SINGLE_SOURCE_OF_TRUTH.md).
- **Tier/feature gating contract**: [`TIER_FEATURE_OVERRIDES_PLAN.md`](TIER_FEATURE_OVERRIDES_PLAN.md).
- **Security gates and threat model**: [`SECURITY_HARDENING_CHECKLIST.md`](../operations/SECURITY_HARDENING_CHECKLIST.md).
- **Stability and SLOs**: [`STABILITY_RUNBOOK.md`](../operations/STABILITY_RUNBOOK.md).
- **Suppression rationale**: [`SUPPRESSION_LEDGER.md`](../analysis/SUPPRESSION_LEDGER.md).
- **Post-cutover gaps**: [`POST_CUTOVER_GAPS.md`](../analysis/POST_CUTOVER_GAPS.md).
