# Folder Structure Reorganization Summary

**Status**: Folder structure reorganized to DDD (Domain-Driven Design)  
**Date**: February 23, 2026  
**Work**: Completed folder moves (import updates to follow)

## Changes Made

### New Directory Structure Created

```
apps/api/src/
├── domains/              [Business domain modules]
│   ├── analytics/
│   ├── appointments/
│   ├── billing/
│   ├── clinics/
│   ├── clinical/         [lab-tests, medical-coding, medications combined]
│   ├── custom-fields/
│   ├── dashboards/       [formerly dashboard]
│   ├── doctor-clinics/
│   ├── doctors/
│   ├── documents/        [includes templates, uploads]
│   ├── feedback/
│   ├── inventory/
│   ├── invoices/
│   ├── ipd/
│   ├── onboarding/
│   ├── patients/         [includes patient-portal]
│   ├── payments/
│   ├── prescriptions/    [includes prescription-templates]
│   ├── queue/
│   ├── referrals/
│   ├── reminders/
│   ├── subscription/
│   ├── users/
│   └── webhooks/
│
├── shared/               [Cross-cutting concerns and infrastructure]
│   └── modules/
│       ├── abstractions/
│       ├── ai/
│       ├── ai-core/
│       ├── audit/
│       ├── auth/         [formerly modules/auth]
│       ├── builders/
│       ├── cache/
│       ├── compliance/
│       ├── config/       [app configuration]
│       ├── contact/
│       ├── database/     [repositories, pagination helpers]
│       ├── document-generation/
│       ├── dto/
│       ├── error-handling/
│       ├── extensions/
│       ├── fhir/
│       ├── imports/
│       ├── interceptors/ [tenant, cache, audit, CSRF, rate-limit, etc.]
│       ├── messaging/    [email, whatsapp combined]
│       ├── middleware/
│       ├── mocks/
│       ├── monitoring/
│       ├── performance/
│       ├── pipes/
│       ├── queue/
│       ├── search/
│       ├── services/     [common infrastructure services]
│       ├── super-admin/
│       ├── types/
│       └── utils/
│
├── modules/              [Only config/ remains - legacy, to be merged]
│   └── config/
│
└── [other: prisma/, gateways/, cache/, etc.]
```

## Modules Moved to domains/

From `modules/` → `domains/`:

- ✅ analytics
- ✅ appointments
- ✅ billing
- ✅ clinics
- ✅ custom-fields
- ✅ dashboard → `dashboards/`
- ✅ doctor-clinics
- ✅ doctors
- ✅ documents (includes templates + uploads)
- ✅ feedback
- ✅ inventory
- ✅ invoices
- ✅ ipd
- ✅ onboarding
- ✅ patients (includes patient-portal)
- ✅ payments
- ✅ prescriptions (includes prescription-templates)
- ✅ queue
- ✅ referrals
- ✅ reminders
- ✅ subscription
- ✅ users
- ✅ webhooks

## Modules Moved to shared/modules/

From `modules/` → `shared/modules/`:

- ✅ ai
- ✅ ai-core
- ✅ audit
- ✅ auth
- ✅ compliance
- ✅ config (app configuration)
- ✅ contact
- ✅ fhir
- ✅ imports
- ✅ monitoring
- ✅ performance
- ✅ search
- ✅ super-admin

From `common/` → `shared/modules/`:

- ✅ abstractions/
- ✅ builders/
- ✅ dto/
- ✅ extensions/
- ✅ interceptors/ (tenant, cache, audit, CSRF, rate-limit, patient-audit, request-id, request-context)
- ✅ middleware/
- ✅ pipes/
- ✅ services/
- ✅ types/
- ✅ utils/

## Combined Modules

Multiple related modules combined into single domains:

- **clinical/** ← lab-tests, medical-coding, medications
- **documents/** ← documents, templates, uploads
- **messaging/** ← email, whatsapp, notifications
- **patients/** ← patients, patient-portal

## Remaining Work

### Phase 1: Update Import Paths (Critical)

All files importing from old `modules/` paths need updating to new paths:

- `./modules/auth/` → `./shared/modules/auth/`
- `./modules/subscription/` → `./domains/subscription/`
- `./modules/payments/` → `./domains/payments/`
- `./modules/whatsapp/` → `./shared/modules/messaging/whatsapp/`
- etc.

### Phase 2: Module.ts Updates

Each domain and shared module needs its module.ts updated to reflect new imports and dependencies.

### Phase 3: Internal Module Structure (Optional - Future DDD Refactor)

Each domain CAN be further organized with DDD layers:

```
domains/billing/
├── core/          [Entity, value-objects, domain services]
├── application/   [Use cases, DTOs, ports]
├── infrastructure/[Repository implementations, external services]
└── presentation/  [Controllers, schemas, middleware]
```

This requires deeper refactoring beyond file moves.

## Build Status

⚠️ TypeScript compilation will fail until import paths are updated throughout the codebase.

## Files to Update (Summary)

Estimated 100+ files need import path updates:

- `app.module.ts` (primary imports)
- All service files importing from other domains/modules
- All controller files
- All module.ts files
- Seed files
- Test files

## Next Steps

1. Run a codemod or script to update import paths (`./modules/X` → `./domains/X` or `./shared/modules/X`)
2. Update all module exports and re-exports
3. Test build completion
4. Validate runtime behavior

## Rollback Instructions

```bash
git checkout -- apps/api/src/
```

This will restore all files to the original module-based structure if needed.
