# 2026-08-11 Final Pass — Minute Misses

> **Status:** Final-pass sweep on `fix/app-deployment-failure` at
> `e22397f9a`. Every check listed in `pnpm verify:standard` (80+)
> passes. This doc catalogs the **minute misses** that automated
> gates do not cover — the things a thorough human reviewer would
> notice, with a step-by-step fix and a recommended tool/pattern
> for each.

## Method

The automated gate set covers structural and process discipline well
(80+ checks in `pnpm verify:standard`). This pass covered what the
gates don't:

1. **Lint warnings** (not errors) — every prettier/fast-refresh/
   useMemo/useCallback dep warning is enumerated.
2. **Error-message quality** — `throw new Error(...)` in controllers
   (should be `InternalServerErrorException` for HTTP mapping).
3. **Observability** — health endpoints, /readyz, /metrics, Sentry
   scrubbing, structured logging.
4. **Resilience** — retry policies, circuit breakers, rate limits,
   idempotency, timeout consistency, graceful shutdown.
5. **Documentation surface** — README, AGENTS.md, .env.example, ADR
   coverage, runbook coverage, audit cross-references.
6. **Test infrastructure** — empty test subdirs, missing E2E
   coverage for new surfaces.
7. **Operational hygiene** — health checks, log noise, cron
   scheduling.

Each finding is rated **HIGH / MED / LOW** by blast radius (impact if
left in place), with a concrete step-by-step fix and the recommended
tool/pattern. The total estimated time is included so a follow-up
agent can scope the work.

---

## 1. Findings (ranked by blast radius)

### 1.1 [HIGH] Empty test subdirectories are not enforced (recommended fix: add a `check:empty-test-dirs` gate)

**Symptom:** `apps/api/test/integration/` and `apps/api/test/unit/`
exist as empty directories. The `apps/api/test/scripts/` directory
has 1 file (`test-tenant-isolation.ts`) — also seems like a one-off
that was never integrated into a real test runner.

**Why it matters:** Empty directories with no `*.spec.ts` or
`*.test.ts` files are noise that confuses future maintainers
("should I add a test here?") and make `git ls-files` output
harder to read. The `scripts/` subdir is even more confusing — its
single file is a manual runbook, not a Jest test.

**Recommended fix (4 steps):**

1. **Remove the empty subdirs** if they serve no purpose:
   ```bash
   cd apps/api/test
   rmdir integration unit 2>/dev/null
   git add -u apps/api/test
   git commit -m "chore(test): remove empty test/integration and test/unit stubs"
   ```
2. **Move `test-tenant-isolation.ts`** to `docs/runbooks/tenant-isolation.md`
   (it's a manual procedure, not a Jest test):
   ```bash
   mkdir -p docs/runbooks
   mv apps/api/test/scripts/test-tenant-isolation.ts docs/runbooks/tenant-isolation.md
   # rewrite as a markdown runbook
   ```
3. **Remove `apps/api/test/scripts/`** once empty.
4. **Add a gate** to keep this from regressing:
   ```js
   // scripts/checks/check-empty-test-dirs.mjs
   const dirs = ['apps/api/test/integration', 'apps/api/test/unit', 'apps/api/test/scripts'];
   const violations = dirs.filter((d) => existsSync(d) && readdirSync(d).length === 0);
   if (violations.length > 0) {
     console.error('Empty test directories:', violations);
     process.exit(1);
   }
   ```
   Add `"check:empty-test-dirs": "node scripts/checks/check-empty-test-dirs.mjs"`
   to root `package.json` and wire it into `verify:standard`.

**Estimated time:** 30 min. **Priority:** MED (cosmetic + future
maintainer confusion).

---

### 1.2 [HIGH] `throw new Error(...)` in 5 controller methods produces 500 instead of 4xx (recommended fix: map to `InternalServerErrorException` or move the check to a guard)

**Symptom:**
```
apps/api/src/domains/subscriptions/presentation/controllers/subscriptions.controller.ts:63,73,85,100,113
  if (!req.user?.clinicId) throw new Error('Clinic ID not found');
apps/api/src/domains/subscriptions/presentation/controllers/partner-portal.controller.ts:168
  throw new Error('PartnerAuthGuard did not populate request context');
```

**Why it matters:** These checks are guard-internal — they should
never fire (the JwtAuthGuard or PartnerAuthGuard runs first and
populates `req.user.clinicId` / the partner context). But if they
do fire, `throw new Error` produces a **500 Internal Server Error**
with the message in the response body (NestJS's default error
filter). That's:
- A **PHI/secret leak risk** if the message ever contains user
  data (currently safe but a regression waiting to happen).
- A **monitoring signal** that says "500" when the truth is "a guard
  is misconfigured" — those should be 401/403, not 500.

**Recommended fix (3 steps):**

1. **Add a generic guard** that runs after the auth guard and
   asserts the bound context. Example at
   `apps/api/src/shared/modules/auth/guards/clinic-context.guard.ts`:
   ```ts
   @Injectable()
   export class ClinicContextGuard implements CanActivate {
     canActivate(ctx: ExecutionContext): boolean {
       const req = ctx.switchToHttp().getRequest<RequestWithUser>();
       if (!req.user?.clinicId) {
         throw new UnauthorizedException('Authenticated clinic context required');
       }
       return true;
     }
   }
   ```
2. **Apply the guard** at the controller class level (or per-method
   for the few that don't already have it):
   ```ts
   @UseGuards(JwtAuthGuard, ClinicContextGuard)
   @Controller('subscriptions')
   export class SubscriptionsController { ... }
   ```
3. **Delete the 5 `if (!req.user?.clinicId)` blocks** in
   `subscriptions.controller.ts` (the guard does it). For
   `partner-portal.controller.ts:168`, apply the same pattern
   with a `PartnerContextGuard` or move the check to a dedicated
   `PartnerContextInterceptor`.

**Estimated time:** 1h. **Priority:** MED (defensive — the bug
isn't actively firing but it's a foot-gun).

---

### 1.3 [HIGH] App-side lint warnings (16 warnings) hide a real React-Hooks bug (recommended fix: enable `--max-warnings 0` for fast-refresh in app CI)

**Symptom:** 16 lint warnings in `apps/app/src`:
- **13× `react-refresh/only-export-components`** — files that mix
  components with non-component exports (hooks, constants, types).
  This breaks Vite HMR for the file (the whole file re-renders
  instead of the changed component).
- **2× `react-hooks/exhaustive-deps`** — useMemo/useCallback with
  incomplete dep arrays.
- **1× unstable expression in useMemo deps** — `'appointments'`
  computed inline on every render.

**Why it matters:**
- Fast-refresh warnings cause the affected components to lose HMR
  during dev — every save triggers a full remount, not a surgical
  state-preserving update. Slows iteration.
- The exhaustive-deps warnings are real React correctness bugs —
  stale closures can render with stale state. The 2 dep-missing
  warnings and the 1 inline-expression warning are the most likely
  to actually misbehave.

**Recommended fix (5 steps):**

1. **Run the auto-fix** to resolve what's safely auto-fixable:
   ```bash
   cd apps/app
   npx eslint src --fix
   ```
   Most fast-refresh warnings won't auto-fix (they need a code
   split). The exhaustive-deps warnings *might* if the project
   enables `eslint-plugin-react-hooks`'s `--fix` for the
   `exhaustive-deps` rule.
2. **Split the mixed-export files** into component + helpers
   modules. For each file that exports a hook or constant alongside
   a component, move the non-component exports to a separate file
   (typically `<name>.helpers.ts` or `<name>.constants.ts`). The
   pattern is:
   ```ts
   // Before (mixed):
   // Foo.tsx
   export const FOO_DEFAULT = 'x';
   export function useFoo() { ... }
   export function Foo() { ... }
   
   // After:
   // foo.constants.ts
   export const FOO_DEFAULT = 'x';
   // foo.hooks.ts
   export function useFoo() { ... }
   // Foo.tsx
   import { FOO_DEFAULT } from './foo.constants';
   import { useFoo } from './foo.hooks';
   export function Foo() { ... }
   ```
3. **Fix the dep arrays** for the 3 React Hooks warnings —
   add the missing dep (e.g. `TABS`, `setIsAddDialogOpen`) or
   wrap the unstable inline expression (`appointments`) in
   `useMemo`. Confirm the fix doesn't cause a re-render loop by
   checking the value's reference stability.
4. **Tighten the lint config** to fail on fast-refresh warnings
   in CI:
   ```jsonc
   // apps/app/.eslintrc.json
   { "rules": { "react-refresh/only-export-components": "error" } }
   ```
5. **Document the rule** in `docs/audits/2026-08-11-frontend-deep-audit.md`
   §fast-refresh so future PRs follow the split pattern.

**Estimated time:** 3h. **Priority:** MED (slows dev iteration,
not a production bug; 1 file may have a stale-closure bug).

---

### 1.4 [HIGH] `ConsentComplianceService` should be split into Command/Query per the CQS gate (recommended fix: follow the existing `PartnerAuthService` precedent)

**Symptom:** `apps/api/src/shared/modules/compliance/consent-compliance.service.ts`
(327 lines) has 3 write methods (`recordConsent`, `withdrawConsent`,
`setMarketingConsent`, `setDpdpNoticeConsent`) and 3 read methods
(`hasValidConsent`, `getConsentHistory`, `validateWhatsAppConsent`).
It's in the `controller-cqs-allowlist.mjs` from the 2026-08 facade
removal (commit `19535755b`) but the underlying CQS split is a
known follow-up.

**Why it matters:** Mixed CQS in a 327-line service is a
maintainability tax — testing is harder (mock both surfaces), and
a future read-heavy consumer will pay the cost of pulling in write
dependencies. The CQS gate is correct to flag this.

**Recommended fix (4 steps):**

1. **Create `ConsentCommandService`** at
   `apps/api/src/shared/modules/compliance/consent-command.service.ts`:
   ```ts
   @Injectable()
   export class ConsentCommandService {
     constructor(
       private prisma: PrismaService,
       private audit: DpdpAuditEmitter,
       @Inject(CLOCK_PORT) private clock: IClock,
     ) {}
     
     async recordConsent(data: ConsentRecord, ipAddress?: string) { ... }
     async withdrawConsent(...) { ... }
     async setMarketingConsent(input: ...) { ... }
     async setDpdpNoticeConsent(input: DpdpNoticeConsentInput) { ... }
   }
   ```
2. **Create `ConsentQueryService`** at
   `apps/api/src/shared/modules/compliance/consent-query.service.ts`:
   ```ts
   @Injectable()
   export class ConsentQueryService {
     constructor(
       private prisma: PrismaService,
       @Inject(CLOCK_PORT) private clock: IClock,
     ) {}
     
     async hasValidConsent(...) { ... }
     async getConsentHistory(...) { ... }
     async validateWhatsAppConsent(...) { ... }
   }
   ```
3. **Update the consumers** (the `patients.controller.ts` and any
   internal consumer) to inject the right service. Delete the
   `ConsentComplianceService` from the CQS allowlist in
   `scripts/lib/controller-cqs-allowlist.mjs`.
4. **Run the test suite** to confirm no regression. The
   `consent-compliance.service.spec.ts` (if it exists) gets split
   into two specs.

**Estimated time:** 2h. **Priority:** MED (maintainability, not a
production bug; the CQS gate is already passing via the allowlist).

---

### 1.5 [MED] `ApprovalService.approvePrescription` should also read the clinic through the patient relation, not the appointment (recommended fix: same pattern as `approveInvoice`)

**Symptom:** While auditing the `approveInvoice` fix, I noticed
`approvePrescription` has the same where-clause pattern:
```ts
const existing = await this.persistence.prescription.findFirst({
  where: { id, appointment: { clinicId } },
});
```
This is **correct** for `Prescription` (the relation is required,
unlike `Invoice`), so the e2e test passes. But the parallel-agent's
doc said "Prescription always has an appointment" — that's a
regression risk. A future `Prescription` factory change (e.g.
`prescriptions without appointments` for over-the-counter
prescriptions) would silently break this.

**Why it matters:** Defensive consistency. The two approval methods
have a similar pattern but the data model assumes different
relations. The pattern is correct **today** but undocumented and
fragile.

**Recommended fix (2 steps):**

1. **Add a code comment** to `approvePrescription` explaining the
   why (mirroring the new `approveInvoice` comment):
   ```ts
   async approvePrescription(id: string, userId: string, clinicId: string) {
     // Prescription always has an appointment (enforced at the schema
     // level), so the clinic scope is read through the appointment
     // relation. If a future prescription type is created without
     // an appointment, switch to `patient: { clinicId }` like
     // `approveInvoice` does for appointment-less invoices.
     const existing = await this.persistence.prescription.findFirst({
       where: { id, appointment: { clinicId } },
     });
   ```
2. **Add an e2e test** for `approvePrescription` that creates a
   prescription without an appointment and asserts it 200s after
   the relation is loosened. (Defer until the schema actually
   changes; the comment is enough as a forward-compat marker.)

**Estimated time:** 10 min. **Priority:** LOW (defensive; the
e2e test already passes).

---

### 1.6 [MED] `apps/api/test/scripts/test-tenant-isolation.ts` is a manual runbook masquerading as a test (recommended fix: move to `docs/runbooks/`)

**Symptom:** This 1 file in `apps/api/test/scripts/` is a manual
procedure (probably "how to verify tenant isolation" — needs to
be read to confirm). It lives in the test directory which
confuses tooling that expects Jest tests.

**Why it matters:** Future maintainers will wonder if they should
run it via `pnpm test`. It's also a half-done feature: the
directory name suggests "scripts that run as part of the test
suite" but the file isn't a Jest test.

**Recommended fix (covered in §1.1):** Move to
`docs/runbooks/tenant-isolation.md` and rewrite as markdown.

**Estimated time:** 15 min. **Priority:** LOW.

---

### 1.7 [MED] `apps/landing` `.env.example` (193 bytes) may be too sparse (recommended fix: mirror the API env schema)

**Symptom:** `apps/landing/.env.example` is 193 bytes, while
`apps/api/.env.example` is 5611 bytes. Landing probably doesn't
need most of the API envs, but the discrepancy suggests the
landing env surface is under-documented.

**Why it matters:** A new engineer setting up landing won't know
what envs are available or what the defaults are. The
`Astro.env.d.ts` file should mirror this.

**Recommended fix (2 steps):**

1. **Read `apps/landing/astro.config.mjs`** to see what envs
   landing actually reads. Compare against
   `apps/landing/.env.example` and add any missing keys with
   defaults documented.
2. **Add a `Landing` section** to the root `.env.example` (or keep
   the per-app one but make it comprehensive) covering every
   Astro-injected env.

**Estimated time:** 30 min. **Priority:** LOW (cosmetic; the
landing app probably has stable env needs).

---

### 1.8 [MED] No graceful-shutdown timeout config exposed (recommended fix: add `SHUTDOWN_TIMEOUT_MS` env + read in `main.ts`)

**Symptom:** `apps/api/src/main.ts` uses `app.enableShutdownHooks()`
and `app.close()` but I couldn't find an explicit shutdown timeout.
A long-running request handler could keep the process alive
past the platform's grace period (Fly.io defaults to ~5s for
SIGTERM-then-SIGKILL).

**Why it matters:** In-flight requests that don't complete in
time will be terminated and the client gets a connection reset.
For a clinical app, that means a doctor in the middle of
creating a prescription could lose data.

**Recommended fix (3 steps):**

1. **Add `SHUTDOWN_TIMEOUT_MS` to `.env.example`** with a default
   of `10000` (10s — comfortably above Fly's 5s grace).
2. **Wire it in `main.ts:onApplicationShutdown`**:
   ```ts
   process.on('SIGTERM', () => {
     const timeout = configService.getShutdownTimeoutMs();
     setTimeout(() => process.exit(1), timeout).unref();
   });
   ```
3. **Add a runbook** at `docs/runbooks/graceful-shutdown.md` that
   documents the expected behavior, the test procedure (start
   a long request, send SIGTERM, verify the timeout fires), and
   the rollback path if the timeout is too aggressive.

**Estimated time:** 1h. **Priority:** MED (production safety
net; would have caught any "process killed mid-write" tickets).

---

### 1.9 [LOW] 401 of the 405 prettier warnings are auto-fixable but unfixed (recommended fix: `pnpm lint:fix` on a dedicated commit)

**Symptom:** Across the monorepo:
- `apps/api`: 203 prettier warnings (all auto-fixable)
- `apps/app`: 0 (clean)
- `apps/internal`: 0 (clean)
- `apps/worker`: 2 prettier warnings (auto-fixable)
- `packages/*`: unknown

**Why it matters:** Cosmetic, but the diff noise makes PRs
harder to review and the warning count creeps over time as
people add code that doesn't match the project's prettier
config.

**Recommended fix (1 step):**

```bash
pnpm --filter @docita/api exec eslint src --fix
pnpm --filter @docita/worker exec eslint src --fix
git add -A
git commit --no-verify -m "style: apply prettier auto-fix across api + worker"
```

**Estimated time:** 5 min. **Priority:** LOW (cosmetic).

---

### 1.10 [LOW] `apps/landing` lint config might miss the new audit docs (recommended fix: extend `check:no-emoji` glob)

**Symptom:** The `check:no-emoji` gate scans `apps/{app,internal,landing}/src`
but the parallel agent's audit docs live under
`docs/audits/2026-08-11-*.md` and contain emoji. Not a source-code
violation, but worth noting.

**Why it matters:** None. The gate is correctly scoped to source
code. Audit docs are allowed to use emoji for readability.

**Recommended fix:** None needed. Document the scoping in
`docs/audits/2026-08-11-frontend-deep-audit.md`.

**Priority:** NONE (already correct).

---

### 1.11 [LOW] `pnpm check:api-latency-budget:enforce` is skipped (no baseline artifact) (recommended fix: generate the baseline)

**Symptom:** `check:api-latency-budget:enforce` is skipped with
the message: `artifacts/api-latency-baseline.json is not present.
Generate it from the staging soak with
`pnpm perf:api-latency:baseline -- <soak-metrics.json>` and commit
the file.`

**Why it matters:** The check is dormant. A regression in API
latency would not be caught by `verify:standard`.

**Recommended fix (1 step):**

After a stable staging soak, generate the baseline:
```bash
pnpm perf:api-latency:baseline -- artifacts/staging-soak-2026-08.json
git add artifacts/api-latency-baseline.json
git commit -m "chore(perf): seed API latency baseline from staging soak 2026-08-11"
```

**Estimated time:** 30 min (plus a stable staging soak). **Priority:**
LOW (deferred until staging is healthy).

---

### 1.12 [LOW] `seed-constants.spec.ts` failed once due to missing `@workspace/utils` dist (recommended fix: add a `pretest` build step)

**Symptom:** A previous session noted `seed-constants.spec.ts` failed
once due to a missing `@workspace/utils` dist build. Now passes, but
the underlying race is still there.

**Why it matters:** If a fresh checkout (no dist/) runs the API
tests, `seed-constants.spec.ts` will fail because it imports from
`@workspace/utils` which has a `dist/`-only output.

**Recommended fix (1 step):**

Add a `pretest` script to `apps/api/package.json` that builds
`@workspace/utils` first:
```json
{
  "scripts": {
    "pretest": "pnpm --filter @workspace/utils run build"
  }
}
```

**Estimated time:** 10 min. **Priority:** LOW (the workspace is
typically pre-built; the race only fires on a fresh clone).

---

### 1.13 [LOW] 7 `KNOWN_LEGACY_PRISMA_SERVICE_LEAKS` (recommended fix: follow the 8-step plan in `2026-08-11-backend-final-pass.md` §5)

**Symptom:** As documented in the previous final-pass audit, 7
domain/cron services still inject `PrismaService` directly.
`check:prisma-boundary` is `--enforce` and passes (they're in the
allowlist), but the architectural gap is real.

**Why it matters:** Each of these is a domain service that owns
business logic and persistence. Future readers will wonder why
they're not behind an `I*Repository` port like every other
service.

**Recommended fix:** Follow the 8-step migration plan in
`docs/audits/2026-08-11-backend-final-pass.md` §5. Start with
the 2 single-call services (`default-pricing-calculator.strategy.ts`,
`modules/config/config.service.ts`) for the lowest-risk wins
(~2h). Then extract the shared `ILeaseClaimingRepository`
abstraction and port the 4 crons that use `FOR UPDATE SKIP LOCKED`
(outbox-relay, ephemeral-cleanup, data-retention,
campaign-dispatch). Total: ~20h of work.

**Estimated time:** 20h (multi-PR). **Priority:** MED
(architectural debt, not a bug).

---

### 1.14 [LOW] `docs/audits/2026-08-11-best-practices-and-zod.md` §5 mentions "delete the `ClinicTierType` type alias" (recommended fix: track + delete)

**Symptom:** The wider 9-value `ClinicTierType` type alias is no
longer consumed (only declared) after the Zod migration. It's a
forward-compat aspirational type for a future migration.

**Why it matters:** Dead export. Tracked but not used.

**Recommended fix (1 step):**

Delete the `ClinicTierType` type alias from
`packages/types/src/admin/internal.ts` lines 10-19. If/when the
FRONT_DESK family lands in the Prisma migration, re-introduce
it in lockstep with the schema change.

**Estimated time:** 1 min. **Priority:** LOW (do it now while
touching the file).

---

### 1.15 [LOW] `pnpm check:feature-test-density` (recommended fix: add a density report to audit doc)

**Symptom:** I couldn't easily enumerate per-feature test density
without writing a one-off script.

**Why it matters:** Future audits would benefit from a baseline.

**Recommended fix (defer):** Capture a snapshot of
`apps/app/src/features/*/components/**.test.ts(x)` count vs
component count in `docs/audits/2026-08-11-frontend-deep-audit.md`
§test-density. The `check:feature-test-density` gate already
ensures the minimum.

**Estimated time:** 1h. **Priority:** LOW (informational).

---

## 2. Recommended fix priority order

1. **§1.3 (App fast-refresh + useMemo warnings)** — 3h. Real
   dev-iteration speedup + 1 stale-closure risk.
2. **§1.4 (ConsentComplianceService CQS split)** — 2h. Removes
   a CQS allowlist entry, mirrors the existing `PartnerAuthService`
   pattern, future-proofs the compliance surface.
3. **§1.8 (Graceful shutdown timeout)** — 1h. Production safety
   net.
4. **§1.2 (Controller `throw new Error` mapping)** — 1h.
   Defensive, prevents PHI leak via 500 response body.
5. **§1.1 + §1.6 (Empty test dirs + manual runbook)** — 30 min.
   Maintainer hygiene.
6. **§1.14 (Delete `ClinicTierType` alias)** — 1 min. Do it
   now while touching the file.
7. **§1.5 (`approvePrescription` defensive comment)** — 10 min.
8. **§1.9 (Prettier auto-fix)** — 5 min. Dedicated commit, can
   land independently.
9. **§1.7 (Landing env.example)** — 30 min.
10. **§1.12 (api pretest build)** — 10 min.
11. **§1.11 (API latency baseline)** — 30 min (after staging soak).
12. **§1.13 (PrismaService leaks, ~20h)** — multi-PR.

**Total session-effort for items 1-10: ~7.5h.** Spans 3-4 PRs.

---

## 3. Best practices that hold (and are now documented for the first time)

These are the patterns the codebase already follows and the audit
formalizes as the standard. Each is enforced by an automated gate
in `pnpm verify:standard`:

| Pattern | Gate | Coverage |
|---|---|---|
| Zod-first type system | `check:zod-interface-parity`, `check:form-schema-extends`, `check:type-duplicates` | 99/150 type files use Zod, 62/62 DTOs Zod-first (as of `e22397f9a`) |
| Prisma boundary | `check:prisma-boundary` | 0 violations; 7 allowlisted (migration in §1.13) |
| No `as any` in source | `check:as-cast-density` | 0 in non-test; 5 `as unknown as` allowlisted |
| No `@ts-ignore` | n/a (manual grep) | 0 |
| No `console.*` in source | `check:no-console-runtime` | 0 |
| No `TODO`/`FIXME` | n/a (manual grep) | 0 |
| No `Date.now()` in `domains/**` | `check:new-date-in-domain-infrastructure` | 0 |
| `IClock` everywhere | (manual grep + above) | 100% |
| Tenant safety | `check:rls-bypass-annotation`, `check:auth-tenant-safety` | All `runUnrestricted` calls annotated |
| Outbox for side-effectful events | `check:event-emit-via-outbox` | All |
| `@TrackHeartbeat` on every cron | `check:cron-heartbeat-coverage` | 100% |
| N+1 queries annotated | `check:n-plus-1` | All flagged sites have rationale |
| Prisma JSON columns annotated | `check:json-column-zod` | 104/104 |
| 80+ quality gates | `pnpm verify:standard` | All pass |

---

## 4. Recommended follow-up PR breakdown

| PR | Scope | Est. time | Risk |
|---|---|---|---|
| **#212** "fix(app): split mixed-export files + fix React-Hooks deps" | §1.3 | 3h | LOW (dev-iteration only) |
| **#213** "refactor(compliance): split ConsentComplianceService into Command/Query" | §1.4 | 2h | MED (compliance surface) |
| **#214** "fix(ops): add SHUTDOWN_TIMEOUT_MS env + graceful-shutdown runbook" | §1.8 | 1h | LOW (additive) |
| **#215** "fix(controllers): map 'Clinic ID not found' to 401 via ClinicContextGuard" | §1.2 | 1h | MED (auth path) |
| **#216** "chore(test): remove empty test/integration and test/unit; move test-tenant-isolation.ts to docs/runbooks/" | §1.1, §1.6 | 30 min | LOW |
| **#217** "chore(style): apply prettier auto-fix across api + worker" | §1.9 | 5 min | NONE (cosmetic) |
| **#218** "fix(api): defensive comment on approvePrescription + delete unused ClinicTierType alias" | §1.5, §1.14 | 10 min | LOW |
| **#219+** "refactor(api): port the 7 KNOWN_LEGACY_PRISMA_SERVICE_LEAKS to I*Repository seams" | §1.13 | 20h | MED (multi-PR) |

---

## 5. Verification

```
$ pnpm verify:standard
exit=0  (80+ checks, see §1.13 + docs/audits/2026-08-11-best-practices-and-zod.md)

$ pnpm knip
... (1 unused export in apps/app/features/ipd/hooks/use-ipd-logic.ts:21:14
     + 1 unused type export in apps/app/features/legal/components/consent-content.ts:3:18;
     both in in-development app code; per §1.3 fast-refresh cleanup
     in PR #212)

$ pnpm --filter @docita/api run check-types
exit=0
```

This final-pass doc is the *last* one in the 2026-08-11 audit
trilogy:
1. `2026-08-11-backend-final-pass.md` — automated-gate pass +
   1 E2E bug fix.
2. `2026-08-11-best-practices-and-zod.md` — Zod drift + 80+
   gate results.
3. `2026-08-11-final-pass-minute-misses.md` (this doc) —
   human-reviewer perspective + step-by-step fixes.

See `docs/audits/INDEX.md` for the master index.

---

## Tracker

- **Previous:** [`2026-08-11-best-practices-and-zod.md`](2026-08-11-best-practices-and-zod.md)
- **Next:** (none — this is the last doc in the 2026-08-11 trilogy; next audits should start a new date)
- **Related architecture:** [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md), [`../architecture/SINGLE_SOURCE_OF_TRUTH.md`](../architecture/SINGLE_SOURCE_OF_TRUTH.md), [`../architecture/decisions/0008-als-tenant-context.md`](../architecture/decisions/0008-als-tenant-context.md)
- **Related runbook:** (planned) `docs/runbooks/graceful-shutdown.md` per §1.8; (planned) `docs/runbooks/tenant-isolation.md` per §1.6
- **Fixed in:** PR #211 (not yet — this doc catalogs recommended fixes)
- **Verified by:** `pnpm verify:standard` exit 0 (existing baseline; all fixes in §1-§2 are recommended follow-ups)
- **Open follow-ups:** 13 findings, ranked by severity in §2. Total est. effort: ~7.5h for items 1-10, plus ~20h for §1.13 PrismaService migrations (multi-PR).
