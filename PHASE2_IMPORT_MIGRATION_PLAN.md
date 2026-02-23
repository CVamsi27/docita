# Phase 2: Import Path Migration Plan

**Status**: Started - app.module.ts updated, remaining work scoped  
**Date**: February 23, 2026  
**Errors to Fix**: 367 TypeScript compilation errors  
**Files Affected**: ~100+ files across domains/ and shared/modules/

## Completed Work

### ✅ app.module.ts Updated

- Updated all 50+ module imports to use correct paths from domains/ and shared/modules/
- Commented out 4 missing modules (Documents, Inventory, IPD, Queue) with TODOs
- Fixed imports for:
  - **Domains**: patients, appointments, prescriptions, invoices, dashboards, uploads, templates, analytics, clinics, etc.
  - **Shared Modules**: auth, monitoring, audit, imports, super-admin, messaging, etc.
  - **Interceptors & Guards**: All 10 interceptors redirected to shared/modules/interceptors/
  - **Extensibility**: Events, CommonServices, MockBullModule moved to shared/

**Key Discoveries:**

- Auth module structure: `./shared/modules/auth/auth/auth.module.ts` (nested auth folder)
- Monitoring module structure: `./shared/modules/monitoring/monitoring/monitoring.module.ts` (nested)
- Dashboard: `./domains/dashboards/dashboard/dashboard.module.ts` (nested)
- Other modules are one level: `./domains/billing/billing.module.ts`
- Inconsistent folder nesting across modules (needs standardization in future)

## Current Error Analysis

### Error Count: 367 TypeScript Errors

**Error Type Breakdown (from build output):**

- **TS2307** (Cannot find module): ~50-100 errors - old relative import paths in:
  - `src/app.controller.ts`: Imports from `./modules/auth/`
  - `src/common/controllers/*.ts`: Import from `../../modules/auth/`
  - `src/common/interceptors/*.ts`: Import from `../../modules/audit/`
  - `src/shared/modules/contact/*.ts`: Import from `../auth/public.decorator`
  - `src/shared/modules/contact/*.ts`: Import from `../../common/pipes/`
  - `src/shared/modules/database/*.ts`: Import from `../../prisma/` and `../select-fragments`

- **TS7006** (~250+ errors): Parameter implicitly has 'any' type - mostly in:
  - `src/shared/modules/database/repositories/patients.repository.ts`
  - Various arrow functions missing type annotations

### File Groups Needing Updates

**Group 1: Common Infrastructure (10-15 files)**

- `src/app.controller.ts`
- `src/common/controllers/*.ts`
- `src/common/services/*.ts`
- `src/common/filters/*.ts`
- `src/common/guards/*.ts`
- `src/common/interceptors/*.ts` (already partially copied)
- `src/common/middleware/*.ts`
- `src/common/pipes/*.ts`

**Group 2: Shared Modules - Relative Imports (30-40 files)**

- `src/shared/modules/auth/auth/` - files importing decorators from same module
- `src/shared/modules/database/` - files importing repositories, fragments
- `src/shared/modules/contact/` - importing from auth, pipes
- `src/shared/modules/messaging/` - relative imports between email, whatsapp, notifications

**Group 3: Domain Services (40-60 files)**

- Services in each domain importing from:
  - `../../shared/modules/auth/` (guards, decorators)
  - `../../shared/modules/database/` (repositories)
  - `../../shared/modules/config/` (configuration)
  - `../../shared/modules/audit/` (AuditService)

**Group 4: Test Files (100+ files)**

- `.spec.ts` files importing from wrong paths
- Mock helpers in `src/common/mocks/`

**Group 5: Type Annotations (250+ issues)**

- Parameters missing explicit types throughout repositories
- Arrow functions in array methods without type annotations

## Migration Strategy - Phased Approach

### Phase 2a: Fix Direct Import Errors (Days 1-2)

**Goal**: Get compilation working by fixing TS2307 "Cannot find module" errors

1. **Fix app-level controller imports (2-3 files)**
   - `src/app.controller.ts`: Change `./modules/auth/public.decorator` → `./shared/modules/auth/auth/public.decorator`
   - `src/common/controllers/database-operations.controller.ts`: Similar auth imports

2. **Update common/ imports (8-12 files)**
   - All files in `src/common/` need to check for imports from `../modules/` or `.../../modules/`
   - Search patterns:
     - `from '../../modules/auth/*.ts'` → `from '../../shared/modules/auth/auth/*.ts'`
     - `from '../../modules/audit/'` → `from '../../shared/modules/audit/audit/'`
   - Update common/interceptors/\*.ts files to import from shared/modules/

3. **Fix relative imports within shared/modules (10-15 files)**
   - `src/shared/modules/contact/contact.controller.ts`: Fix auth decorator import
   - `src/shared/modules/database/repositories/`: Fix prisma service and select-fragments imports
   - Ensure paths use correct directory nesting (e.g., `/auth/auth/` not `/auth/`)

4. **Test**: `pnpm --filter @docita/api build 2>&1 | grep "error TS2307" | wc -l`
   - Target: Reduce TS2307 errors from ~100 to 0

### Phase 2b: Fix Type Annotation Errors (Days 2-3)

**Goal**: Fix remaining TS7006 "implicitly any" errors

1. **Identify affected files**
   - Primary: `src/shared/modules/database/repositories/patients.repository.ts` (~10+ errors in this file alone)
   - Update arrow function parameters with explicit types
   - Example fix:
     ```typescript
     // Before
     (apt) => apt.status === AppointmentStatus.COMPLETED
     // After
     (apt: Appointment) => apt.status === AppointmentStatus.COMPLETED
     ```

2. **Batch fixes by file**
   - Go through shared/modules and domain services
   - Add type Annotations to all lambdas and high-order functions

3. **Test**: `pnpm --filter @docita/api build 2>&1 | grep "error TS7006" | wc -l`
   - Target: Reduce TS7006 errors from ~250 to 0

### Phase 2c: Create Missing Domain Modules (Days 3-4)

**Goal**: Implement DocumentsModule, InventoryModule, IpdModule, QueueModule

For each module:

1. Create `module.ts` file with NestJS module definition
2. Create `*.service.ts` and `*.controller.ts` files
3. Import in app.module.ts (uncomment)
4. Implement core functionality

Timeline:

- DocumentsModule: Should consolidate templates + uploads (inherit existing logic)
- InventoryModule: Simplified inventory management
- IpdModule: In-patient department module
- QueueModule: Virtual queue management

### Phase 2d: Systematic Testing (Days 4-5)

**Goal**: Ensure build passes and tests run successfully

1. **Build validation**
   - `pnpm --filter @docita/api build` should complete with 0 errors
   - No unused variable warnings

2. **Unit tests**
   - `pnpm --filter @docita/api test` should pass
   - Update test imports to use new paths

3. **Integration tests**
   - E2E tests in `apps/app` should work with new API structure

4. **Documentation**
   - Update FOLDER_STRUCTURE_RECOMMENDATIONS.md with actual structure
   - Create developer guide for new organization

## Recommended Tools & Scripts

### 1. Search & Replace (Per Error Group)

**For auth imports in common/**

```bash
# Files in src/common/* need imports updated
find src/common -name "*.ts" -not -name "*.spec.ts" | xargs \
  sed -i '' "s|from '../../modules/auth/|from '../../shared/modules/auth/auth/|g"
```

**For audit imports**

```bash
find src -name "*.ts" -not -name "*.spec.ts" | xargs \
  sed -i '' "s|from '../../modules/audit/|from '../../shared/modules/audit/audit/|g"
```

**For monitoring imports**

```bash
find src -name "*.ts" -not -name "*.spec.ts" | xargs \
  sed -i '' "s|from '../../modules/monitoring/|from '../../shared/modules/monitoring/monitoring/|g"
```

### 2. TypeScript Strict Mode

Add to `tsconfig.json` before fixing type errors:

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strict": true
  }
}
```

This will reveal all implicit any errors during type annotation phase.

### 3. Validation Script

Create `scripts/validate-imports.ts`:

```typescript
// Validation script to:
// 1. Check all imports use correct paths
// 2. Verify module exports match imports
// 3. Find duplicate definitions
// 4. Report circular dependencies
```

## Known Issues & Gotchas

### 1. Module Nesting Inconsistency

Some modules have nested directories (`auth/auth/`, `monitoring/monitoring/`) while others don't. This causes confusion:

- `auth` folder contains `auth/` subfolder with actual module files
- `monitoring` folder contains `monitoring/` subfolder
- But `contact` folder is flat (no nesting)

**Solution**: Standardize this in Phase 3 domain restructuring

### 2. Config Module Export Name

- File: `src/shared/modules/config/config.module.ts`
- Exports: `AppConfigModule` not `ConfigModule`
- app.module.ts already handles this with alias

### 3. Common Module Still Exists

- `src/common/` directory still has files that reference old import paths
- These are "copies" that haven't been fully replaced by `src/shared/modules/`
- Phase 3 plan: Remove `src/common/` entirely after migration

### 4. Circular Dependencies Possible

- Domains may import from shared/modules
- Shared modules may import from domain services
- Need circular dependency analysis after migration

## Effort Estimate

- **Phase 2a (Fix TS2307)**: 8-12 hours (systematic search & replace + manual review)
- **Phase 2b (Fix TS7006)**: 6-10 hours (careful type annotation additions)
- **Phase 2c (Missing Modules)**: 10-15 hours (implement 4 modules)
- **Phase 2d (Testing)**: 4-6 hours (validation and documentation)

**Total Phase 2**: ~30-45 developer hours (could be 2-3 weeks with other work)

## Success Criteria

- ✅ `pnpm --filter @docita/api build` completes with 0 errors
- ✅ All imports use paths from domains/ and shared/modules/
- ✅ No files in src/modules/ except config (temporary bridge)
- ✅ All unit tests pass
- ✅ All E2E tests pass
- ✅ Documentation updated with new structure
- ✅ No circular dependencies detected

## Next Immediate Actions

1. **Commit current progress** (app.module.ts updated)
2. **Run systematic find-replace for largest error groups** (auth, audit, monitoring)
3. **Test build after each batch of fixes**
4. **Document any special cases encountered**
5. **Consider using IDE refactoring tools** (VS Code rename symbol, TypeScript language server)

## Files to Update (Prioritized)

### HIGH PRIORITY (Blocking main build)

- [ ] `src/app.controller.ts`
- [ ] `src/common/controllers/database-operations.controller.ts`
- [ ] `src/common/controllers/health-check.controller.ts`
- [ ] `src/common/interceptors/*.ts`
- [ ] `src/shared/modules/contact/contact.controller.ts`
- [ ] `src/shared/modules/database/repositories/base.repository.ts`
- [ ] `src/shared/modules/database/repositories/patients.repository.ts`

### MEDIUM PRIORITY (Domain services)

- [ ] All files in `src/domains/*/` that import from `../../modules/`
- [ ] Services importing auth, audit, database, config

### LOW PRIORITY (Tests & cleanup)

- [ ] All `.spec.ts` files
- [ ] Cleanup `src/common/` after migration
- [ ] Remove duplicate module definitions

---

**Last Updated**: February 23, 2026  
**Next Review**: After Phase 2a completion (import path fixes)
