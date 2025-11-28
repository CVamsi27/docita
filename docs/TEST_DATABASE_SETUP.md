# Test Environment Setup Guide

## Quick Start

The E2E test infrastructure has been successfully created, but requires PostgreSQL to run. Choose one of the options below:

### Option 1: Docker (Recommended - Easiest)

```bash
# Start PostgreSQL test database
docker run -d \
  --name docita_test_db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=docita_test \
  -p 5432:5432 \
  postgres:16-alpine

# Run migrations and create schema
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docita_test" \
DATABASE_DIRECT_URL="postgresql://postgres:postgres@localhost:5432/docita_test" \
pnpm --filter db exec npx prisma migrate deploy

# Run tests
pnpm --filter api test:e2e
```

### Option 2: Homebrew (macOS)

```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql

# Create test database
createdb docita_test

# Run migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docita_test" \
DATABASE_DIRECT_URL="postgresql://postgres:postgres@localhost:5432/docita_test" \
pnpm --filter db exec npx prisma migrate deploy

# Run tests
pnpm --filter api test:e2e
```

### Option 3: Existing PostgreSQL

If you have PostgreSQL running already:

```bash
# Create test database (adjust connection string if needed)
psql -U postgres -c "CREATE DATABASE docita_test;"

# Run migrations
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docita_test" \
DATABASE_DIRECT_URL="postgresql://postgres:postgres@localhost:5432/docita_test" \
pnpm --filter db exec npx prisma migrate deploy

# Run tests
pnpm --filter api test:e2e
```

## Running Tests

### Backend E2E Tests

```bash
# Run all tests once
pnpm --filter api test:e2e

# Run tests in watch mode
pnpm --filter api test:e2e:watch

# Run with coverage
pnpm --filter api test:e2e:cov

# Run specific test file
pnpm --filter api test:e2e -- auth.e2e-spec
```

### Frontend E2E Tests

After the database is set up:

```bash
# Make sure backend is running on port 3001
pnpm --filter api dev

# In another terminal, run frontend tests
pnpm --filter @docita/app test:e2e

# Run in headed mode (see browser)
pnpm --filter @docita/app test:e2e:headed

# Run with debug mode
pnpm --filter @docita/app test:e2e:debug

# View HTML report
pnpm --filter @docita/app test:e2e:report
```

## Test Coverage

### Backend Tests (17 scenarios)

**Authentication (6 tests)**

- Register new user with valid credentials
- Reject duplicate email registration
- Reject weak password
- Login with valid credentials
- Reject invalid password
- Reject non-existent user

**Patient Management (11 tests)**

- Create patient for clinic
- Reject unauthenticated request
- Validate required fields
- List patients for clinic
- Search patients
- Clinic isolation (cannot see other clinic's patients)
- Get patient details
- Return 404 for non-existent patient
- Update patient
- Delete patient
- Get patient appointments

### Frontend Tests (8 scenarios)

**Authentication (3 tests)**

- Valid login
- Invalid credentials error display
- Empty form validation

**Patient Management (5 tests)**

- Create new patient
- Display patient list
- Search patients
- Form validation
- Clinic isolation

## Key Features

✅ **Database Isolation**: Fresh database snapshot per test
✅ **External Service Mocking**: Razorpay and Twilio mocked
✅ **Happy Path & Error Cases**: Coverage for success and failure scenarios
✅ **Multi-app Testing**: Backend API + Frontend browser tests
✅ **CI/CD Integration**: GitHub Actions workflow configured
✅ **Comprehensive Docs**: Full documentation included

## Troubleshooting

### Database Connection Error

```
Error: Can't reach database server at `localhost:5432`
```

**Solution**: Ensure PostgreSQL is running and the test database exists:

```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Or with Docker
docker ps | grep docita_test_db
```

### Environment Variables Not Loaded

If tests fail due to missing env vars, ensure `.env.test` exists in `apps/api/`:

```bash
ls -la apps/api/.env.test
```

### Twilio Validation Error

```
accountSid must start with AC
```

**Solution**: The `.env.test` file has been configured with valid Twilio-format values. If this error persists, verify the file exists and has the correct values.

### Razorpay Initialization Error

```
`key_id` or `oauthToken` is mandatory
```

**Solution**: Ensure Razorpay mock provider is properly loaded. Check that test files import and override the `RazorpaySubscriptionGateway` provider.

## Next Steps

1. **Set up PostgreSQL** using one of the options above
2. **Run backend tests**: `pnpm --filter api test:e2e`
3. **Set up frontend tests**: Ensure backend is running, then `pnpm --filter @docita/app test:e2e`
4. **Push to GitHub**: Workflow will run on every push
5. **Phase 2 Testing** (Deferred):
   - Appointment booking flows
   - Invoice & billing scenarios
   - Prescription management
   - Multi-clinic workflows

## Files Created

**Backend Test Infrastructure**

- `apps/api/test/setup.ts` - Database initialization and reset
- `apps/api/test/factories.ts` - Test data factories
- `apps/api/test/razorpay.provider.ts` - Razorpay mock provider
- `apps/api/test/whatsapp.provider.ts` - Twilio/WhatsApp mock provider
- `apps/api/test/setup-env.ts` - Environment variable loader
- `apps/api/test/jest-e2e.json` - Jest configuration
- `apps/api/.env.test` - Test environment variables

**Backend Test Suites**

- `apps/api/test/app.e2e-spec.ts` - Basic app health test
- `apps/api/test/auth.e2e-spec.ts` - 6 authentication tests
- `apps/api/test/patients.e2e-spec.ts` - 11 patient management tests

**Frontend Test Infrastructure**

- `apps/app/playwright.config.ts` - Playwright configuration
- `apps/app/.env.test` - Frontend test environment

**Frontend Test Suites**

- `apps/app/e2e/auth.spec.ts` - 3 browser authentication tests
- `apps/app/e2e/patients.spec.ts` - 5 browser patient tests

**CI/CD**

- `.github/workflows/test.yml` - GitHub Actions pipeline

**Documentation**

- `docs/TESTING.md` - Comprehensive testing guide (300+ lines)
- `TESTING_SETUP.md` - Quick setup guide (400+ lines)
