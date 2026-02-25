# Import Path Mapping - Old → New

This document maps all import paths from the old module structure to the new DDD structure.

## Module Imports (app.module.ts and internal imports)

### Business Domains (modules/ → domains/)

| Old Import                                                       | New Import                                              | Module                      | Status |
| ---------------------------------------------------------------- | ------------------------------------------------------- | --------------------------- | ------ |
| `./modules/patients/patients.module`                             | `./domains/patients/patients.module`                    | PatientsModule              | -      |
| `./modules/appointments/appointments.module`                     | `./domains/appointments/appointments.module`            | AppointmentsModule          | -      |
| `./modules/prescriptions/prescriptions.module`                   | `./domains/prescriptions/prescriptions.module`          | PrescriptionsModule         | -      |
| `./modules/invoices/invoices.module`                             | `./domains/invoices/invoices.module`                    | InvoicesModule              | -      |
| `./modules/documents/documents.module`                           | `./domains/documents/documents.module`                  | DocumentsModule             | -      |
| `./modules/dashboard/dashboard.module`                           | `./domains/dashboards/dashboards.module`                | DashboardModule             | -      |
| `./modules/uploads/uploads.module`                               | `./domains/documents/uploads.module`                    | UploadsModule               | -      |
| `./modules/templates/templates.module`                           | `./domains/documents/templates.module`                  | TemplatesModule             | -      |
| `./modules/custom-fields/custom-fields.module`                   | `./domains/custom-fields/custom-fields.module`          | CustomFieldsModule          | -      |
| `./modules/analytics/analytics.module`                           | `./domains/analytics/analytics.module`                  | AnalyticsModule             | -      |
| `./modules/reminders/reminders.module`                           | `./domains/reminders/reminders.module`                  | RemindersModule             | -      |
| `./modules/clinics/clinics.module`                               | `./domains/clinics/clinics.module`                      | ClinicsModule               | -      |
| `./modules/doctor-clinics/doctor-clinics.module`                 | `./domains/doctor-clinics/doctor-clinics.module`        | DoctorClinicsModule         | -      |
| `./modules/doctors/doctors.module`                               | `./domains/doctors/doctors.module`                      | DoctorsModule               | -      |
| `./modules/payments/payments.module`                             | `./domains/payments/payments.module`                    | PaymentsModule              | -      |
| `./modules/subscription/subscription.module`                     | `./domains/subscription/subscription.module`            | SubscriptionModule          | -      |
| `./modules/billing/billing.module`                               | `./domains/billing/billing.module`                      | BillingModule               | -      |
| `./modules/prescription-templates/prescription-templates.module` | `./domains/prescriptions/prescription-templates.module` | PrescriptionTemplatesModule | -      |
| `./modules/medical-coding/medical-coding.module`                 | `./domains/clinical/medical-coding.module`              | MedicalCodingModule         | -      |
| `./modules/lab-tests/lab-tests.module`                           | `./domains/clinical/lab-tests.module`                   | LabTestsModule              | -      |
| `./modules/inventory/inventory.module`                           | `./domains/inventory/inventory.module`                  | InventoryModule             | -      |
| `./modules/feedback/feedback.module`                             | `./domains/feedback/feedback.module`                    | FeedbackModule              | -      |
| `./modules/users/users.module`                                   | `./domains/users/users.module`                          | UsersModule                 | -      |
| `./modules/onboarding/onboarding.module`                         | `./domains/onboarding/onboarding.module`                | OnboardingModule            | -      |
| `./modules/ipd/ipd.module`                                       | `./domains/ipd/ipd.module`                              | IpdModule                   | -      |
| `./modules/queue/queue.module`                                   | `./domains/queue/queue.module`                          | QueueModule                 | -      |
| `./modules/patient-portal/patient-portal.module`                 | `./domains/patients/patient-portal.module`              | PatientPortalModule         | -      |

### Shared Infrastructure (modules/ → shared/modules/)

| Old Import                                 | New Import                                        | Module            | Status |
| ------------------------------------------ | ------------------------------------------------- | ----------------- | ------ |
| `./modules/imports/imports.module`         | `./shared/modules/imports/imports.module`         | ImportsModule     | -      |
| `./modules/whatsapp/whatsapp.module`       | `./shared/modules/messaging/whatsapp.module`      | WhatsappModule    | -      |
| `./modules/super-admin/super-admin.module` | `./shared/modules/super-admin/super-admin.module` | SuperAdminModule  | -      |
| `./modules/config/config.module`           | `./shared/modules/config/config.module`           | AppConfigModule   | -      |
| `./modules/monitoring/monitoring.module`   | `./shared/modules/monitoring/monitoring.module`   | MonitoringModule  | -      |
| `./modules/fhir/fhir.module`               | `./shared/modules/fhir/fhir.module`               | FhirModule        | -      |
| `./modules/contact/contact.module`         | `./shared/modules/contact/contact.module`         | ContactModule     | -      |
| `./modules/ai/ai.module`                   | `./shared/modules/ai/ai.module`                   | AIModule          | -      |
| `./modules/audit/audit.module`             | `./shared/modules/audit/audit.module`             | AuditModule       | -      |
| `./modules/performance/performance.module` | `./shared/modules/performance/performance.module` | PerformanceModule | -      |
| `./modules/compliance/compliance.module`   | `./shared/modules/compliance/compliance.module`   | ComplianceModule  | -      |
| `./modules/auth/auth.module`               | `./shared/modules/auth/auth.module`               | AuthModule        | -      |

### Common Infrastructure (common/ → shared/modules/)

| Old Import                        | New Import                                | Module               | Status |
| --------------------------------- | ----------------------------------------- | -------------------- | ------ |
| `./common/mocks/mock-bull.module` | `./shared/modules/mocks/mock-bull.module` | MockBullModule       | -      |
| `./common/events`                 | `./shared/modules/events`                 | EventsModule         | -      |
| `./common/services`               | `./shared/modules/services`               | CommonServicesModule | -      |

### Guard/Interceptor Imports

| Old Import                                           | New Import                                                   | Status |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------ |
| `./modules/auth/jwt-auth.guard`                      | `./shared/modules/auth/jwt-auth.guard`                       | -      |
| `./modules/auth/roles.guard`                         | `./shared/modules/auth/roles.guard`                          | -      |
| `./common/interceptors/tenant-context.interceptor`   | `./shared/modules/interceptors/tenant-context.interceptor`   | -      |
| `./common/interceptors/cache.interceptor`            | `./shared/modules/interceptors/cache.interceptor`            | -      |
| `./common/interceptors/patient-audit.interceptor`    | `./shared/modules/interceptors/patient-audit.interceptor`    | -      |
| `./common/interceptors/emergency-access.interceptor` | `./shared/modules/interceptors/emergency-access.interceptor` | -      |
| `./common/interceptors/request-id.interceptor`       | `./shared/modules/interceptors/request-id.interceptor`       | -      |
| `./common/interceptors/request-context.interceptor`  | `./shared/modules/interceptors/request-context.interceptor`  | -      |
| `./common/interceptors/csrf.interceptor`             | `./shared/modules/interceptors/csrf.interceptor`             | -      |
| `./common/interceptors/rate-limit.interceptor`       | `./shared/modules/interceptors/rate-limit.interceptor`       | -      |

## Service/Controller Imports

These are internal imports within services and controllers that reference other modules:

### Database Access (repositories)

- `./modules/auth/roles.decorator` → `./shared/modules/auth/roles.decorator`
- `./modules/auth/public.decorator` → `./shared/modules/auth/public.decorator`

### Common Decorators

- From `./common/decorators/*` → `./shared/modules/decorators/*`

### Common Filters, Guards, Middleware

- From `./common/filters/*` → `./shared/modules/filters/*`
- From `./common/guards/*` → `./shared/modules/guards/*`
- From `./common/middleware/*` → `./shared/modules/middleware/*`
- From `./common/pipes/*` → `./shared/modules/pipes/*`

## Update Strategy

### Phase 1: Update app.module.ts (1 file)

- Update all module imports in app.module.ts
- Update all interceptor/guard imports
- Test: `pnpm --filter @docita/api build`

### Phase 2: Update auth-related imports (5+ files)

- `src/app.controller.ts`
- Common controllers that use auth decorators
- Update from `./modules/auth/*` → `./shared/modules/auth/*`
- Test: `pnpm --filter @docita/api build`

### Phase 3: Update common/ infrastructure imports (10+ files)

- `src/common/controllers/*.ts`
- `src/common/services/*.ts`
- Update all internal references to decorators, guards, filters, pipes
- Test after each group

### Phase 4: Update domain service imports (30+ files)

- Services importing auth, database, config, etc.
- Update from old paths to shared/modules
- Test: `pnpm --filter @docita/api build`

### Phase 5: Update test files (80+ files)

- Update mock imports
- Update service imports
- Test: `pnpm --filter @docita/api test`

## Notes

- Use case-insensitive search for imports
- Search patterns: `from './modules/X'`, `from '../modules/X'`, `from '../../modules/X'` etc.
- Same for `common/`
- Some modules may need structural changes (e.g., module.ts files that re-export imports)
- After all updates, run full test suite to validate
