# Module Boundaries & Public APIs

This document defines the public API for each module to ensure clean separation of concerns and prevent circular dependencies.

## Core Infrastructure Modules

### PrismaModule
**Responsibility:** Database abstraction and query layer
**Public Exports:**
- PrismaService

**Dependencies:** None (foundation module)

---

### CommonServicesModule
**Responsibility:** Shared business services (email, encryption, observability)
**Public Exports:**
- ObservabilityService
- HealthCheckController
- RequestContextInterceptor

**Dependencies:** PrismaModule, ConfigModule

---

### EventsModule
**Responsibility:** Event-driven architecture support
**Public Exports:**
- EventBus
- EventListener decorator
- Event types

**Dependencies:** None (independent)

---

## Domain Modules

### AuthModule
**Responsibility:** Authentication, authorization, token management
**Public Exports:**
- AuthService
- JwtAuthGuard
- RolesGuard
- JwtStrategy

**Dependencies:**
- PrismaModule
- CommonServicesModule (for logging)

**Who Depends on AuthModule:**
- All modules that require authenticated endpoints

---

### PatientsModule
**Responsibility:** Patient data management
**Public Exports:**
- PatientsService
- PatientsController

**Interfaces:**
```typescript
export interface IPatientRepository {
  create(data: any): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  findByClinic(clinicId: string): Promise<Patient[]>;
  update(id: string, data: any): Promise<Patient>;
  delete(id: string): Promise<Patient>;
}
```

**Dependencies:**
- PrismaModule
- AuthModule (for @Roles decorators)
- CommonServicesModule (for validation/logging)

**Protected Internal Services:**
- PatientRepository (injected into PatientsService only)

---

### AppointmentsModule
**Responsibility:** Appointment scheduling, conflict detection, status management
**Public Exports:**
- AppointmentsService
- AppointmentsController
- AppointmentSchedulingRulesService (domain service)

**Interfaces:**
```typescript
export interface IAppointmentRepository {
  create(data: any): Promise<Appointment>;
  findById(id: string): Promise<Appointment | null>;
  findByDoctor(doctorId: string, date: Date): Promise<Appointment[]>;
  findByPatient(patientId: string): Promise<Appointment[]>;
  update(id: string, data: any): Promise<Appointment>;
  delete(id: string): Promise<Appointment>;
}
```

**Dependencies:**
- PrismaModule
- AuthModule
- CommonServicesModule
- PatientsModule (to validate patient existence)

**Query Patients Privately:**
- Use PatientsService.getPatient() to verify patient exists
- Never directly access PatientsRepository

---

### PrescriptionsModule
**Responsibility:** Prescription creation, validation, refill management
**Public Exports:**
- PrescriptionsService
- PrescriptionsController
- PrescriptionValidationRulesService (domain service)

**Dependencies:**
- PrismaModule
- AuthModule
- CommonServicesModule
- AppointmentsModule (to link prescriptions to consultations)

---

### InvoicesModule
**Responsibility:** Invoice generation, calculations, payment tracking
**Public Exports:**
- InvoicesService
- InvoicesController
- InvoiceCalculationRulesService (domain service)

**Dependencies:**
- PrismaModule
- AuthModule
- CommonServicesModule

---

### PaymentsModule
**Responsibility:** Payment processing, Razorpay integration, webhooks
**Public Exports:**
- PaymentsService
- PaymentsController
- PaymentWebSocketGateway

**Dependencies:**
- PrismaModule
- AuthModule
- CommonServicesModule
- InvoicesModule (to update invoice payment status)

**Integration Points:**
- PaymentsService.updateInvoicePayment() → InvoicesService
- Never directly mutate Invoice data; use InvoicesService

---

## Feature Modules

### WhatsappModule
**Responsibility:** WhatsApp messaging, appointment reminders, notification delivery
**Public Exports:**
- WhatsappService
- WhatsappController

**Dependencies:**
- PrismaModule
- AuthModule
- CommonServicesModule
- AppointmentsModule (to send appointment reminders)
- PatientsModule (to get patient phone numbers)

---

### EmailModule (implicit in CommonServices)
**Responsibility:** Email delivery, templates
**Public Exports:**
- EmailService

**Dependencies:**
- ConfigModule
- PrismaModule

---

### TemplatesModule
**Responsibility:** Email/SMS template management
**Public Exports:**
- TemplatesService
- TemplatesController

**Dependencies:**
- PrismaModule
- AuthModule

---

### DashboardModule
**Responsibility:** Clinic overview, metrics, quick stats
**Public Exports:**
- DashboardService
- DashboardController

**Responsibilities:**
- Aggregate data from: AppointmentsModule, PatientsModule, InvoicesModule, PaymentsModule
- Never expose internal details; use public service methods only

**Dependencies:**
- PrismaModule
- AuthModule
- AppointmentsModule
- PatientsModule
- InvoicesModule
- PaymentsModule

---

### RemindersModule
**Responsibility:** Scheduled reminders for appointments, follow-ups
**Public Exports:**
- RemindersService
- RemindersScheduler

**Dependencies:**
- PrismaModule
- AuthModule
- AppointmentsModule (to get appointments for reminding)
- WhatsappModule (to send reminders)
- EmailModule (to send reminders)

---

### MonitoringModule
**Responsibility:** Request logging, error tracking, metrics
**Public Exports:**
- MonitoringService

**Dependencies:**
- PrismaModule
- CommonServicesModule (ObservabilityService)

---

### AuditModule
**Responsibility:** PHI access logging, compliance tracking
**Public Exports:**
- AuditService
- AuditController

**Dependencies:**
- PrismaModule
- AuthModule

---

## Dependency Graph Rules

### ✅ ALLOWED:
- Modules depend on PrismaModule
- Modules depend on AuthModule (for guards/decorators)
- Modules depend on CommonServicesModule (for shared services)
- Parent modules depend on child modules (e.g., AppModule → AppointmentsModule)
- Feature modules depend on domain modules (e.g., RemindersModule → AppointmentsModule)

### ❌ PROHIBITED:
- Circular dependencies (e.g., A → B → A)
- Child modules depending on parent modules
- Cross-domain module dependencies (e.g., PatientsModule → InvoicesModule)
- Direct repository access outside of owning service
- Direct database queries in controllers

---

## Migration Path for Circular Dependencies

If a circular dependency is discovered:

1. **Identify:** Use `npx dpdm --detect-circular` or manual inspection
2. **Break:** Extract shared logic to CommonServicesModule or new EventsModule
3. **Test:** Verify no import errors; run unit tests
4. **Document:** Update this file

Example:
- If PaymentsModule → InvoicesModule and InvoicesModule → PaymentsModule
- Extract shared interface to packages/types
- Use EventBus for event-driven communication instead

---

## Testing Module Boundaries

Each module should have:
1. `.module.ts` - Clear imports/exports
2. `*.service.ts` - Domain logic, dependency injection
3. `*.controller.ts` - HTTP routes, request/response handling
4. `.spec.ts` files - Mocked dependencies, isolated tests

No test should import from another module's internal files (repositories, helpers, etc.)

---

**Last Updated:** 2026-02-12
**Next Review:** When new modules are added
