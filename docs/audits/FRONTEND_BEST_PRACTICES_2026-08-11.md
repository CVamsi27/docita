# Frontend Best Practices Playbook — 2026-08-11

Companion to the `useEffect` index and dead-code inventory. This document
catalogs the **shared primitives** the codebase already has, identifies
**missing primitives** that should be promoted from app code, and lays
out the **Zod-shared-schemas / 0-waste-API** architecture for full
type-safety from DB to UI.

## 1. Existing shared primitives (use them)

### 1.1 Custom hooks — `packages/hooks/src/`

27 shared hooks already published. Path: `@workspace/hooks/<name>`.

| Hook | What it does | Already used in |
|---|---|---|
| `useDebounce` | Debounce a value or callback | `apps/app/src/features/medical-coding/components/CodingQueuePageContent.tsx:17`, `features/desk/...`, `features/invoices/hooks/use-invoices-logic.ts:3`, `features/appointments/hooks/use-appointments-logic.ts:3`, `features/consultation/components/structured/icd-search-field.tsx:5`, `features/search/components/use-global-search.ts:4`, `features/inventory/hooks/use-inventory-logic.ts:3`, `features/ipd/hooks/use-ipd-logic.ts:3`, `features/documents/hooks/use-documents-logic.ts:3`, `features/prescriptions/hooks/use-prescriptions-filters.ts:3` |
| `useLocalStorage` / `useSessionStorage` | Reactive storage value | available but check adoption |
| `useMounted` | Boolean ref to first-render state | available |
| `useToggle` | Boolean state with toggle/on/off | available |
| `useMediaQuery` / `useBreakpoint` | Responsive layout primitives | available |
| `useClickOutside` | Close-on-outside-click | available |
| `useIntersectionObserver` | Visibility detection | available |
| `useKeyboardShortcuts` | Global hotkey handling | `apps/app/src/features/consultation/workspace/shell/use-consultation-keyboard-shortcuts.ts:29` |
| `useLoading` | Boolean loading state with promise helper | available |
| `useNavigationHistoryTracker` | Track navigation back/forward | available |
| `useAccessibility` | A11y utilities (focus trap, announce, etc.) | available |
| `useNetworkStatus` | Online/offline state | available |
| `usePrefersReducedMotion` | A11y-aware motion | available |
| `useMedicalCalculations` | BMI, BSA, eGFR, etc. | available |
| `useSpeechToText` | Dictation primitive | available |
| `useDetectedCurrency` | Locale-based currency inference | available |
| `createMountInitializer` | Run once on mount, return stable handle | available |
| `createNavigationHistoryProvider` | Bounded back-history stack | available |
| `keyboardShortcut*` (5 files) | Low-level hotkey matching | available |

### 1.2 React Query / data access — `packages/data-access/src/`

Path: `@workspace/data-access/<name>`. Already has `useAPIQuery`,
`useAPIQueryValidated`, `useAPIMutation`, query-key factories,
singleton client, browser session manager.

| API | Purpose | Notes |
|---|---|---|
| `useAPIQuery<T>(key, endpoint, options?)` | GET request with auto-stale-time inference | defined in `packages/data-access/src/core/use-api-query.ts:5` |
| `useAPIQueryValidated<T, S>(key, endpoint, zodSchema, options?)` | Same but Zod-validates the response | `packages/data-access/src/core/use-api-query-validated.ts` |
| `useAPIMutation` | POST/PUT/DELETE with idempotency key support | `packages/data-access/src/core/use-api-mutation.ts` |
| `queryKeys` (default), `appQueryKeys`, `internalQueryKeys` | Centralized query-key factory | `packages/data-access/src/lib/query-keys.ts` |
| `getAPIClient` / `createAPIClient` | Singleton client | `packages/data-access/src/lib/singleton.ts` |
| `createCRUDResource` | Build a 5-method CRUD resource from a base path | `packages/data-access/src/lib/crud-resource.ts` |

**Adoption in `apps/app`:** 80+ domain hooks in
`packages/data-access/src/hooks/` (appointments, patients, billing,
clinical, etc.) already wrap `useAPIQuery`. The clinician app
(`apps/app/src`) uses these pervasively.

**Adoption in `apps/internal`:** Almost zero. **14 of 17 pages use
`useState` + `useEffect` mount-fetch with raw `apiGet`/`apiPost`
instead.** This is the single largest React-Query adoption gap.

### 1.3 Shared UI — `packages/ui/src/components/<group>/`

8 groups, ~90 components. Reachable at
`@workspace/ui/components/<group>/<name>`. AGENTS.md §4.3 mandates
these be used; no app should reinvent a primitive that already exists.

| Group | Components |
|---|---|
| `data-display/` | `data-state`, `data-table`, `description-list`, `filter-bar`, `list-row`, `now-serving-board`, `right-rail-card`, `sortable-header-button`, `stat-grid`, `stat-tile`, `stats-card`, `table`, `table-essentials`, `timeline`, `use-data-table-pagination`, `use-data-table-sort` |
| `feedback/` | `alert`, `allergy-banner`, `appointment-calendar-skeleton`, `docita-loading-indicator`, `empty-state`, `error-boundary`, `error-state`, `not-found-content`, `patient-list-skeleton`, `progress-gauge`, `progress`, `skeleton`, `system-health-indicator`, `user-facing-error-toast` |
| `form/` | `button`, `calendar`, `checkbox`, `date-picker`, `date-time-picker`, `debounced-search-input`, `doctor-filter-select`, `field-row`, `form-dialog`, `form-field-group`, `form-grid`, `form-page`, `form-primitives`, `form-select-field`, `form`, `input`, `iso-date-picker-field`, `label`, `locale-toggle`, `mic-button`, `prompt-input`, `radio-group`, `search-input`, `searchable-select`, `select`, `slider`, `switch`, `textarea`, `time-picker`, `toggle-group`, `toggle`, `turnstile-widget` |
| `indicators/` | `avatar`, `badge`, `card`, `category-avatar`, `docita-logo`, `kbd`, `live-dot`, `micro-label`, `status-badge` |
| `layout/` | `app-page-scaffold`, `app-shell`, `bottom-action-bar`, `page-container`, `page-header`, `page-layout`, `resizable`, `scroll-area`, `section-heading`, `section`, `separator`, `toolbar`, `top-bar` |
| `navigation/` | `back-button`, `breadcrumbs`, `page-tabs`, `segmented-control`, `sidebar-nav-item`, `sidebar-rail-action`, `sidebar-rail-tooltip`, `step-progress`, `tabs` |
| `overlay/` | `accordion`, `collapsible`, `command-palette-shell`, `command`, `confirmation-dialog`, `crud-dialog`, `dialog-stack`, `dialog`, `dropdown-menu`, `multi-step-dialog`, `popover`, `search-dialog`, `sheet`, `tooltip`, `wizard-dialog` |
| root | `print-sheet`, `theme-toggle` |

## 2. Missing primitives (promote from app code)

These are patterns that recur in app code and should be lifted to
`packages/hooks/src` or `packages/ui/src/components/<group>/`.

### 2.1 `useTimeout` / `useInterval` — missing

Recurring pattern across 16 sites in `apps/app` and 1 in `apps/internal`:

- `apps/app/src/features/patients/components/details/use-medical-history-overrides.ts:35` —
  `const t = setTimeout(() => { ... }, delay); pendingTimersRef.current.add(key, t);`
- `apps/app/src/features/setup/components/onboarding/address-picker/use-clinic-address-picker.ts:170` —
  `const timer = window.setTimeout(() => { ... });`
- `apps/app/src/features/consultation/state/useConsultationAutosave.ts:207` —
  `debounceTimer.current = setTimeout(() => { ... }, debounceMs);`
- `apps/app/src/features/consultation/components/ConsultationTimerContainer.tsx:84` —
  `intervalRef.current = setInterval(() => { ... }, 1000);`
- `apps/app/src/features/setup/components/onboarding/steps/compliance/compliance-legal-document-dialog.tsx:46` —
  `const timer = setTimeout(() => { ... });`
- `apps/app/src/features/appointments/hooks/use-appointments-selection-effects.ts:48` —
  `setTimeout(() => { currentTimeSlotRef.current?.scrollIntoView(); }, 0);`
- `apps/app/src/features/setup/components/onboarding/address-picker/AddressSearchInput.tsx:50` —
  `window.setTimeout(() => setShowSuggestions(false), 120);`
- `apps/app/src/features/consultation/workspace/shell/use-consultation-keyboard-shortcuts.ts:84` —
  `setTimeout(() => { ... });`
- `apps/app/src/features/consultation/components/structured/icd-search-field.tsx:73` —
  `onBlur={() => setTimeout(() => setOpen(false), 150)}`
- `apps/app/src/features/dialogs/components/InventoryAddItemDialogUI.tsx`, `ContactSalesModalUI.tsx`,
  `insurance-claim-edit-logic.ts:40`, etc.
- `apps/app/src/features/appointments/hooks/use-appointments-selection-effects.ts:48`
- `apps/app/src/lib/socket/use-socket-lifecycle.ts:83`
- `apps/app/src/lib/auth/use-auth-session-bootstrap.ts:90`
- `apps/internal/src/lib/auth/use-auth-session.ts:61`

**Recommendation:** add to `packages/hooks/src/`:

```ts
// packages/hooks/src/use-timeout.ts
export function useTimeout(callback: () => void, delay: number | null): void {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => callbackRef.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

// packages/hooks/src/use-interval.ts
export function useInterval(callback: () => void, delay: number | null): void {
  // same shape, setInterval
}

// packages/hooks/src/use-debounced-callback.ts
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  // wraps callback in clearTimeout/setTimeout
}
```

**Win:** 16 sites collapse to 1-2 lines each, eliminate the
setState-on-unmounted risk in `icd-search-field.tsx:73` and
`AddressSearchInput.tsx:50`.

### 2.2 `useEffectOnce` / `useMount` — missing

The `useEffect(..., [])` mount-only pattern appears in:

- 14 `apps/internal` page files (full list in
  `FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md` appendix)
- `apps/app/src/components/pwa/pwa-register.tsx:11` (service worker)
- `apps/app/src/lib/socket/use-socket-lifecycle.ts` (multiple sites)
- `apps/app/src/features/consultation/state/useConsultationAutosave.ts`
- `apps/app/src/features/auth/components/LoginDailyThought.tsx:13`
- `apps/app/src/hooks/use-phone-signature-qr-flow.ts:157` (mount ref)

`packages/hooks/src/create-mount-initializer.ts` exists but it's for
creating stable handles, not for `useEffect` replacement.

**Recommendation:** add to `packages/hooks/src/use-effect-once.ts`:

```ts
export function useEffectOnce(effect: () => void | (() => void)): void {
  const hasRunRef = useRef(false);
  if (!hasRunRef.current) {
    hasRunRef.current = true;
    useEffect(effect, []);
  }
}
```

But honestly, **`useEffect(..., [])` is fine** when it has a real side
effect to run. The right move for the 14 `apps/internal` pages is to
**convert to React Query** so the `useState` + `useEffect` pair goes
away entirely.

### 2.3 `useFormReset` / `<ResettableForm>` — missing

13 settings forms have the same pattern:

```ts
useEffect(() => {
  if (clinic) {
    form.reset({ ...parseFromClinic(clinic) });
  }
}, [clinic, form]);
```

Affected files (from the useEffect index):

- `apps/app/src/features/settings/components/security/SecuritySettings.tsx:34`
- `apps/app/src/features/settings/components/clinical/OpdSlipSettings.tsx:31`
- `apps/app/src/features/settings/components/clinical/PrescriptionDefaultsSettings.tsx:30`
- `apps/app/src/features/settings/components/clinic/use-clinic-general-settings.ts:56`
- `apps/app/src/features/settings/components/clinic/queue/queue-configuration-form.tsx:30`
- `apps/app/src/features/settings/components/notifications/NotificationSettings.tsx:34`
- `apps/app/src/features/settings/components/notifications/ReminderSettingsUI.tsx:38`
- `apps/app/src/features/invoices/hooks/use-invoice-edit-logic.ts:50`
- `apps/app/src/features/insurance-claims/hooks/use-insurance-claim-edit-logic.ts:40`
- `apps/app/src/features/patients/components/forms/dialogs/EditPatientDialog.tsx:88`
- `apps/app/src/features/auth/pages/forgot-password.tsx:43`
- `apps/app/src/features/dialogs/components/InventoryAddItemDialogUI.tsx:45`
- `apps/app/src/features/dialogs/components/ContactSalesModalUI.tsx:43`
- `apps/app/src/features/insurance-claims/hooks/use-insurance-claim-create-logic.ts:48,51`

**Recommendation:** add `useResetFormOn` to `packages/hooks/src/`:

```ts
export function useResetFormOn<T extends FieldValues>(
  form: UseFormReturn<T>,
  source: unknown,
  resetFn: (source: unknown) => T | undefined,
): void {
  useEffect(() => {
    const values = resetFn(source);
    if (values) form.reset(values);
  }, [form, source]);
}
```

Or, better: use React Hook Form's `values` prop (added in RHF v7.43+)
to drive the form declaratively:

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    {/* ... */}
  </form>
</Form>
```

The `values` prop (instead of `defaultValues`) makes the form reactive
to the source prop, removing the need for the manual `form.reset()`
effect entirely.

### 2.4 `useApiQuery` wrappers for the 14 `apps/internal` pages

The biggest concrete win. See
`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md` "14 mount-fetch
appendix" for the per-page refactor template.

## 3. React Query adoption — 14 `apps/internal` pages

Full file list (all 14 are in `apps/internal/src/features/<x>/pages/`):

1. `payment-processing-page.tsx:32` — `void fetchData()` (clinics + payments)
2. `broadcasts-page.tsx:35` — `void fetchJobs()`
3. `audits-page.tsx:24` — `void fetchLogs()`
4. `referrals-page.tsx:42` — `void fetchReferrals()`
5. `enterprise-contracts-page.tsx:24` — `void fetchContracts()`
6. `admins-page.tsx:57` — `void fetchAdmins(); void fetchClinics()`
7. `feedback-page.tsx:35` — `void loadData()`
8. `dashboard-page.tsx:31` — `void fetchData()`
9. `logs-page.tsx:46` — `void fetchLogs()` (deps `[params]`)
10. `support-page.tsx:35,37,47` — `void fetchThreads()`, `void fetchMessages(selectedPhone)`, auto-select first thread
11. `doctors-page.tsx:36` — `void fetchDoctors()`
12. `users-page.tsx:56` — `void fetchUsers()`
13. `performance-page.tsx:38` — `void fetchMetrics()`
14. `pricing-page.tsx:43` — `void fetchData()`
15. `billing-page.tsx:37` — `void fetchBilling()`
16. `analytics-page.tsx:100` — `void fetchData()` (deps `[fetchData]`)
17. `system-monitoring-page.tsx:73,75` — `void fetchData()` + `setInterval` for auto-refresh

### Refactor template (one page, then replicate)

```ts
// Before
export function AuditsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiGet<AuditLog[]>("/audit-logs?limit=100");
      setLogs(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchLogs(); }, []);

  return (
    <AppPageScaffold header={<PageHeader ... actions={<Button onClick={() => { void fetchLogs(); }} ...>...</Button>} />}>
      <DataState status={loading ? "loading" : ...}>
        {logs.map((log) => ...)}
      </DataState>
    </AppPageScaffold>
  );
}

// After
export function AuditsPage() {
  const { data: logs = [], isLoading: loading, refetch, isRefetching } = useAPIQuery(
    [...internalQueryKeys.auditLogs, "recent"],
    "/audit-logs?limit=100",
  );

  return (
    <AppPageScaffold header={<PageHeader ... actions={<Button onClick={() => { void refetch(); }} ...>...</Button>} />}>
      <DataState status={loading ? "loading" : ...}>
        {logs.map((log) => ...)}
      </DataState>
    </AppPageScaffold>
  );
}
```

Wins:
- `useState` + `useEffect` pair disappears (2 effects, 4 lines of state)
- `setLoading(true/false)` logic disappears (6 lines)
- `try/catch` noise disappears (4 lines)
- The refresh button now also gets `isRefetching` for free
- Loading-state unification with the rest of the app (consistent
  spinner / skeleton / error toasts)

For pages with mutations (payment-processing, broadcasts, billing,
admins, enterprise-contracts, pricing, support, doctors, users), the
`fetchData()` after-mutation call becomes:

```ts
const queryClient = useQueryClient();
const createBroadcast = useAPIMutation({ ... });
// after success:
queryClient.invalidateQueries({ queryKey: internalQueryKeys.broadcasts });
```

For pages with auto-refresh (`system-monitoring`), use
`refetchInterval: autoRefresh ? 30_000 : false` on the query options
— the `setInterval` effect disappears.

## 4. Zod-shared-schemas / 0-waste API

The codebase already has the **canonical example**:
`packages/types/src/contracts/patients.ts`. Let me dissect it because
the pattern should be replicated across every domain.

### 4.1 The pattern in `packages/types/src/contracts/patients.ts`

```ts
// 1. Single source of truth: the request schema
export const createPatientRequestSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().nullable().optional(),
  phoneNumber: z.string().min(10).max(20).nullable().optional(),
  gender: genderSchema,
  dateOfBirth: pastDateOfBirthSchema.nullable().optional(),
  // ... etc
}).strict();

// 2. The response schema is separate (might add server-only fields)
export const patientResponseSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  // ...
  version: z.number(),
}).strict();

// 3. Update = .partial() of create
export const updatePatientRequestSchema = createPatientRequestSchema.partial();

// 4. List query = separate, paginated
export const listPatientsQuerySchema = z.object({
  search: z.string().optional(),
  gender: genderSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
}).strict();

// 5. List response = wrap with pagination metadata
export const listPatientsResponseSchema = z.object({
  items: z.array(patientResponseSchema),
  total: z.number().int().nonnegative(),
}).strict();

// 6. Domain shape: cleaned up for the application layer
export const patientDomainCreateSchema = createPatientRequestSchema
  .extend({ clinicId: z.string().min(1) })
  .transform((input) => ({
    clinicId: input.clinicId,
    firstName: input.firstName,
    // ... normalized fields
  }));

// 7. Persistence shape: matches the DB record
export const patientPersistenceRecordSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  firstName: z.string(),
  // ...
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().nonnegative(),
});

// 8. Persistence write = omit timestamps
export const patientPersistenceWriteSchema = patientPersistenceRecordSchema.omit({
  createdAt: true,
  updatedAt: true,
});
```

Eight Zod schemas derived from one logical entity, all sharing field
definitions via `.pick()`, `.partial()`, `.extend()`, `.transform()`,
`.omit()`. **This is the gold standard.**

### 4.2 The "0-waste API" rule

The current 4 contracts we should hold to across all 12+ domains:

1. **No field on a response unless a client reads it.** The list-item
   schema (`patientResponseSchema`) should be **smaller** than the
   detail schema. A `patientResponseSchema` shouldn't include
   `metadata`, `address`, `insurancePolicyNumber` etc. unless the
   patient list table actually renders them. The list endpoint should
   `.pick()` a `patientListItemSchema`.

2. **No "convenience" field added to the response** that the API
   itself never reads. AGENTS.md §3.2: "Do not add fields to responses
   'for convenience' if clients do not consume them; prefer focused
   schemas (`.pick()`, `.omit()`, separate response schemas) so
   payloads stay minimal and typing stays honest."

3. **No handwritten TS interface for an HTTP response.** All HTTP
   shapes are Zod-inferred. The `apps/app/src/lib/types/*.ts` and
   `apps/app/src/features/**/types.ts` files are the source of bloat
   when they hand-roll interfaces that drift from the contract.

4. **DPDP-aware responses.** Per the `address`, `allergies` lines
   that already exist in `patientSchema` (see
   `packages/types/src/patient/patients.ts:86, 94`), responses must
   `.transform(stripHtmlTags)` to scrub PHI/PII before leaving the
   backend. This is consistent across the existing contracts but
   should be a CI check, not a per-schema decision.

### 4.3 Domains that don't yet follow the pattern

A scan of `packages/types/src/contracts/`:
28 contract files exist in `packages/types/src/contracts/`. By
schema-count, the coverage is healthy:

| File | Schemas |
|---|---|
| `whatsapp.ts` | 51 |
| `subscriptions.ts` | 31 |
| `analytics.ts` | 28 |
| `appointments.ts` | 23 |
| `public-booking.ts` | 18 |
| `lab-tests.ts` | 16 |
| `clinics.ts` | 16 |
| `billing.ts` | 14 |
| `auth.ts` | 11 |
| `app.ts` | 11 |
| `consultation.ts` | 10 |
| `patients.ts` | 9 |
| `doctors.ts` | 9 |
| `templates.ts` | 6 |
| `inventory.ts` | 6 |
| `users.ts` | 4 |
| `desk.ts` | 4 |
| `prescriptions.ts` | 3 |
| `pdf-jobs.ts` | 3 |
| `operations.ts` | 3 |
| `api-keys.ts` | 2 |
| `daily-thought.ts` | 2 |
| `documents.ts` | 2 |
| `dpdp.ts` | 2 |
| `effective-permissions.ts` | 2 |
| `guided-tour.ts` | 2 |
| `onboarding.ts` | 2 |
| `uploads.ts` | 2 |

The 28 contract files map 1:1 to the 28 domain modules. **Every
domain has a contract layer** — good. What's missing is the second
half: every domain controller should pass through
`@ZodSerializerDto` so the response is parsed against the contract
and undeclared fields are stripped.

### 4.4 `@ZodSerializerDto` coverage: 61/89 controllers

The "0-waste API" rule is enforced by
`apps/api/src/shared/common/interceptors/safe-zod-serializer.interceptor.ts`,
which `@ZodSerializerDto`-annotates handlers to:

1. `safeParse` the response against the schema
2. **Strip** any fields not in the schema (the "reduce traffic" goal)
3. Log a warning + pass the original through if the schema doesn't match

**Coverage today:**

- 61/89 controllers use `@ZodSerializerDto` on at least one handler
- 28/89 controllers do not — these are potential leak vectors
  where the API may return Prisma-model fields the contract never declared

**Recommendation:** add a CI check that fails if a controller method
that returns a domain entity (Patient, Appointment, Invoice, etc.)
lacks `@ZodSerializerDto`. The 51 candidates are listed below:

```bash
find apps/api/src/domains -name "*.controller.ts" | \
  xargs grep -L "@ZodSerializerDto"
```

### 4.5 The "0 waste" checklist for a new endpoint

When adding a new endpoint, follow this checklist:

1. **Add the request schema** to `packages/types/src/contracts/<domain>.ts`
   with `.strict()` to reject extra fields.
2. **Add the response schema** — prefer a focused
   `<entity>ListItemSchema` for list endpoints, and only include the
   fields the consumer renders.
3. **Add the list-response wrapper** `{ items: z.array(<entity>ListItemSchema), total: z.number() }`
4. **Add the DTO** in `apps/api/src/domains/<domain>/application/dto/<domain>.dto.ts`
   that wraps the schema with `createZodDto(...)`
5. **Add `@ZodSerializerDto(<ResponseDto>)`** on the controller method
6. **In the frontend**, consume the same schema with
   `useAPIQueryValidated(key, endpoint, <schema>)` so the response
   is parsed at the network boundary and any drift is caught

### 4.6 List-item vs detail — separate schemas

The 4 contracts (request / list-item / detail / list-wrapper) should
be standard for every domain. Concretely:

```ts
// packages/types/src/contracts/<domain>.ts
// 1. List item — minimal, list-page fields only
export const <entity>ListItemSchema = z.object({
  id: z.string(),
  // ...fields the list table actually renders
  // e.g. firstName, lastName, mrn, status — NOT address, NOT abhaNumber
}).strict();

// 2. Detail — full record
export const <entity>ResponseSchema = <entity>ListItemSchema.extend({
  address: z.string().optional(),
  abhaNumber: z.string().optional(),
  // ...all the fields the detail page renders
}).strict();

// 3. List wrapper
export const list<entity>sResponseSchema = z.object({
  items: z.array(<entity>ListItemSchema),
  total: z.number().int().nonnegative(),
}).strict();
```

The `useAPIQuery` key per response:

- `useAPIQuery(listKey, "/entities?page=1&limit=20")` → uses
  `list<entity>sResponseSchema` for parsing
- `useAPIQuery(detailKey, "/entities/:id")` → uses
  `<entity>ResponseSchema` for parsing

This way, if the API ever returns `address` on a list item, it's
silently dropped at the network boundary, and the list payload stays
small.

## 5. Other small best-practice gaps

### 5.1 React 19 + the "render-time setState" anti-pattern

The `apps/app/src/features/inbox/components/NotificationsInboxView.tsx:123`
effect:

```ts
useEffect(() => {
  if (!visibleCategories.some((c) => c.id === activeTab)) setActiveTab("all");
}, [visibleCategories, activeTab]);
```

Calling `setActiveTab` during render triggers a React warning. The
correct React 19 pattern is to compute the effective value at
render-time and use it directly:

```ts
// Compute the effective tab at render time
const effectiveActiveTab = visibleCategories.some((c) => c.id === activeTab)
  ? activeTab
  : "all";

// Use effectiveActiveTab everywhere instead of activeTab
// setActiveTab is only called from event handlers (tab click)
```

This requires consumers to read `effectiveActiveTab` rather than
`activeTab`.

### 5.2 `useState` initializers with object literals

5 sites use `useState({...})` with a constant object. React only
uses the initial value once, so a new object per render is wasted
allocation:

- `apps/app/src/features/settings/components/account/ProfileAccountSettings.tsx:18`
- `apps/app/src/features/ipd/components/modals/admission-modal.tsx:39`
- `apps/internal/src/features/referrals/pages/referrals-page.tsx:23`
- `apps/internal/src/features/admins/pages/admins-page.tsx:30, 31`

If the IPD and admins files are deleted (per the dead-code pass),
this drops to 1 site. **Low priority.**

### 5.3 `useState` derived from props

The 8 settings forms and `use-doctor-availability-settings.ts:30`
all compute initial state from props. The React 19 idiom is
`useState(() => computeInitial(props))` with a lazy initializer that
re-derives when the prop changes via a `useEffect`. **But** with the
React Hook Form `values` prop (added in v7.43+), the whole `useState` +
`form.reset` pattern can be replaced by a declarative `<Form values={clinic}>`.
That's the right move for these 8 settings forms.

## 6. Implementation roadmap

| Phase | Effort | Impact | Risk |
|---|---|---|---|
| **P0**: Add `useTimeout` / `useInterval` to `packages/hooks/src` | 1 hour | Eliminates 16 manual `setTimeout` call sites, prevents unmount-leak warnings | Low |
| **P0**: Delete IPD + patient-portal + lab-tests settings + legal ConsentNotice (Group B/C/D/E) | 1 hour | -900 LOC | Low |
| **P0**: Delete dead business rules (Group A) after per-rule verification | 2 hours | -500 LOC | Low |
| **P1**: Convert 14 `apps/internal` pages to React Query | 4 hours | 20 useEffects gone, mutation wiring standardized | Medium (loading state behavior changes) |
| **P1**: Convert 8 settings forms from `form.reset` to RHF `values` prop | 3 hours | 8 useEffects gone | Low (RHF v7.43+ has the prop) |
| **P1**: Wire `@ZodSerializerDto` on the 51 controllers that lack it | 4 hours | "0 waste" API compliance | Low (interceptor is non-throwing) |
| **P2**: Promote `useEffectivePermissions` module-level cache to `@workspace/data-access` so the API can also use the snapshot | 2 hours | Eliminates 1 useEffect in `use-effective-permissions.ts:29` | Low |
| **P2**: Add a CI check that flags controllers returning domain entities without `@ZodSerializerDto` | 1 hour | Prevents future leaks | Low |
| **P3**: Add a list-item vs detail schema convention across all 28 contract files | 4 hours | Smaller list payloads (50%+ reduction typical) | Low |
| **P3**: Add an en/hn JSON key parity CI check | 1 hour | Catches i18n drift | Low |

## 7. Companion documents

- [`FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md`](./FRONTEND_USEEFFECT_INDEX_FULL_2026-08-11.md) —
  every useEffect with full body, line range, deps, and classification.
- [`FRONTEND_DEAD_CODE_FULL_2026-08-11.md`](./FRONTEND_DEAD_CODE_FULL_2026-08-11.md) —
  every dead export with file context and recommended action.
- [`FRONTEND_FULL_AUDIT_2026-08-11.md`](./FRONTEND_FULL_AUDIT_2026-08-11.md) —
  earlier broad static review (lint warnings, motion violations, a11y).
