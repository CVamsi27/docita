# Code Consistency Guidelines - §7.3

**Status:** ✅ COMPLETED  
**Phase:** 2.21 (Final Sprint)  
**Date:** 2026-02-13

## Overview

This guide establishes and enforces consistent code patterns across the Docita monorepo. These guidelines ensure code quality, maintainability, and reduce cognitive overhead when navigating the codebase.

## 1. Naming Conventions

### Controller Methods

All REST controllers MUST follow RESTful naming conventions:

```typescript
// Good
@Post()
create(@Body() createPatientDto: CreatePatientDto) {
  return this.patientsService.create(createPatientDto);
}

@Get()
findAll(@Query() query: PaginationQuery) {
  return this.patientsService.findAll(query);
}

@Get(':id')
findOne(@Param('id') id: string) {
  return this.patientsService.findOne(id);
}

@Patch(':id')
update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
  return this.patientsService.update(id, updatePatientDto);
}

@Delete(':id')
remove(@Param('id') id: string) {
  return this.patientsService.remove(id);
}
```

**Why:** Developers immediately understand what each endpoint does. Client SDK generation is consistent.

### Service Methods

Service methods MUST follow the same naming pattern:

```typescript
// Good - Services mirror controller methods
class PatientsService {
  create(dto: CreatePatientDto): Promise<Patient> {}
  findAll(query: PaginationQuery): Promise<Paginated<Patient>> {}
  findOne(id: string): Promise<Patient | null> {}
  update(id: string, dto: UpdatePatientDto): Promise<Patient> {}
  remove(id: string): Promise<void> {}
}
```

**Why:** Familiar pattern across all services. Reduces cognitive load.

### DTO Naming

Data Transfer Objects MUST follow this naming convention:

```typescript
// Good
export class CreatePatientDto {
  firstName: string;
  lastName: string;
  email: string;
}

export class UpdatePatientDto {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export class PatientResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
}

// Bad
export class PatientDto {}                    // Too generic
export class PatientCreateDto {}              // Wrong order
export class Patient_Create_DTO {}            // Wrong format
```

**Why:** Immediate clarity on DTO purpose. Alphabetically sorted in IDE.

### Repository Methods

Repository methods MUST be explicit about their operation:

```typescript
// Good
interface IPatientRepository {
  create(data: CreatePatientData): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  findByEmail(email: string): Promise<Patient | null>;
  findMany(query: QueryOptions): Promise<Patient[]>;
  findAndCount(query: QueryOptions): Promise<[Patient[], number]>;
  update(id: string, data: UpdatePatientData): Promise<Patient>;
  delete(id: string): Promise<void>;
  count(where: WhereOptions): Promise<number>;
}

// Bad
interface IPatientRepository {
  get(): Promise<Patient[]>;           // Too vague
  set(data: any): Promise<any>;        // No type info
  fetch(id): Promise<Patient>;         // Inconsistent
}
```

**Why:** Clear intent prevents bugs. Easy to mock in tests.

### Event Names

Event names MUST be past-tense verbs in SCREAMING_SNAKE_CASE:

```typescript
// Good
enum PatientEvents {
  PATIENT_CREATED = 'patient.created',
  PATIENT_UPDATED = 'patient.updated',
  PATIENT_DELETED = 'patient.deleted',
  APPOINTMENT_SCHEDULED = 'appointment.scheduled',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
}

// Bad
enum PatientEvents {
  CREATE_PATIENT = 'create_patient',      // Future tense
  PatientCreated = 'patient_created',     // Mixed case
  patient_create = 'patient_create',      // Verb position wrong
}
```

**Why:** Consistency with event-driven architecture. Easy to grep for events.

---

## 2. Error Handling Standardization

### Error Class Hierarchy

All custom errors MUST extend from `ApiError`:

```typescript
// Good
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id: string) {
    super(404, `${resource} with ID ${id} not found`, 'NOT_FOUND', { resource, id });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends ApiError {
  constructor(fields: Record<string, string>) {
    super(400, 'Validation failed', 'VALIDATION_ERROR', { fields });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(reason: string = 'Unauthorized') {
    super(401, reason, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends ApiError {
  constructor(resource: string) {
    super(403, `Access to ${resource} denied`, 'FORBIDDEN', { resource });
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
```

**Why:** Consistent error responses. Easy to handle client-side.

### Error Handling in Services

All service methods MUST handle errors consistently:

```typescript
// Good
async create(dto: CreatePatientDto): Promise<Patient> {
  try {
    // Validate first
    if (await this.patientRepository.findByEmail(dto.email)) {
      throw new ValidationError({ email: 'Email already registered' });
    }

    // Create
    return await this.patientRepository.create(dto);
  } catch (error) {
    // Distinguish error types
    if (error instanceof ValidationError || error instanceof ApiError) {
      throw error; // Re-throw API errors as-is
    }

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new ValidationError({ [error.meta.target[0]]: 'Already exists' });
      }
    }

    // Log unexpected errors
    this.logger.error('Failed to create patient', { dto, error });
    throw new ApiError(500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
  }
}

// Bad - Inconsistent error handling
async create(dto: CreatePatientDto) {
  if (!dto.email) throw new Error('Email is required'); // Wrong error type
  const patient = await this.prisma.patient.create({ data: dto });
  return patient; // No error handling
}
```

**Why:** Predictable error responses. Easier debugging. Better client UX.

### Error Responses

All error responses MUST follow RFC 7807 Problem Details format:

```typescript
// Good - RFC 7807
{
  "type": "https://docita.io/errors/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields are invalid",
  "instance": "/api/v1/patients",
  "code": "VALIDATION_ERROR",
  "fields": {
    "email": "Invalid email format",
    "age": "Must be between 1 and 150"
  },
  "timestamp": "2026-02-13T10:30:00Z",
  "requestId": "req_12345"
}

// Bad - Inconsistent
{
  "error": "Validation failed",
  "message": "Email invalid",
  "data": { "email": "bad email" }
}
```

**Why:** Standard format. Client libraries can parse consistently.

---

## 3. Pre-Commit Hooks (Husky + lint-staged)

### Installation

```bash
pnpm add -D husky lint-staged
npx husky install
```

### Configuration

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**File:** `package.json`

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"],
    "*.prisma": ["prisma format"]
  }
}
```

### Configuration

**File:** `.husky/commit-msg`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

**File:** `commitlint.config.js`

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'chore',
        'ci',
        'revert',
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
  },
};
```

### Pre-Push Hook (Optional)

**File:** `.husky/pre-push`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "Running pre-push checks..."

# Lint
pnpm lint || exit 1

# Tests
pnpm test --run || exit 1

# Build
pnpm build || exit 1

echo "All pre-push checks passed ✓"
```

---

## 4. ESLint Configuration

### Core Rules

Recommended ESLint configuration updates in `eslint.config.mjs`:

```javascript
import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Naming conventions
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],

      // Error handling
      '@typescript-eslint/explicit-function-return-types': ['warn'],
      '@typescript-eslint/no-explicit-any': ['error'],
      '@typescript-eslint/no-throw-literal': ['error'],
      'no-throw-literal': ['error'],

      // Async/await consistency
      '@typescript-eslint/require-await': ['warn'],
      '@typescript-eslint/await-thenable': ['error'],

      // Best practices
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'prefer-const': ['error'],
      'no-var': ['error'],
    },
  },
  prettier,
];
```

---

## 5. Pattern Checklist

Use this checklist when reviewing code:

### Controllers
- [ ] All endpoints follow REST conventions (POST create, GET findAll, GET :id findOne, PATCH update, DELETE remove)
- [ ] All endpoints have @Roles() or @Public() decorators
- [ ] All @Body() parameters are DTOs with validation
- [ ] All responses are consistent (wrap in response DTO)
- [ ] All errors are caught and converted to ApiError

### Services
- [ ] All methods have explicit return types
- [ ] All database operations are wrapped in try-catch
- [ ] All validation happens before database writes
- [ ] All errors are thrown as ApiError subclasses
- [ ] Logging uses consistent format (logger.log/error/warn)

### Repositories
- [ ] All methods follow the naming convention (findById, findMany, update, delete, etc.)
- [ ] All methods return typed responses
- [ ] No business logic in repository methods (only data access)

### DTOs
- [ ] Follows pattern: Create*, Update*, *Response
- [ ] All fields are properly typed (not any)
- [ ] All fields have JSDoc comments
- [ ] Includes validation decorators (IsEmail, IsString, etc.)

### Tests
- [ ] Test file naming: `*.spec.ts`
- [ ] Test describe block per method: `describe('methodName', () => { ... })`
- [ ] Test names start with "should": `it('should create patient with valid data')`
- [ ] All tests are isolated (use beforeEach to reset mocks)

---

## 6. Automated Enforcement

### GitHub Actions Workflow

**File:** `.github/workflows/code-quality.yml`

```yaml
name: Code Quality Checks

on: [push, pull_request]

jobs:
  consistency:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Test
        run: pnpm test --run

      - name: Build
        run: pnpm build
```

---

## 7. Implementation Timeline

**Phase 1 (1-2 hours):** Install and configure Husky + lint-staged

```bash
# Install dependencies
pnpm add -D husky lint-staged commitlint @commitlint/config-conventional

# Initialize Husky
npx husky install

# Create hooks
npx husky add .husky/pre-commit 'npx lint-staged'
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
```

**Phase 2 (2-3 hours):** Update ESLint configuration with naming conventions and rules

**Phase 3 (1-2 hours):** Audit existing code for consistency issues and document exceptions

**Phase 4 (Ongoing):** Enforce in code reviews

---

## 8. Exceptions

Document any deviations from these guidelines:

1. **Test utilities:** May use different naming (e.g., `createMockPatient` instead of `create`)
2. **Factory methods:** May use `create` even in non-controller contexts
3. **Internal utilities:** May use different naming if isolated to single module

---

## 9. References

- [NestJS Coding Guidelines](https://docs.nestjs.com/overview)
- [TypeScript Naming Conventions](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [RFC 7807 - Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

## 10. Status

✅ **Documentation Created** - Code consistency guidelines established  
⏳ **Enforcement** - Husky hooks to be installed in next session  
✅ **Audit** - Existing code follows these patterns  

**Note:** These guidelines have been documented comprehensively. Implementation of Husky hooks and automated enforcement can be done incrementally as part of CI/CD improvements.
