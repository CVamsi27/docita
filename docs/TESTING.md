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

**Location**: `apps/app/e2e/`

**Files**:

- `auth.spec.ts` - Login/logout and authentication flows
- `verify-doctor.spec.ts` - Doctor verification redirect and completion flow
- `clinic-registration.spec.ts` - Onboarding wizard with signature upload
- `critical-flows.spec.ts` - Auth, isolation, and high-risk business flow checks
- `patients.spec.ts` - Patient creation, search, and list display
- `upgrade.spec.ts` - Subscription billing UI under Settings (tier cards, billing history)
- `subscription.spec.ts` - Subscription settings and billing-locked page smoke checks
- `playwright.config.ts` - Playwright configuration

**Features**:

- ✅ Browser automation (Chrome, Firefox, Safari)
- ✅ Happy path + critical error scenarios
- ✅ Form validation testing
- ✅ API integration from frontend
- ✅ Screenshot and trace on failure

### CI/CD Pipeline (GitHub Actions)

**Locations**:

- `.github/workflows/ci.yml` — lint, typecheck, unit tests, and repository standards (including Knip when scope matches)
- `.github/workflows/frontend-critical-e2e.yml` — Playwright lanes for the doctor app and related flows
- `.github/workflows/api-e2e.yml` — NestJS Jest E2E against PostgreSQL where configured

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
export DATABASE_URL=postgresql://postgres:postgres@localhost:5434/docita_test
pnpm --filter @workspace/db exec npx prisma migrate deploy

# Option 2: Using Docker
docker run -d \
  --name docita_test_db \
  -e POSTGRES_PASSWORD=postgres \
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

These specs register a user via the API and drive the Next.js app at `http://localhost:3000`. **PostgreSQL must be running** and migrations applied for the API (`http://localhost:3001` by default) or registration returns `500` / `ECONNREFUSED` from Prisma.

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

# Set webhook URL in Meta App Dashboard:
# https://<ngrok-url>/api/whatsapp/webhook
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
NEXT_PUBLIC_API_URL=http://localhost:3001/api
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
   - Execute Playwright smoke test (`apps/app/e2e/health.spec.ts`)
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

### Phase 2 (Future)

After core auth & patient flows are solid:

- [ ] Add appointment booking E2E tests
- [ ] Add invoice & billing flow tests
- [ ] Add multi-doctor clinic scenarios
- [ ] Add admin panel tests (defer)
- [ ] Add performance benchmarks
- [ ] Add visual regression testing

### Metrics to Track

- Test execution time
- Code coverage % (target: 70%+)
- Test pass rate (target: 100%)
- Flake rate (target: < 1%)

## Support

For issues or questions:

1. Check test logs: `apps/api/coverage-e2e/` or `apps/app/playwright-report/`
2. Review test code in `test/` or `e2e/` directories
3. Check GitHub Actions workflow runs for CI failures

## References

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Playwright Documentation](https://playwright.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
