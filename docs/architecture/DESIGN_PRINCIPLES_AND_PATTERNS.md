# Design Principles & Patterns — Worked Examples Companion

**Audience:** engineers and agents adding/refactoring code in this repo.
**Purpose:** before→after pairs for every principle and pattern in AGENTS.md §12–§15, grounded in real
files. This is a teaching reference — it complements AGENTS.md by being example-first.

> The canonical pattern catalogue lives in [`AGENTS.md`](file:///Users/vamsikrishnachandaluri/repos/docita/AGENTS.md) §15.
> The architecture doc is [`docs/architecture/SYSTEM_DESIGN_AND_PATTERNS.md`](file:///Users/vamsikrishnachandaluri/repos/docita/docs/architecture/SYSTEM_DESIGN_AND_PATTERNS.md).

---

## Part 1 — SOLID

### 1.1 Single Responsibility

**A module should have one reason to change.** In this repo: split command (write) from query (read) logic; split hook (data+state) from component (render).

**Backend — command/query separation.** Before: a fat `appointment.service.ts` mixing reads, writes, metrics, and diagnosis logic into one file. After: write mutations go to `AppointmentCommandService`, read queries go to `AppointmentQueryService`, and the original file becomes a thin facade that delegates.

```ts
// apps/api/src/domains/appointments/application/services/appointment-command.service.ts
@Injectable()
export class AppointmentCommandService {
  constructor(
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)
    private readonly writeRepo: IAppointmentWriteRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAppointmentDto): Promise<Appointment> { /* … */ }
  async cancel(id: string, reason: string): Promise<void> { /* … */ }
}
```

```ts
// apps/api/src/domains/appointments/application/services/appointment-query.service.ts
@Injectable()
export class AppointmentQueryService {
  constructor(
    @Inject(APPOINTMENT_READ_REPOSITORY_TOKEN)
    private readonly readRepo: IAppointmentReadRepository,
  ) {}

  async list(params: AppointmentSearchParams): Promise<PaginatedResult<AppointmentListItem>> { /* … */ }
  async findById(id: string, clinicId: string): Promise<Appointment | null> { /* … */ }
}
```

**Frontend — hook vs presentational.** Before: a component fetches data, manages state, AND renders JSX. After: `usePatientMetricsUI` is a custom hook that owns state and data fetching; `MetricsTrackingCard` receives props and only renders.

```ts
// apps/app/src/features/patients/components/details/use-patient-metrics-ui.ts
export function usePatientMetricsUI(patientId: string, categoryKey?: string) {
  const { data: categories, isLoading } = usePatientMetricCategories(patientId);
  const { data: history } = usePatientMetricHistory(patientId);
  const [newCategoryKey, setNewCategoryKey] = useState("");
  const filteredCategories = useMemo(
    () => filterMetricCategories(categoryKey),
    [categories, categoryKey],
  );
  return { categories, history, isLoading, newCategoryKey, setNewCategoryKey, filteredCategories };
}
```

```tsx
// apps/app/src/features/patients/components/details/metrics/MetricsTrackingCard.tsx
interface MetricsTrackingCardProps {
  loading: boolean;
  categories: MetricCategoryResponse[];
  onToggleTracked: (definitionId: string, isTracked: boolean) => void;
}
export function MetricsTrackingCard({ loading, categories, onToggleTracked }: MetricsTrackingCardProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Categories & Tracked Metrics</CardTitle></CardHeader>
      <CardContent>
        {loading ? <p>Loading metrics</p> : categories.map(cat => (/* … */))}
      </CardContent>
    </Card>
  );
}
```

**Also seen in:** `leave-command.service.ts` / `leave-query.service.ts`; `prescriptions-command.service.ts` / `prescriptions-query.service.ts`.
**Enforced by:** `pnpm check:file-size-budget` (400-line backstop), `pnpm check:facade-delegation`.
**Avoid:** Services that call both `this.readRepo.*` and `this.writeRepo.*` in the same method; components that pass `user` + `subscription` + `clinic` as one fat prop.

---

### 1.2 Open / Closed

**Open for extension, closed for modification.** Add new behaviour by extending a map or registry, not by branching inside a guard.

```ts
// packages/types/src/billing/tier.ts — FEATURE_TIER_MAP is the extension point
export const FEATURE_TIER_MAP: Record<Feature, Tier> = {
  [Feature.INVOICING]: Tier.ESSENTIAL,
  [Feature.WHATSAPP_MESSAGING]: Tier.ESSENTIAL,
  [Feature.MULTI_DOCTOR]: Tier.ESSENTIAL,
  [Feature.AI_PRESCRIPTION_ASSISTANT]: Tier.ESSENTIAL,
  [Feature.WHATSAPP_OWN_NUMBER]: Tier.PROFESSIONAL,
  // Add a new feature → add one entry here, never touch the guards.
};
```

```ts
// apps/api/src/shared/modules/imports/bulk-import-strategy.registry.ts
@Injectable()
export class BulkImportStrategyRegistry {
  private readonly strategies: Map<BulkImportEntityType, IImportStrategy>;

  constructor(
    patientStrategy: PatientImportStrategy,
    doctorStrategy: DoctorImportStrategy,
    /* … more strategies injected … */
  ) {
    this.strategies = new Map([
      ['PATIENT', patientStrategy],
      ['DOCTOR', doctorStrategy],
      /* … add a new entity type → register its strategy here, no switch/if … */
    ]);
  }

  get(entityType: BulkImportEntityType): IImportStrategy {
    return this.strategies.get(entityType) ?? throw new BadRequestException(/* … */);
  }
}
```

**Also seen in:** `MODE_BLOCKED_FEATURES` — new modes don't modify existing mode checks.
**Avoid:** `if (tier === 'ENTERPRISE') { … } else if (tier === 'PROFESSIONAL') { … }` in business logic. Add to `FEATURE_TIER_MAP` instead.

---

### 1.3 Liskov Substitution

**Subtypes must satisfy the contract of their base type.** Repository interfaces allow swapping Prisma ↔ mock; `StorageProvider` allows swapping R2 ↔ local ↔ mock.

```ts
// apps/api/src/domains/documents/application/ports/storage-provider.port.ts
export abstract class StorageProvider {
  abstract upload(file: UploadStream, path: string): Promise<UploadResult>;
  abstract delete(path: string): Promise<void>;
  abstract generateSignedUrl(path: string, expiry: number): Promise<string>;
}
```

```ts
// apps/api/src/domains/documents/infrastructure/r2-storage.provider.ts
export class R2StorageProvider extends StorageProvider {
  async upload(file: UploadStream, path: string): Promise<UploadResult> { /* … */ }
  async delete(path: string): Promise<void> { /* … */ }
  async generateSignedUrl(path: string, expiry: number): Promise<string> { /* … */ }
}
```

```ts
// Test mock — satisfies the same contract
class MockStorageProvider extends StorageProvider {
  upload = jest.fn<UploadResult>();
  delete = jest.fn<void>();
  generateSignedUrl = jest.fn<string>();
}
```

**Also seen in:** `IAppointmentReadRepository` → Prisma impl / `Object.create(X.prototype)` mock; `local-storage.provider.ts` alongside `r2-storage.provider.ts`.
**Avoid:** Test mocks that accept extra arguments the interface doesn't define, or throw errors the real implementation wouldn't. Use `Object.create(X.prototype) as X` to get a typed mock instance.

---

### 1.4 Interface Segregation

**Clients should not depend on methods they don't use.** Split read and write repository interfaces so a query service never depends on write methods.

```ts
// apps/api/src/domains/appointments/core/repositories/appointment-read.repository.interface.ts
export interface IAppointmentReadRepository {
  findAll(params: AppointmentSearchParams): Promise<PaginatedResult<AppointmentListItem>>;
  findById(id: string, clinicId: string): Promise<Appointment | null>;
  findByPatientId(patientId: string, clinicId: string): Promise<Appointment[]>;
}
```

```ts
// apps/api/src/domains/appointments/core/repositories/appointment-write.repository.interface.ts
export interface IAppointmentWriteRepository {
  save(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
  delete(id: string, clinicId: string): Promise<void>;
  startConsultationTx(/* … */): Promise<void>;
}
```

**Frontend** — components receive only the props they render. Before: a component receives the full `user` + `subscription` object. After: `<FeatureGate feature={Feature.X}>` receives only a `Feature` enum value.

```tsx
// apps/app/src/components/auth/feature-gate.tsx
interface FeatureGateProps {
  feature: Feature;        // ← only what this component needs
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

**Also seen in:** `IInvoiceReadRepository` / `IInvoiceWriteRepository` (billing domain).
**Enforced by:** `pnpm check:controller-cqs` — controllers must not depend on write tokens for read-only operations.
**Avoid:** A single `IAppointmentRepository` interface with 15 methods that every consumer must implement or stub. Use the read/write split.

---

### 1.5 Dependency Inversion

**High-level modules should not depend on low-level modules; both should depend on abstractions.** In this repo: services depend on repository *interfaces* injected via DI tokens, never on concrete Prisma classes.

```ts
// apps/api/src/domains/appointments/application/services/appointment-command.service.ts
@Injectable()
export class AppointmentCommandService {
  constructor(
    @Inject(APPOINTMENT_WRITE_REPOSITORY_TOKEN)  // → Symbol('IAppointmentWriteRepository')
    private readonly writeRepo: IAppointmentWriteRepository,  // ← depends on interface
  ) {}
}
```

```ts
// Module binding — swaps implementation without touching the service
@Module({
  providers: [
    { provide: APPOINTMENT_WRITE_REPOSITORY_TOKEN, useClass: PrismaAppointmentWriteRepository },
  ],
})
export class AppointmentsModule {}
```

**Frontend:** components depend on data-access hooks, not on `fetch()`.

```ts
// packages/data-access/src/hooks/use-patients.ts
export function usePatients(params: PatientSearchParams) {
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: () => apiClient.getPatients(params),
  });
}
```

```tsx
// Feature component — depends on the hook abstraction
import { usePatients } from "@workspace/data-access";
function PatientList() {
  const { data, isLoading } = usePatients({ clinicId });
  // No fetch() in sight
}
```

**Enforced by:** `pnpm check:prisma-boundary` (no `@prisma/client` import in services), `pnpm check:frontend-fetch` (no raw `fetch()` in feature code).
**Avoid:** `constructor(private prisma: PrismaService) {}` in a domain service. Use a repository interface + DI token instead.

---

## Part 2 — KISS

### 2.1 Compose primitives, don't hand-roll

Before: inline conditional `if (loading) return <p>Loading…</p>` trees duplicated across every feature. After: use `DataState`.

```tsx
// packages/ui/src/components/data-display/data-state.tsx
export function DataState({ status, children, loadingMessage, errorMessage, onRetry }: DataStateProps) {
  if (status === "loading") return <LoadingState message={loadingMessage} />;
  if (status === "error")   return <ErrorState message={errorMessage} onRetry={onRetry} />;
  if (status === "empty")   return <EmptyState title="Nothing to show" />;
  return <>{children}</>;
}
```

Usage at page level:
```tsx
// apps/app/src/features/consultation/components/ConsultationDashboardUI.tsx
<AppPageScaffold>
  <PageHeader title="Consultation Dashboard" />
  <DataState status={status} loadingMessage="Loading dashboard…" onRetry={refetch}>
    <StatGrid />  {/* actual content */}
  </DataState>
</AppPageScaffold>
```

**Avoid:** `if (isLoading) return <Spinner />; if (!data) return <>No data</>;` — these inline branches are not reusable and often miss the error state.

### 2.2 Pure helpers over clever inline logic

Deterministic business math belongs in decorator-free pure functions with standalone unit tests.

```ts
// apps/api/src/domains/appointments/core/domain-services/appointment-interval-overlap.ts
export function appointmentsOverlap(
  existing: Array<{ start: Date; end: Date }>,
  candidate: { start: Date; end: Date },
): boolean {
  return existing.some(
    (e) => candidate.start < e.end && candidate.end > e.start,
  );
}
```

**Also seen in:** `patient-metrics.rules.ts`, `medication-dose-helpers.ts`.
**Enforced by:** `pnpm check:domain-rules-tests` — rules files must have a sibling `.test.ts`.
**Avoid:** Inline `new Date()` arithmetic inside a service method. Extract to a helper, test it in isolation.

### 2.3 No new abstraction without a removed duplicate

AGENTS.md §12.6: *"If a new pattern is added, it must replace at least one duplicate; standalone 'framework' PRs are not acceptable."*

Before: adding a new wrapper component for loading/error states when `<DataState>` already exists.
**Avoid:** Wrapping `<DataState>` inside `<FeatureDataState>` with no additional behaviour — just use `<DataState>` directly.
**Also avoid:** A new class-based "BaseService" if no concrete caller needs DI and there's no duplicate removed.

---

## Part 3 — DRY

### 3.1 Types once: Zod → everywhere

Before: hand-redefined DTO shapes in both API (`CreatePatientRequest`) and frontend form (`PatientFormData`) — they drift apart. After: Zod in `packages/types`, inferred with `z.infer` on the frontend, `createZodDto` on the API.

```ts
// packages/types/src/patient/patients.ts  ← single source of truth
export const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/),
});
export type Patient = z.infer<typeof patientSchema>;
```

```ts
// apps/api/src/domains/patients/…/dto/patients.dto.ts  ← API DTO wraps the schema
import { createZodDto } from 'nestjs-zod';
import { patientSchema } from '@workspace/types';
export class PatientDto extends createZodDto(patientSchema) {}
```

```tsx
// Frontend form — same type, derived from the same schema
import { patientSchema } from "@workspace/types";
const form = useForm<z.infer<typeof patientSchema>>({ resolver: zodResolver(patientSchema) });
```

**Enforced by:** `pnpm check:type-duplicates`, `pnpm check:contracts-strict`.
**Avoid:** `interface Patient { firstName: string; lastName: string; }` in both `apps/api/` and `apps/app/` — define once in `packages/types`.

### 3.2 Fetch once: data-access hooks

Before: each component calls `fetch('/api/patients')` with its own error handling, auth headers, and cache strategy. After: one hook in `packages/data-access`, all consumers reuse it.

```ts
// packages/data-access/src/hooks/use-patients.ts  ← single hook
export function usePatients(params: PatientSearchParams) {
  return useQuery({ queryKey: ['patients', params], queryFn: () => api.getPatients(params) });
}
export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePatientDto) => api.createPatient(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });
}
```

**Enforced by:** `pnpm check:frontend-fetch` — fails if feature code contains raw `fetch(` calls.
**Avoid:** `const res = await fetch('/api/patients', { headers: { Authorization: `Bearer ${token}` } })` in a component or feature hook. Import from `@workspace/data-access` instead.

### 3.3 Display logic once

Before: `patient.firstName + ' ' + patient.lastName` scattered across 50 files. After: a single helper.

```ts
// packages/utils/src/patient/patient-name.ts
export function getPatientFullName(patient: { firstName: string; lastName: string }): string {
  return `${patient.firstName} ${patient.lastName}`;
}
```

**Enforced by:** `pnpm check:patient-name-ssot` — flags any file that re-composes `firstName` + `lastName`.
**Avoid:** `${p.firstName} ${p.lastName}` in component render logic — always call `getPatientFullName(p)`.

### 3.4 Eligibility check once

Before: 5 files each list `tierKey === 'ESSENTIAL' || tierKey === 'FRONT_DESK' || tierKey === 'PROFESSIONAL' || tierKey === 'ENTERPRISE'` to determine WhatsApp eligibility. After: a single `hasFeatureAccess()` call.

```ts
// packages/utils/src/billing/tier-rules.ts
export function hasFeatureAccess(tier: TierName, feature: Feature, /* … */): boolean {
  const requiredTier = FEATURE_TIER_MAP[feature];
  return getTierValue(tier) >= requiredTier;
}
```

Usage: `hasFeatureAccess(clinicTier, Feature.WHATSAPP_MESSAGING)` — one line, one source of truth.
**Also seen in:** `isBillingAdminRole` — 3 copies across the codebase now consolidated to `BILLING_ROLES.has(role)` from `@workspace/types`.
**Avoid:** `tier === 'STARTER'` or `tier !== 'ENTERPRISE'` in business logic — call `hasFeatureAccess(tier, Feature.X)`.

---

## Part 4 — Design Patterns (GoF + Architectural)

### 4.1 Facade

**Provide a unified interface to a set of interfaces.** The original `AppointmentService` became a thin facade that delegates to `AppointmentCommandService` (writes) and `AppointmentQueryService` (reads).

```ts
// apps/api/src/domains/appointments/application/services/appointment.service.ts
@Injectable()
export class AppointmentService {
  constructor(
    private readonly command: AppointmentCommandService,
    private readonly query: AppointmentQueryService,
    private readonly metrics: AppointmentMetricsService,
  ) {}

  async list(params: AppointmentSearchParams) { return this.query.list(params); }
  async create(dto: CreateAppointmentDto) { return this.command.create(dto); }
  async getMetrics(clinicId: string) { return this.metrics.getMetrics(clinicId); }
}
```

**Avoid:** Adding new business logic to the facade — it should only delegate.

### 4.2 Command / Query Separation (CQS)

**Methods either mutate state (command) or return state (query), never both.** Enforced at the service boundary.

```ts
// Command — returns void or id, never data
class AppointmentCommandService {
  async create(dto: CreateAppointmentDto): Promise<string> { /* … */ }
  async cancel(id: string): Promise<void> { /* … */ }
}

// Query — never mutates
class AppointmentQueryService {
  async list(params: AppointmentSearchParams): Promise<PaginatedResult<Appointment>> { /* … */ }
  async findById(id: string): Promise<Appointment | null> { /* … */ }
}
```

**Enforced by:** `pnpm check:facade-delegation`, `pnpm check:controller-cqs`.
**Avoid:** `async function saveAndReturn(id: string): Promise<Appointment>` — split into `save()` (command) + `findById()` (query).

### 4.3 Repository

**Mediates between domain and data-mapping layers using interface-based abstractions.** The interface lives in `core/`, the Prisma implementation in `infrastructure/`.

```
appointments/core/repositories/
├── appointment-read.repository.interface.ts   ← interface (read)
├── appointment-write.repository.interface.ts  ← interface (write)
└── appointment.repository.interface.ts         ← composite

appointments/infrastructure/persistence/
├── prisma-appointment-read.repository.ts       ← Prisma impl
└── prisma-appointment-write.repository.ts      ← Prisma impl
```

**Enforced by:** `pnpm check:prisma-boundary` — prevents `@prisma/client` imports outside `packages/db` and repository layer.
**Avoid:** `@Inject(PrismaService)` in a domain service. Use `@Inject(APPOINTMENT_READ_REPOSITORY_TOKEN)` instead.

### 4.4 Strategy / Registry

**Family of interchangeable algorithms selected at runtime.** The bulk-import system resolves an `IImportStrategy` by entity type.

```ts
// apps/api/src/shared/modules/imports/bulk-import-strategy.registry.ts
@Injectable()
export class BulkImportStrategyRegistry {
  private readonly strategies: Map<BulkImportEntityType, IImportStrategy>;

  get(entityType: BulkImportEntityType): IImportStrategy {
    const strategy = this.strategies.get(entityType);
    if (!strategy) throw new BadRequestException(`No import strategy for ${entityType}`);
    return strategy;
  }
}
```

**Also seen in:** `PricingCalculatorStrategy` (billing); `WhatsApp provider` switching (whatsapp).
**Avoid:** `switch (entityType) { case 'PATIENT': …; case 'DOCTOR': … }` — use a registry map instead.

### 4.5 Anti-corruption Layer (Adapter)

**Translates between bounded contexts.** The `BaseRepository` translates Prisma delegate errors into domain exceptions.

```ts
// apps/api/src/shared/common/repositories/base.repository.ts
export abstract class BaseRepository<T, TCreate = Record<string, unknown>> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  protected get model(): RepositoryModelDelegate {
    const delegate = Reflect.get(this.prisma, this.modelName);
    if (!this.isRepositoryModelDelegate(delegate)) {
      throw new Error(`Model delegate '${this.modelName}' is unavailable`);
    }
    return delegate;
  }
}
```

**Also seen in:** `appointment.mapper.ts` (Prisma → domain object); `invoice.mapper.ts`.
**Avoid:** Leaking Prisma error types (`PrismaClientKnownRequestError`) into a controller or service — let the anti-corruption layer translate them to domain exceptions.

### 4.6 Observer / Event Emitter

**Domain events decouple side effects from the command that triggers them.**

```ts
// Emitter (in a command service)
this.eventEmitter.emit('appointment.created', new AppointmentCreatedEvent(appointment));

// Listener (in audit module)
@OnEvent('appointment.created')
async handleAppointmentCreated(event: AppointmentCreatedEvent) {
  await this.auditService.log('APPOINTMENT_CREATED', { appointmentId: event.appointment.id });
}
```

**Also seen in:** `AuditEvent.listener.ts`, `InvoiceEvents.listener.ts`, `WhatsAppEvent.listener.ts`.
**Avoid:** Calling `this.whatsappService.sendNotification()` directly inside a command method. Emit an event and let a listener handle it.

### 4.7 Decorator (cross-cutting)

**Attach additional responsibilities to objects statically.** NestJS decorators are used for auth, tenant scoping, audit, and subscription checks.

```ts
// apps/api/src/shared/modules/auth/decorators/clinic-scoped.decorator.ts
@Controller('patients')
@ClinicScoped()  // ← tenant middleware — no clinic ID guessing
export class PatientsController {
  @Get()
  @Roles(Role.DOCTOR, Role.ADMIN)
  @RequireFeature(Feature.BASIC_PATIENT_MANAGEMENT)
  async findAll() { /* … */ }
}
```

**Also seen in:** `@EmergencyAccess()`, `@SkipSubscriptionCheck()`, `@AuditLog()`.
**Enforced by:** `pnpm check:controller-rbac` — each route handler must have a declared auth posture.
**Avoid:** Duplicating auth checks across methods. Use `@Roles(Role.ADMIN)` at the class or method level.

### 4.8 Template Method

**Define the skeleton of an algorithm; defer steps to subclasses.**

```ts
// apps/api/src/shared/modules/document-generation/pdf/pdf-generator.service.ts
export abstract class PdfGeneratorService {
  async generate(data: unknown): Promise<Buffer> {
    const content = this.renderContent(data);       // ← subclass implements
    const layout = this.applyLayout(content);        // ← subclass implements
    return this.signAndCompress(layout);             // ← fixed in base class
  }

  protected abstract renderContent(data: unknown): PdfContent;
  protected abstract applyLayout(content: PdfContent): PdfDocument;
}
```

**Also seen in:** `ClinicalInvoicePdfService`, `PrescriptionPdfService`.
**Avoid:** Duplicating the `signAndCompress` step in each PDF generator — put it in the base class.

### 4.9 Factory

**Creates objects without exposing creation logic.**

```ts
// apps/api/src/shared/modules/fhir/factories/fhir-appointment.factory.ts
export class FhirAppointmentFactory {
  static create(appointment: Appointment, patient: Patient): fhir.Appointment {
    return {
      resourceType: 'Appointment',
      id: appointment.id,
      status: this.mapStatus(appointment.status),
      participant: [
        { actor: { reference: `Patient/${patient.id}` } },
        { actor: { reference: `Practitioner/${appointment.doctorId}` } },
      ],
    };
  }
}
```

**Also seen in:** Test stub factories (`stubUseCase` in spec files); `FhirPatientFactory`, `FhirObservationFactory`.
**Avoid:** Complex constructor calls scattered across tests — use a factory function.

### 4.10 Pure Rules / Calculator

**Deterministic business logic with no DI, no I/O, only standalone unit tests.**

```ts
// apps/api/src/domains/appointments/core/domain-services/appointment-interval-overlap.ts
export function appointmentsOverlap(
  existing: Array<{ start: Date; end: Date }>,
  candidate: { start: Date; end: Date },
): boolean { /* pure logic */ }
```

**Also seen in:** `patient-metrics.rules.ts`, `medication-dose-helpers.ts`, `recommend-tier.ts`.
**Enforced by:** `pnpm check:domain-rules-tests` — rules must have a test file.
**Avoid:** Injecting `PrismaService` or `Logger` into a calculator — it makes testing harder and violates KISS.

### 4.11 Container / Presentational (Frontend)

**Separate data orchestration from rendering.** A container (or custom hook) owns state and side effects; a presentational component receives props and emits events.

```tsx
// Container/hook — orchestrates
function usePatientMetricsUI(patientId: string) {
  const { data, isLoading } = usePatientMetricCategories(patientId);
  const { mutate } = useRecordPatientMetricValue(patientId);
  return { categories: data ?? [], loading: isLoading, recordValue: mutate };
}

// Presentational — renders
function MetricsTrackingCard({ loading, categories, onToggleTracked }: MetricsTrackingCardProps) {
  return <Card>/* only JSX */</Card>;
}
```

**Avoid:** A single `.tsx` file with `useEffect`, `useState`, `fetch`, and a 200-line render function.

### 4.12 Provider / Context (Frontend)

**Share state across the component tree without prop drilling.**

```tsx
// apps/app/src/providers/react-query-provider.tsx
export function DataAccessBridge({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const client = useMemo(() => createApiClient(session), [session]);
  return (
    <DataAccessProvider client={client}>
      {children}
    </DataAccessProvider>
  );
}
```

**Also seen in:** `ClinicProvider`, `ThemeProvider`, `QueryProvider`.
**Avoid:** A single context object with 20 fields — split by concern (auth, clinic, theme, query).

### 4.13 Custom Hooks (Frontend)

**Reusable stateful logic in a function.**

```ts
// packages/hooks/src/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

**Also seen in:** `use-toggle.ts`, `use-keyboard-shortcuts.ts` (from `packages/hooks`); `use-onboarding-draft.ts` (24h TTL localStorage persistence).
**Avoid:** Putting data fetching in a generic reusable hook — that belongs in `packages/data-access`.

### 4.14 Page Shell Composition (Frontend)

**Every page follows the same scaffold.** The `AppPageScaffold → PageHeader → DataState → Content` stack is the canonical page shape.

```tsx
<AppPageScaffold>
  <PageHeader title="Patients" description="Manage patient records" />
  <DataState status={status} loadingMessage="Loading patients…" onRetry={refetch}>
    <PatientTable />
  </DataState>
</AppPageScaffold>
```

**Also seen in:** Every route under `apps/app/src/`.
**Avoid:** Missing `AppPageScaffold` or `DataState` — reviewers should block merges that skip these.

### 4.15 Compound Component (Frontend)

**A set of components that work together implicitly.** `FormFieldGroup` provides the label + input + error message as one composable unit.

```tsx
// packages/ui/src/components/form/form-field-group.tsx
export function FormFieldGroup({ label, error, children }: FormFieldGroupProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
// Usage:
<FormFieldGroup label="Full Name" error={errors.name?.message}>
  <Input {...register('name')} />
</FormFieldGroup>
```

**Also seen in:** `Select` + `SelectTrigger` + `SelectContent`; `Dialog` + `DialogTrigger` + `DialogContent`.
**Avoid:** Duplicating the label/error pattern in every form — use `FormFieldGroup`.

### 4.16 Draft / Persistence with Expiry (Frontend)

**Persist unsaved form data to localStorage with a TTL so users don't lose progress.**

```ts
// apps/app/src/features/setup/components/onboarding/forms/use-onboarding-draft.ts
const DRAFT_KEY_PREFIX = 'onboarding_draft_';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export function useOnboardingDraft(onboardingId: string) {
  const save = (data: OnboardingFormData) => {
    localStorage.setItem(
      `${DRAFT_KEY_PREFIX}${onboardingId}`,
      JSON.stringify({ data, expiry: Date.now() + DRAFT_TTL_MS }),
    );
  };
  const load = (): OnboardingFormData | null => {
    const raw = localStorage.getItem(`${DRAFT_KEY_PREFIX}${onboardingId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expiry) { localStorage.removeItem(/* … */); return null; }
    return parsed.data;
  };
  return { save, load, clear: () => localStorage.removeItem(/* … */) };
}
```

**Avoid:** Storing session data without an expiry check — stale drafts can confuse users.

### 4.17 Gate / Guard Components (Frontend)

**Conditionally render children based on feature access or role.** `FeatureGate` wraps a feature-tied region.

```tsx
// apps/app/src/components/auth/feature-gate.tsx
<FeatureGate feature={Feature.WHATSAPP_MESSAGING}>
  <WhatsappSenderSettings />
</FeatureGate>
```

```tsx
// apps/app/src/components/auth/feature-gate.tsx + apps/app/src/hooks/use-permissions.ts
<FeatureGate feature={Feature.X}>…</FeatureGate>
{/* role checks via usePermissions().canAccess(Feature.X) / route-tree guards */}
```

**Also seen in:** `<Can>` (unified gate), `<AuthGuard>`, `usePermissions().canAccess(Feature.X)` in the `src/App.tsx` route-tree guards.
**Avoid:** `{subscription?.tier !== "STARTER" && <WhatsappSection />}` — use `<FeatureGate feature={Feature.WHATSAPP_MESSAGING}>` instead.

---

## Part 5 — Enforcement Map

| Principle / Pattern | Command | What it catches | Auto / Review |
|---|---|---|---|
| **Layering / DDD** | `pnpm check:prisma-boundary` | `@prisma/client` imports outside `packages/db` and repository layer | Auto |
| **Circular imports** | `pnpm check:circular:enforce` | Import cycles (2 allowlisted `forwardRef` cycles excluded) | Auto |
| **Repository + thin controller** | `pnpm check:controller-cqs` | Controllers that use write tokens for read-only operations | Auto |
| **Facade / CQS** | `pnpm check:facade-delegation --enforce` | Large application services that embed persistence instead of delegating | Auto |
| **Zod-first / contracts** | `pnpm check:contracts-strict` + `pnpm check:type-duplicates` | Duplicate DTO shapes; shared Zod schemas not used | Auto |
| **Data access (frontend)** | `pnpm check:frontend-fetch` | Raw `fetch()` calls in feature code | Auto |
| **SSOT composition** | `pnpm check:patient-name-ssot` | Inline `firstName + lastName` instead of `getPatientFullName()` | Auto |
| **Feature / package boundaries** | `pnpm check:feature-boundaries` + `pnpm check:package-boundaries` | Cross-feature and cross-package import violations | Auto |
| **Tier / feature gating** | `pnpm check:tier-comparisons` + `pnpm check:workspace-profile-gating` | Numeric tier comparisons; legacy `workspaceProfile` symbols | Auto |
| **RBAC** | `pnpm check:controller-rbac` | Route handlers with no declared auth posture (`@Roles`, `@Public`, etc.) | Auto |
| **File size backstop** | `pnpm check:file-size-budget` | API services and frontend features exceeding 400 lines | Auto |
| **SRP / KISS / SOLID** | *No automated check* | Human review — the doc above describes the intent | Review |
| **No new abstraction without duplicate** | *No automated check* | Review against §12.6: is this removing at least one duplicate? | Review |
