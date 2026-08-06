# End-to-End Testing Guide

## Overview

This document covers the comprehensive end-to-end (E2E) testing infrastructure for the Docita platform, including backend integration tests with Jest and frontend browser automation tests with Playwright.

## Test Architecture

### Backend E2E Tests (Jest + Supertest)

**Location**: `apps/api/test/`

**Files**:

- `setup.ts` - Database setup, reset, and teardown utilities
- `factories.ts` - Test data factory functions for creating consistent test data
- `mocks/razorpay.mock.ts` - Mocked Razorpay payment service
- `mocks/twilio.mock.ts` - Mocked Twilio WhatsApp service
- `auth.e2e-spec.ts` - Authentication flow tests (login, register)
- `patients.e2e-spec.ts` - Patient management tests (CRUD, clinic isolation)
- `jest-e2e.json` - Jest configuration for E2E tests

**Features**:

- ✅ Fresh database snapshot per test (PostgreSQL)
- ✅ Automatic database cleanup and reset
- ✅ JWT token generation and validation
- ✅ Multi-clinic data isolation testing
- ✅ Doctor-scope authorization checks for appointments
- ✅ Error handling and edge cases
- ✅ Mocked external services (Razorpay, Twilio)

### Frontend E2E Tests (Playwright)

**Location**: `apps/app/e2e/` (45 spec files, ~1,048 tests) — configuration: `apps/app/playwright.config.ts`; `apps/internal/e2e/` (3 spec files, 44 tests) — configuration: `apps/internal/playwright.config.ts`

> **Status (2026-08-02):** the Playwright suite is **ported** to the Vite apps.
> app runs on port 5173 via `vite preview` against a local API; the CI
> workflow `.github/workflows/frontend-critical-e2e.yml` runs the app
> suite, and the internal suite (health, accessibility, critical-flows)
> runs in its own job. 5 visual spec files were dropped at port-or-drop
> (2026-08-02) because the Next dev-tools fixtures they snapshotted are not
> ported (tools is an intentional shell). See
> [`PORTING_PLAN_APP_VITE.md`](../PORTING_PLAN_APP_VITE.md) §Phase 8/9.

#### Doctor app testing matrix

Use this split so expectations stay maintainable (full per-widget coverage is not a goal).

| Layer | Purpose | Typical specs / tooling |
| ----- | ------- | ------------------------- |
| **E2E smoke** | Authenticated route renders, no hard failure; guards redirect correctly | `health.spec.ts`, `nav-routes-smoke.spec.ts` (parameterized top-level nav), selected single-page checks |
| **E2E journeys** | Minimal-click critical workflows (patient, appointment, consultation, billing, WhatsApp) | `critical-flows.spec.ts`, `appointments.spec.ts`, `consultation.spec.ts`, `smart-auth.spec.ts`, `whatsapp.spec.ts`, `upgrade.spec.ts` |
| **Accessibility (axe)** | Catch regressions against WCAG-oriented rules | `accessibility.spec.ts` (public + authenticated audits where stable) |
| **Vitest** | Component logic, rules, hooks — not every static label | `apps/app/src/**/*.test.ts(x)` (run `pnpm --filter @docita/app test`) |

**Command palette (doctor app):** press **⌘K** / **Ctrl+K**, or **/** when focus is not in a text field, to jump to nav destinations and quick actions (`apps/app/src/components/navigation/command-palette.tsx`).

CI runs a **subset** of Playwright on `main` (see below). Run the full suite locally before merging broad UI changes.

#### Playwright spec files (doctor app)

Shared helpers: `e2e/utils/patient-helpers.ts` (includes `patientDetailPath()` / `PATIENTS_LIST_PATH` aligned with Next routes), `e2e/utils/ui-contracts.ts`, `e2e/utils/session.ts`.

| Spec | Focus |
| ---- | ----- |
| `accessibility.spec.ts` | axe audits for key routes |
| `analytics.spec.ts` | Analytics UI |
| `appointments.spec.ts` | Calendar / scheduling flows |
| `auth.spec.ts` | Login shell and token-backed navigation |
| `clinic-registration.spec.ts` | Clinic onboarding wizard |
| `clinics.spec.ts` | Clinic-related UI |
| `consultation.spec.ts` | Consultation workspace |
| `critical-flows.spec.ts` | High-risk API + UI business flows |
| `dashboard.spec.ts` | Dashboard entry and shortcuts |
| `dental-charts.spec.ts` | Dental specialty charts |
| `documents.spec.ts` | Documents page |
| `health.spec.ts` | Lightweight smoke / readiness |
| `inventory.spec.ts` | Inventory |
| `invoices.spec.ts` | Invoices |
| `lab-tests.spec.ts` | Lab tests |
| `medical-coding.spec.ts` | Medical coding |
| `mobile-route-matrix.ts` | Canonical route list for mobile specs (protected, portal, auth/setup groups) |
| `mobile-forms.spec.ts` | Mobile form usability (login at 375/768/412px) |
| `mobile-protected-routes.spec.ts` | Authenticated protected routes at 390px (overflow + mobile header chrome) |
| `mobile-portal-routes.spec.ts` | Patient portal at 390px (login shell + authenticated overflow) |
| `mobile-auth-setup.spec.ts` | Auth/setup shells at 390px (`/login`, `/forgot-password`, …) |
| `nav-routes-smoke.spec.ts` | Parameterized smoke for main nav routes |
| `patient-history-crud.spec.ts` | Patient profile medical history |
| `patient-history-edge-cases.spec.ts` | Patient history edge cases |
| `patients.spec.ts` | Patients list and CRUD |
| `prescriptions.spec.ts` | Prescriptions |
| `queue.spec.ts` | Queue / waiting |
| `settings.spec.ts` | Settings surfaces |
| `smart-auth.spec.ts` | Email-first login and signup branching |
| `subscription.spec.ts` | Subscription lockout / billing-locked |
| `upgrade.spec.ts` | Subscription tab / upgrade UI |
| `verify-doctor.spec.ts` | Doctor verification gate |
| `whatsapp.spec.ts` | WhatsApp inbox |

**Features**:

- Chromium project by default (`playwright.config.ts`); trace on first retry; screenshots on failure
- API-backed setup via `setupTestUser` / `loginUser` where tests need a real clinic and JWT
- Screenshot and trace on failure

### CI/CD Pipeline (GitHub Actions)

**Locations**:

- `.github/workflows/ci.yml` — lint, typecheck, unit tests, and repository standards (including Knip when scope matches)
- `.github/workflows/frontend-critical-e2e.yml` — focused Playwright lane for the doctor app (on pushes to `main` under scoped paths)
- `.github/workflows/api-e2e.yml` — NestJS Jest E2E against PostgreSQL where configured

**`frontend-critical-e2e.yml` Playwright scope** (intentionally narrow for runtime):

- `e2e/clinic-registration.spec.ts`
- `e2e/verify-doctor.spec.ts`
- `e2e/auth.spec.ts`
- `e2e/critical-flows.spec.ts`
- `e2e/front-desk-sidebar.spec.ts`
- `e2e/mobile-forms.spec.ts` (390px / multi-device login)
- `e2e/mobile-protected-routes.spec.ts` (390px protected overflow + chrome)
- `e2e/mobile-portal-routes.spec.ts` (390px portal overflow; needs `DATABASE_URL` for OTP fixture script)
- `e2e/mobile-auth-setup.spec.ts` (390px auth/setup overflow)

Runs **not** included there by default: `nav-routes-smoke.spec.ts`, `accessibility.spec.ts`, and other feature suites (`appointments.spec.ts`, `consultation.spec.ts`, …). Run those locally with `pnpm --filter @docita/app test:e2e`, or add a separate workflow job when you need broader regression coverage.

### Mobile regression checklist (`apps/app`)

Before merging UI that touches layout, tables, tabs, or the protected shell:

1. Run `pnpm mobile:smoke` (runs all four mobile specs via `scripts/perf/mobile-route-smoke.mjs`) with API + app running and `DATABASE_URL` set for portal OTP insertion.
2. Spot-check at **390×844** and **768×1024**: `/today`, `/patients`, `/patients/[id]`, `/invoices/[id]`, `/consultation/[id]`, `/settings?tab=subscription`, portal `/portal/billing`.
3. Confirm no horizontal page overflow and that the single mobile header exposes search, quick-add, command palette, and Ask AI.
4. For accessibility changes, run `pnpm audit:app` (desktop + mobile-width authenticated subset in `accessibility.spec.ts`).

**Features**:

- ✅ Path-filtered jobs so unrelated edits do not burn CI minutes
- ✅ PostgreSQL service containers where E2E workflows require a database
- ✅ Concurrency control on key workflows

## Setup Instructions

### Prerequisites

- Node.js `>=22.12.0` (match root `package.json` `engines`)
- pnpm `10.30.3` (match root `package.json` `packageManager`)
- PostgreSQL 16+ reachable from `DATABASE_URL` in the repo `.env` (local testing)
- Docker (optional, for running PostgreSQL locally)

### Installation

1. **Install dependencies**:

```bash
pnpm install
```

2. **Install Playwright browsers**:

```bash
pnpm --filter @docita/app exec playwright install --with-deps
```

3. **Set up test database**:

```bash
# Option 1: Using existing PostgreSQL
export DATABASE_URL=postgresql://docita:docita@localhost:5434/docita_test
pnpm --filter @workspace/db exec npx prisma migrate deploy

# Option 2: Using Docker
docker run -d \
  --name docita_test_db \
  -e POSTGRES_USER=docita \
  -e POSTGRES_PASSWORD=docita \
  -e POSTGRES_DB=docita_test \
  -p 5434:5432 \
  postgres:16-alpine
```

## Running Tests

### Backend E2E Tests

```bash
# Run all backend E2E tests
pnpm --filter @docita/api test:e2e

# Run tests in watch mode (reload on file change)
pnpm --filter @docita/api test:e2e:watch

# Run tests with coverage report
pnpm --filter @docita/api test:e2e:cov

# Run specific test file
pnpm --filter @docita/api test:e2e -- auth.e2e-spec.ts
```

### Backend unit tests (API / Jest)

Specs live next to sources under `apps/api/src/**/*.spec.ts`. Guards and decorators that call NestJS `Reflector#getAllAndOverride` should stub it through `@/test-utils`: `createKeyedReflectorMock`, `mockGetAllAndOverrideKeyMap`, and `mockGetAllAndOverrideKeyBranch`, using the same metadata key constants the implementation reads (for example `IS_PUBLIC_KEY`, tier keys). Keyed maps avoid brittle `mockReturnValueOnce` ordering on a bare `jest.fn()`.

### Frontend E2E Tests

```bash
# Run all frontend E2E tests (headless)
pnpm --filter @docita/app test:e2e

# Run tests in UI mode (interactive)
pnpm --filter @docita/app test:e2e:ui

# Run tests with browser visible
pnpm --filter @docita/app test:e2e:headed

# Debug tests in browser DevTools
pnpm --filter @docita/app test:e2e:debug

# View test report after run
pnpm --filter @docita/app test:e2e:report
```

### Doctor app subscription / billing E2E (`upgrade.spec.ts`, `subscription.spec.ts`)

These specs register a user via the API and drive the Vite SPA app at `http://localhost:5173`. **PostgreSQL must be running** and migrations applied for the API (`http://localhost:3001` by default) or registration returns `500` / `ECONNREFUSED` from Prisma.

```bash
# From repo root: ensure DATABASE_URL in .env points at a live Postgres, then:
pnpm db:deploy

# Terminal 1 — API
pnpm --filter @docita/api run dev

# Terminal 2 — App
pnpm --filter @docita/app run dev

# Terminal 3 — focused Playwright run
cd apps/app && pnpm exec playwright test e2e/upgrade.spec.ts --project=chromium
```

### Run All Tests

```bash
# Backend unit + E2E + Frontend E2E
pnpm --filter @docita/api test:all

# Full test suite including all packages
pnpm test

# Faster local unit/integration loop
pnpm test:unit:local
```

## Test Coverage

### Authentication (Backend)

✅ **POST /auth/register**

- New user registration
- Duplicate email rejection
- Password validation
- User creation with hashed password

✅ **POST /auth/login**

- Valid credential authentication
- JWT token generation
- Invalid password rejection
- Non-existent user handling

### Patient Management (Backend)

✅ **POST /patients**

- Create patient with required fields
- Clinic assignment validation
- Authentication requirement
- Required field validation

✅ **GET /patients**

- List patients for authenticated clinic
- Clinic data isolation (cannot see other clinic's patients)
- Pagination support
- Search functionality

✅ **GET /patients/:id**

- Retrieve patient by ID
- 404 on non-existent patient
- Authorization checks

✅ **PATCH /patients/:id**

- Update patient information
- Partial updates
- Field validation

✅ **DELETE /patients/:id**

- Delete patient record
- Verify deletion (404 on subsequent GET)

✅ **GET /patients/:id/appointments**

- Retrieve patient's appointments
- Associated doctor and prescription data

### Frontend Auth Flow

✅ **Login Page**

- Form submission with valid credentials
- Error display on invalid credentials
- Form validation on empty submission
- Token storage in localStorage/sessionStorage

✅ **Patient Management UI**

- Create patient form
- Patient list display
- Search functionality
- Form validation errors

## Test Data Isolation

Each test follows this pattern:

```typescript
beforeEach(async () => {
  await resetDatabase(); // Fresh snapshot
  // Setup test data
});
```

This ensures:

- ✅ No data pollution between tests
- ✅ Predictable test state
- ✅ Parallel test execution support

## Mocking External Services

### Razorpay (Payment Gateway)

```typescript
// Auto-mocked in test environment
const mockRazorpay = {
  paymentLink: {
    create: jest.fn().mockResolvedValue({
      id: "plink_mock_123",
      status: "created",
    }),
  },
};
```

### WhatsApp (Meta Business API)

The WhatsApp integration uses the Meta Business Cloud API (not Twilio). Unit tests mock `global.fetch` directly.

```typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({
    messages: [{ id: "wamid.abc123" }],
  }),
}) as unknown as typeof fetch;
```

**Required `.env` variables for integration testing:**

```env
META_BUSINESS_ACCOUNT_ID=<Meta Business Account ID>
META_PHONE_NUMBER_ID=<Phone Number ID from Meta App Dashboard>
META_ACCESS_TOKEN=<Permanent or Temporary Access Token from Meta>
META_VERIFY_TOKEN=<Any random string for webhook verification>
WHATSAPP_PRODUCTION_MODE=false
```

**Meta Business API sandbox setup:**

1. Go to https://developers.facebook.com and create an App (Business type)
2. Add "WhatsApp" product to the app
3. In WhatsApp > Getting Started, note your Test phone number ID and temporary token
4. Add a recipient number in the "To" field (must be verified for sandbox)

**Message templates** (create in WhatsApp > Message Templates in Meta Business Suite):

| Template name | Category | Variables |
|---|---|---|
| `appointment_reminder_24hr` | UTILITY | patient_name, doctor_name, clinic_name, date, time |
| `appointment_reminder_30min` | UTILITY | patient_name, time |
| `prescription_sent` | UTILITY | patient_name, doctor_name, pdf_link (button) |
| `invoice_payment` | UTILITY | patient_name, amount, payment_link (button) |

Templates typically take 24-48 hours to be approved for production accounts. For testing, use the pre-approved Meta sample template `hello_world`.

**Webhook setup for local testing:**

```bash
# Expose local server
ngrok http 3001

# Set webhook URL in Meta App Dashboard (preferred):
# https://<ngrok-url>/api/webhooks/whatsapp
# Legacy fail-open path (deprecated): https://<ngrok-url>/api/whatsapp/webhook
# Subscribe to: messages, message_deliveries, message_reads
```

## Environment Variables

### Backend (.env.test)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/docita_test
JWT_SECRET=test-secret-key-change-in-prod
NODE_ENV=test
```

### Frontend (.env.test)

```env
API_PUBLIC_URL=http://localhost:3001/api
API_URL=http://localhost:3001/api
NODE_ENV=test
```

## CI/CD Pipeline

Tests run automatically on:

- **Push** to `main` or `develop` branches
- **Pull requests** targeting `main` or `develop` branches

### Workflow Steps

1. **Backend Quality + E2E (`.github/workflows/ci.yml`)**
   - Start PostgreSQL service container
   - Install dependencies
   - Run database migrations
   - Execute API E2E tests
   - Upload coverage reports

2. **Frontend Playwright Smoke (`.github/workflows/test.yml`)**
   - Install dependencies
   - Install Playwright browsers
   - Execute Playwright smoke test (pending port to `apps/app/e2e/health.spec.ts`)
   - Upload test report

3. **Local Full-Stack E2E**
   - Run full frontend Playwright suites locally or in dedicated preview environments with app + API runtime

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -h localhost -p 5434 -U postgres -d docita_test

# Verify environment variable
echo $DATABASE_URL

# Restart PostgreSQL service
docker restart docita_test_db
```

### Playwright Browser Installation

```bash
# Reinstall browsers
pnpm --filter @docita/app exec playwright install --with-deps
```

### Test Timeout

Increase timeout in `jest-e2e.json`:

```json
{
  "testTimeout": 60000
}
```

### Port Already in Use

```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

## Best Practices

### Writing Tests

1. **Use factories** for consistent test data:

   ```typescript
   const { user, plainPassword } = await factories.user();
   const clinic = await factories.clinic();
   ```

2. **Test one concern** per test:

   ```typescript
   it("should create patient", async () => {
     // ONE assertion: patient creation
   });
   ```

3. **Use descriptive names**:

   ```typescript
   // ✅ Good
   it("should reject duplicate email on registration");

   // ❌ Bad
   it("should not work");
   ```

4. **Mock external services**:
   ```typescript
   jest.mock("razorpay", () => mockRazorpay);
   ```

### Running Tests Locally

1. **Start services**:

   ```bash
   docker run -d --name docita_test_db -e POSTGRES_PASSWORD=postgres -p 5434:5432 postgres:16
   ```

2. **Run tests**:

   ```bash
   pnpm --filter @docita/api test:e2e:watch
   ```

3. **View Playwright report**:
   ```bash
   pnpm --filter @docita/app test:e2e:report
   ```

## Next Steps

### Ongoing hardening

- Expand axe coverage when new high-traffic routes ship; keep authenticated audits resilient (timeouts, seeded data).
- Add Vitest for complex new dialogs and rules modules alongside Playwright journeys.
- Optional: visual regression for the visual-test route in the Vite app if design-system churn increases.

### Metrics to Track

- Test execution time
- Code coverage % (target: 70%+)
- Test pass rate (target: 100%)
- Flake rate (target: < 1%)

## Support

For issues or questions:

1. Check test logs: `apps/api/coverage-e2e/` or the Vite app `playwright-report/` (once ported)
2. Review test code in `test/` or `e2e/` directories
3. Check GitHub Actions workflow runs for CI failures

## References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Playwright Documentation](https://playwright.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
