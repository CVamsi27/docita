# Docita API Design Standard

> **For agentic workers:** this is the **prescriptive contract** for every new or edited
> HTTP route in `apps/api`. It codifies conventions that already exist in the codebase —
> every rule below cites a live example. For the **descriptive** surface reference (auth,
> per-domain endpoint walkthroughs), see [`API_DOCUMENTATION.md`](API_DOCUMENTATION.md).
> For the Zod-first / HTTP-parity rules that back this document, see
> [`AGENTS.md`](../../AGENTS.md) §3.1–3.2. Where this file and an older doc conflict,
> this file wins for **new** routes; the older doc may lag behind reality and should be
> corrected when you touch it.

---

## 1. Prefix and versioning policy

- Every route lives under a single versioned root: **`/api/v1/<resource>`**.
  This is not written anywhere per-controller — it is composed globally in
  `apps/api/src/main.ts` `configureRouting()`:
  `app.setGlobalPrefix('api')` + `app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })`.
- **Never embed `api` or `v1` in a `@Controller(...)` path.** A controller path is the
  resource name only. Embedding the root is the double-prefix bug class
  (the old `@Controller('api/v1/operations/database')` resolved to
  `/api/v1/api/v1/operations/database` and never matched the client — fixed in `cd3a9c56f`).
- **Version-neutral routes** opt out with `@Controller({ path: 'health', version: VERSION_NEUTRAL })`
  (see `shared/common/controllers/health-check.controller.ts`). Use this only for
  infrastructure probes that must never move.
- **Introducing a new major version** = add controller-level versioning
  (`@Controller({ version: '2' })`) or change `defaultVersion`, and keep v1 alive during a
  migration window. Do not duplicate a route under a second literal prefix.
- Clients resolve the versioned root once (`VITE_API_URL=/api/v1` in both Vite apps) and
  call relative paths (`/patients`, `/internal/clinics`). Server responses must never hand
  back unversioned absolute paths (the one legacy `/api/v1/...` poll URL in
  `shared/modules/queue/pdf-job.service.ts` is a known outlier — prefer version-relative).

## 2. Namespaces inside the root

| Namespace              | Path                   | Gate                                     | Example                                             |
| ---------------------- | ---------------------- | ---------------------------------------- | --------------------------------------------------- |
| Clinician API          | `/api/v1/<resource>`   | auth + tenant + feature guards           | `/api/v1/patients`, `/api/v1/invoices`              |
| Internal ops console   | `/api/v1/internal/*`   | `@InternalApiAccess()` (`Role.INTERNAL`) | `/api/v1/internal/clinics`, `/api/v1/internal/logs` |
| Ops tooling            | `/api/v1/operations/*` | `@Roles(Role.INTERNAL)`                  | `/api/v1/operations/database/*`                     |
| Public unauthenticated | `/api/v1/public/*`     | `@Public()`                              | `/api/v1/public/daily-thought`                      |
| Provider webhooks      | `/api/v1/webhooks/*`   | `@Public()` + signature verification     | `/api/v1/webhooks/whatsapp`                         |

The `/internal/*` and `/public/*` segments are **path namespaces**, not separate prefixes —
they sit under the same versioned root and are still bound by §1.

## 3. Resource naming — plural collections

- **Controller paths are plural, kebab-case nouns**: `patients`, `appointments`, `invoices`,
  `insurance-claims`, `staff-notifications`, `lab-tests`, `follow-ups`, `documents`.
- Route hierarchy is strictly resource-first: `/resources`, `/resources/:id`,
  `/resources/:id/sub-resource`.
- **Documented exceptions (do not copy into new domains):**
  - `feedback` (singular — historical, kept for wire compatibility; do not copy).
  - `whatsapp` (singular **service namespace** — a facade over a third-party capability,
    not a domain collection; sub-resources hang off it: `/whatsapp/operations/*`,
    `/whatsapp/sender`, `/whatsapp/templates/custom`, `/whatsapp/notifications/*`).
  - `health`, `audit` (infrastructure probes / cross-cutting views).
- When two domains share a resource name, keep one path and split controllers by surface
  (`appointments-clinical`, `appointments-schedule`, `appointments-workflow`,
  `appointments-consultation` all mount `@Controller('appointments')`).

## 4. HTTP methods and sub-resource RPC exceptions

**Resource verbs:**

- `GET` list / detail (side-effect free; list = one of the pagination shapes in §6).
- `POST` create → **201** with the created resource.
- `PATCH` partial update / idempotent state change → 200.
- `PUT` full replacement only (`PUT /clinics/:id`, `PUT /reminders/settings`).
- `DELETE` remove → 200 (or 204 when the body is empty).

**No verb URLs.** A path identifies a _resource_, never an action. The HTTP method carries
the action; non-CRUD actions are sub-resource verb routes (§4 below). A top-level verb
segment (`create`, `get`, `update`, `delete`, `list`, `fetch`, `send`, `clear`) is a
conformance failure — there is no `/get-patients`, `/clinic/get-settings`, or
`/delete-staff-notification`. Historical offenders were renamed in `cd3a9c56f`
(`/staff-notifications/delete/:id` → `DELETE /staff-notifications/:id` and
`/staff-notifications/delete-all` → `DELETE /staff-notifications`); do not reintroduce
the pattern.

**Sub-resource RPC exceptions (actions):** operations that are not create/read/update/delete
on a resource are expressed as **verb routes under the resource**:

```text
POST /insurance-claims/:id/transition        # state machine step
POST /appointments/:id/start-consultation    # non-idempotent start
POST /payments/:id/send-whatsapp             # side effect, no created resource
POST /whatsapp/operations/conversations/:id/read
POST /whatsapp/operations/campaigns/:id/cancel
POST /reminders/send/:appointmentId
PATCH /appointments/:id/cancel               # idempotent state change
PATCH /appointments/:id/reschedule
PATCH /follow-ups/:id/complete
PATCH /staff-notifications/mark-read/:id
```

- **Verb choice:** `POST` for non-idempotent, one-way, or external side effects;
  `PATCH` for idempotent state transitions (cancel / complete / mark-read).
  Legacy exceptions where an idempotent action is `POST` (e.g. conversation `read`)
  exist — new code follows the rule, not the exception.
- **Never use `GET` for side effects.** The only `GET` action is the webhook
  verification handshake (§8), which performs no mutation.

## 5. Status-code rules

- **Defaults:** `GET` 200 · `POST` 201 (created) · `PATCH`/`PUT` 200 · `DELETE` 200/204.
- **New action `POST`s that create no resource MUST return 200**, declared explicitly:
  `@HttpCode(HttpStatus.OK)` + `@ApiResponse({ status: 200, ... })`.
  This is the "action POST" class — send / verify / cancel / transition / clear / backup ops.
  Nest's default is 201; if your `@ApiResponse` says 200 but the handler has no
  `@HttpCode(200)`, that is a conformance bug (see the `cd3a9c56f` batch and the
  `database-operations.controller.ts` completion).
- **Existing auth compatibility exception (2026-10-08):** the twelve auth POSTs
  listed in [the API reference](API_DOCUMENTATION.md#existing-auth-success-statuses)
  retain their established HTTP 201 success status. Their Swagger metadata must
  document 201. The approved roadmap selects documentation parity over a wire
  change; changing these statuses requires a separate contract review and paired
  HTTP/client regression evidence. This does not permit mismatched metadata or
  new action POSTs returning 201.
- Apart from that existing-auth exception, **never** return 201 for a side-effect
  action, and never return 200 for a true create of a new resource row.
- **Error codes:** 400 invalid request · 401 unauthenticated · 403 forbidden ·
  404 not found · 409 conflict (idempotency/replay) · 422 validation (or 400 via the
  Zod pipe) · 429 rate-limited · 5xx server. Bodies follow RFC 9457 problem-details
  (see `API_DOCUMENTATION.md` → Error Handling).
- **Webhook endpoints always acknowledge with 200** even when processing fails
  (`webhooks/payments/razorpay` returns `{ status: 'ok', error: ... }` on failure)
  — providers retry on non-2xx; an ack with an error body lets us log without
  triggering provider backoff storms.

## 6. Pagination and list shapes

Three sanctioned shapes — pick by audience and volume:

1. **Cursor pagination** — growing, tenant-scoped collections (patients, claims, clinics):
   response `{ items, nextCursor, hasMore, count }` via `paginateWithCursor`
   (`shared/common/pagination.helper.ts`), query `?cursor&limit` clamped
   **1..100, default 50** (`listClinicsQuerySchema` in `@workspace/types`).
2. **Bounded plain array** — internal-ops console lists that stay a plain array:
   `?limit` parsed with `parsePaginationInt(limit, { min, max }) ?? default`
   (max 200–500 by surface), applied as Prisma `take`. Never an unbounded `findMany`
   (the internal users/admins/feedback lists were capped for exactly this reason).
3. **Offset/limit** — log-style tails only (`?limit&offset`, max 500).

Query ints go through `parsePaginationInt` (never `Number(undefined)` → NaN into Prisma).

## 7. Zod-first contracts

- Request/response shapes are defined **once** in `packages/types` and reused:
  API DTOs via `createZodDto`, responses serialized via `@ZodSerializerDto`,
  unauthenticated payloads parsed with the shared schema + `ZodValidationPipe`.
- No hand-written parallel interfaces for a wire shape (AGENTS.md §3.1–3.2,
  `check:zod-interface-parity`, `check:contracts-strict` enforce this).

## 8. Webhooks namespace

**Shape:** `@Controller('webhooks/<domain>')` + `@Post('<provider>')` (or bare `@Post()`
when the provider owns the domain):

| Path                               | Provider      | Auth                                                 |
| ---------------------------------- | ------------- | ---------------------------------------------------- |
| `/webhooks/whatsapp` (GET + POST)  | Meta WhatsApp | `x-hub-signature-256` HMAC + replay window           |
| `/webhooks/payments/razorpay`      | Razorpay      | `x-razorpay-signature`                               |
| `/webhooks/subscriptions/razorpay` | Razorpay      | `x-razorpay-signature`                               |
| `/webhooks/email/zeptomail`        | ZeptoMail     | shared-secret `Authorization` header (HMAC fallback) |

**Mandatory rules for every webhook controller:**

- `@Public()` — providers cannot send bearer tokens.
- `POST` + `@HttpCode(200)`; always ack 200 (§5) so providers don't retry on our bugs.
- **Signature verification on the raw body** (`req.rawBody`) via `WebhookVerifierService`
  — never parse-then-verify. Reject with 401 on mismatch; return **409** on replayed
  delivery (WhatsApp) so duplicate events are visible.
- Parse the payload through the shared Zod schema (`paymentWebhookPayloadSchema`,
  `HandleWhatsAppWebhookDto`) — a provider payload is an untrusted boundary.
- Handlers are idempotent by event semantics; heavy work may be queued, never awaited
  inside the request beyond the minimum.
- **The `GET` handshake exists only for the Meta subscription verification**
  (`?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...`).
- **Callback URLs are registered with the provider at the full versioned path**
  (`https://api.docita.work/api/v1/webhooks/whatsapp`). Because the provider pins that
  URL, a major-version bump that would move it needs a provider-side callback update +
  migration window — treat `webhooks/*` as version-stable by policy.
- Webhooks are CSRF-exempt by design (no browser session); they still get rate-limit and
  audit consideration like any inbound surface.
- For local testing, ngrok the API and register `https://<ngrok>/api/v1/webhooks/<domain>`
  (see `docs/testing/TESTING.md`).

## 9. Auth and tenant posture

- Every controller declares its posture explicitly — `@Public()`, `@Roles(...)`,
  `@RequireFeature(...)`, or `@InternalApiAccess()` (`check:controller-rbac` fails the
  build otherwise). No controller may silently inherit.
- Tenant scoping comes from the request context (`getClinicStaffRequestContext`,
  `@ClinicScoped`); never derive `clinicId` from the body, and never allow cross-clinic
  reads. `check:auth-tenant-safety` enforces the mechanical part.
- Tier/feature gates use `@RequireFeature(Feature.X)` / `hasFeatureAccess`, never numeric
  tier comparisons (§15.8 in `AGENTS.md`).

## 10. Conformance and automation

| Concern                                 | Command                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| Controller auth posture declared        | `pnpm check:controller-rbac`                                     |
| Shared Zod contracts, no dup DTO shapes | `pnpm check:contracts-strict`, `pnpm check:zod-interface-parity` |
| Thin controllers / CQS                  | `pnpm check:controller-cqs`, `pnpm check:route-thinness`         |
| Tenant-safe auth                        | `pnpm check:auth-tenant-safety`                                  |
| No Prisma leakage out of repositories   | `pnpm check:prisma-boundary`                                     |
| Tier gating (no numeric compares)       | `pnpm check:tier-comparisons`                                    |

A new or edited controller passes when: it follows §1–§9, all checks above are green for
the touched areas, and any deviation is recorded in the PR description with a dated note
per AGENTS.md §0/§12.7.

---

## 11. Client data access contract (`packages/data-access`)

This section is the client-side mirror of §1–§9. A route change on the server is **not
complete** until the matching hook, query key, and client types change in the same PR —
the two halves must never drift apart. If a hook endpoint, key, or response type and the
controller disagree, the controller is not the only bug: one of them is stale.

### 11.1 One client, one base URL, relative paths

- `createAPIClient({ baseURL })` (`packages/data-access/src/lib/client-factory.ts`) is the
  single fetch engine: JSON defaults, `credentials: 'include'` (httpOnly auth cookies ride
  every request), GET in-flight dedupe, bounded retries, per-request timeouts, CSRF-invalid
  retry via `onRequest`, and RFC 9457 problem-details error classification
  (`APIRequestError` / `ErrorCodes`).
- The base URL resolves to `/api/v1` — the same-origin Cloudflare proxy or `VITE_API_URL`
  (`getAppApiUrl()` in `apps/app/src/lib/api/api-url-resolver.ts`; the client instance is
  cached per base URL). **Hooks never embed `api` or `v1`.** A hook's endpoint string is the bare controller
  path: `/patients`, `/patients/:id`, `/internal/clinics`. A literal `/api/v1/...` inside
  a hook or query key is the §1 double-prefix bug class on the client side.
- Hooks do not own the fetch. The app injects a session-aware fetcher plus tenant/timezone
  and tier gate via `DataAccessProvider` (`{ fetcher, getClinicId, getClinicTimezone,
isTierFeatureEnabled }` in `packages/data-access/src/provider/context.ts`; app wiring in
  `apps/app/src/providers/data-access-bridge.tsx`). Hooks reach it with
  `useDataAccessFetcher()` / `useDataAccessContext()`. The `enabled` flag of every
  tenant-scoped hook is gated by `isTierFeatureEnabled(Feature.X)` — the client-side twin
  of the server's `@RequireFeature`.

### 11.2 Hook → route mapping

| Hook family (examples)                                           | Endpoint                                                                      | Method                | Mirrors            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------- | ------------------ |
| `usePatients` / `usePatient(id)`                                 | `/patients`, `/patients/:id`                                                  | GET                   | §3, §6             |
| `useCreatePatient` / `useUpdatePatient` / `useDeletePatient`     | `/patients`, `/patients/:id`                                                  | POST / PATCH / DELETE | §4, §5             |
| `useAppointments` / `useAppointment(id)`                         | `/appointments`, `/appointments/:id`                                          | GET                   | §3                 |
| `useStartConsultation` / `useCancelAppointment`                  | `/appointments/:id/start-consultation`, `/appointments/:id/cancel`            | POST / PATCH          | §4 RPC             |
| `useInvoices` / `useInvoice(id)` / `useCreateInvoice`            | `/invoices`, `/invoices/:id`                                                  | GET / POST            | §3, §5             |
| `useInsuranceClaims` / `useTransitionInsuranceClaim`             | `/insurance-claims`, `/insurance-claims/:id/transition`                       | GET / POST            | §3, §4             |
| `useClinicWhatsappCampaigns` / `useCancelClinicWhatsappCampaign` | `/whatsapp/operations/campaigns`, `/whatsapp/operations/campaigns/:id/cancel` | GET / POST            | whatsapp namespace |

Rules:

1. **Method mirrors §4.** Reads go through `useAPIQuery` / `useInfiniteQuery`; writes go
   through `useAPIMutation(endpoint, method)` with `POST | PUT | PATCH | DELETE`. The
   hook's method string must equal the controller decorator — a mismatch is a 404/405 at
   runtime.
2. **Status expectations mirror §5.** True creates return 201; new action POSTs
   return 200; the twelve documented existing auth POSTs retain 201. Client code
   must not assume one status for all POSTs. For a documented-200 action missing
   `@HttpCode(200)`, correct the server contract; do not special-case the client.
3. **Sub-resource RPC mirrors §4.** Action routes hang off the resource
   (`/appointments/:id/start-consultation`); the hook name is the action, the path is
   resource-first. Never add a hook that calls a verb URL (`/delete-staff-notification`)
   — rename the route, not the client.

### 11.3 Query params (`withQueryString`)

- List hooks build URLs with `withQueryString(path, params)`; `undefined` values are
  omitted (so no `?search=undefined` appears in the URL).
- **§6 mirror:** cursor lists pass `{ cursor, limit }` (limit clamped 1..100, default 50
  per the §6 cursor schema — `listClinicsQuerySchema`); bounded-array lists pass
  `{ limit }`; log tails pass `{ limit, offset }`. Never send `NaN` or a raw
  `Number(undefined)` into a query param.
- Param names are the **server's** param names (`limit`, `cursor`, `search`, `status`...).
  Renaming a server query param without updating the hook's `withQueryString` call
  silently drops the filter client-side.

### 11.4 Query keys and invalidation (`queryKeys`)

- Cache identity lives in the `queryKeys` factory (`packages/data-access/src/lib/
query-keys-clinician.ts`; `query-keys-app.ts` keys the app-session cache). Keys are
  **arrays, not URLs** — they encode response identity: resource + variant + params
  (`['patients', 'list', { search }]`). The URL may change without cache invalidation; a
  key change always invalidates.
- **Every response-affecting input must appear in the key.** Omitting `search`/`limit`/
  `cursor`/`status` from a key causes cross-filter cache bleed (page A renders page B's
  data). Params go through `withParams` so a missing object does not split the key.
- **Invalidation contract:** every write hook declares `invalidateKeys` — the read keys
  it invalidates. Prefer broad prefix keys (`queryKeys.patients.all()`) for CRUD; use
  leaf keys (`byId(id)`) only when the mutation provably touches one record; use
  `onSuccess` to invalidate derived keys (e.g. ABHA verify invalidates the patient +
  medical-history keys).
- New hooks must register their keys in the factory — never inline `['patients', ...]`
  literals at call sites. Keys must stay greppable and consistent so renames land
  everywhere.

### 11.5 Zod parity

- Validated reads use `useAPIQueryValidated` (or `client.validate(endpoint, schema)`)
  with the **same schema the server serializes** (`listPatientsResponseSchema` and
  friends from `packages/types`). Type hook data as `z.infer<typeof schema>` — never a
  hand-written parallel shape. A hand-typed hook response that diverges from the schema
  is the §7 rule on the client side (`check:zod-interface-parity` covers feature
  interfaces; hook-level response types are the same rule).

### 11.6 Known drift to reconcile

- **`GET /patients` is offset-style on the server, cursor-style in the client.** The
  server accepts `page`/`limit` and returns `{ items, total }` via
  `listPatientsResponseSchema` (`packages/types/src/contracts/patients.ts`); the client
  `usePatients` types `{ items, nextCursor?, hasMore, count }` and `useInfinitePatients`
  sends `cursor`, which the server never reads. Reconcile against §6 in one PR — pick
  cursor `?cursor&limit` → `{ items, nextCursor, hasMore, count }` as the canonical
  shape and align both sides (schema, controller, hooks, keys).

This section is prescriptive for new hooks exactly as §1–§9 are for new controllers: a
new hook that diverges from the route it calls is a conformance failure, recorded in the
PR description like any other deviation.
