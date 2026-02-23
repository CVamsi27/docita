# Shared Modules Documentation

Complete guide to all shared infrastructure modules used across the Docita platform. Each module provides critical cross-cutting concerns for the backend.

## Table of Contents

1. [Database Module](#database-module)
2. [Authentication Module](#authentication-module)
3. [Configuration Module](#configuration-module)
4. [Error Handling Module](#error-handling-module)
5. [Document Generation Module](#document-generation-module)
6. [Messaging Module](#messaging-module)
7. [Cache Module](#cache-module)
8. [Queue Module](#queue-module)
9. [Audit Module](#audit-module)

---

## Database Module

**Location**: `apps/api/src/shared/modules/database/`

Provides data access layer abstractions and base repository pattern.

### Files

- **repositories/base.repository.ts** - Generic base repository for CRUD operations
- **repositories/index.ts** - Barrel export
- **pagination.helper.ts** - Pagination utilities
- **database.module.ts** - Module definition
- **database-pooling.service.ts** - Connection pooling management
- **slow-query-logging.service.ts** - Query performance monitoring

### BaseRepository Usage

```typescript
import { BaseRepository } from "@workspace/modules/database";
import { PrismaService } from "@workspace/prisma";

@Injectable()
export class PatientRepository extends BaseRepository<Patient> {
  constructor(private prisma: PrismaService) {
    super(prisma, "patient");
  }

  protected getSearchFields(): string[] {
    return ["firstName", "lastName", "email", "phoneNumber"];
  }

  protected getDefaultSelect() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      clinic: { select: { id: true, name: true } },
    };
  }

  // Custom methods for patient-specific queries
  async findByClinicAndEmail(clinicId: string, email: string) {
    return this.model.findFirst({
      where: { clinicId, email },
      select: this.getDetailSelect(),
    });
  }
}
```

### Pagination Usage

```typescript
// Offset-based pagination
const result = await repository.findAll(
  { clinicId: "clinic-123" },
  { page: 1, limit: 20, sortBy: "created", sortOrder: "desc" },
);
// Returns: { data, total, page, limit, hasMore }

// Cursor-based pagination (better for real-time data)
const result = await repository.findAllWithCursor(
  { status: "ACTIVE" },
  { limit: 50, cursor: "patient-id-123" },
);
// Returns: { data, hasMore, cursor: nextId }
```

---

## Authentication Module

**Location**: `apps/api/src/shared/modules/auth/`

Handles JWT authentication, role-based access control, and authorization guards.

### Files

- **auth/auth.service.ts** - Core authentication service
- **auth/auth.controller.ts** - Auth endpoints
- **auth/jwt.strategy.ts** - JWT strategy for Passport
- **auth/jwt-auth.guard.ts** - JWT validation guard
- **auth/roles.guard.ts** - Role-based access guard
- **auth/roles.decorator.ts** - Role decorator for routes
- **auth/tier.guard.ts** - Subscription tier guard
- **auth/clinic-type.guard.ts** - Clinic type guard
- **auth/combined-auth.guard.ts** - Composite guard for multiple checks

### Usage Examples

```typescript
// Protect routes with JWT
@Controller("patients")
@UseGuards(JwtAuthGuard)
export class PatientsController {
  @Get()
  @Roles("CLINIC_ADMIN", "CLINIC_DOCTOR")
  async listPatients() {
    // Only clinic admins and doctors can list patients
  }

  @Get(":id")
  @RequireTier("CORE", "GROWTH", "SCALE")
  async getPatient(@Param("id") id: string) {
    // Only clinics on CORE tier or above can access
  }
}
```

### JWT Token Claims

```typescript
// Token payload includes:
{
  sub: userId,
  clinicId: string,
  role: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'CLINIC_DOCTOR' | 'STAFF',
  tier: 'CAPTURE' | 'CORE' | 'GROWTH' | 'SCALE' | 'ENTERPRISE',
  clinicType: 'HOSPITAL' | 'CLINIC' | 'DENTAL',
  permissions: string[],
  iat: timestamp,
  exp: timestamp
}
```

---

## Configuration Module

**Location**: `apps/api/src/shared/modules/config/`

Centralized configuration management for the application.

### Files

- **app-configuration.service.ts** - Service for accessing config values
- **app-config.ts** - Configuration schema
- **config.module.ts** - Module definition
- **index.ts** - Barrel export

### Configuration Keys

```typescript
// Database
DATABASE_URL: string; // PostgreSQL connection
DATABASE_MAX_CONNECTIONS: number; // Connection pool size

// JWT
JWT_SECRET: string; // Signing secret
JWT_EXPIRATION: string; // Token expiry (e.g., '7d')

// Redis (Cache & Queue)
REDIS_HOST: string; // Redis hostname
REDIS_PORT: string; // Redis port
REDIS_PASSWORD: string; // Redis password

// Payment Gateway
RAZORPAY_KEY_ID: string; // Razorpay public key
RAZORPAY_KEY_SECRET: string; // Razorpay secret key

// Email
SMTP_HOST: string; // Email server
SMTP_PORT: number;
SMTP_USER: string;
SMTP_PASSWORD: string;

// WhatsApp Cloud API
WHATSAPP_BUSINESS_ACCOUNT_ID: string;
WHATSAPP_PHONE_NUMBER_ID: string;
WHATSAPP_ACCESS_TOKEN: string;
WHATSAPP_WEBHOOK_VERIFY_TOKEN: string;

// AWS
AWS_REGION: string;
AWS_ACCESS_KEY_ID: string;
AWS_SECRET_ACCESS_KEY: string;
S3_BUCKET_DOCUMENTS: string;
S3_BUCKET_UPLOADS: string;
```

### Usage

```typescript
import { AppConfigurationService } from "@workspace/modules/config";

@Injectable()
export class EmailService {
  constructor(private config: AppConfigurationService) {}

  async sendEmail() {
    const smtpHost = this.config.get("SMTP_HOST");
    const smtpPort = this.config.getNumber("SMTP_PORT");
    // Use config values
  }
}
```

---

## Error Handling Module

**Location**: `apps/api/src/shared/modules/error-handling/`

Provides custom exception classes and global exception filter.

### Files

- **exceptions/application.exception.ts** - Base domain exception
- **exceptions/validation.exception.ts** - Validation errors
- **exceptions/not-found.exception.ts** - 404 errors
- **exceptions/conflict.exception.ts** - Conflict errors (409)
- **filters/global-exception.filter.ts** - Global exception handler
- **logger.service.ts** - Structured logging
- **error-handling.module.ts** - Module definition

### Exception Classes

```typescript
// Validation error
throw new ValidationException("Invalid input", {
  field: "email",
  message: "Email must be valid",
});

// Resource not found
throw new NotFoundException("Patient", "patient-123");

// Conflict (e.g., duplicate email)
throw new ConflictException("Email already exists");

// Business logic error
throw new ApplicationException(
  "SUBSCRIPTION_EXPIRED",
  { clinicId, tier: "GROWTH" },
  HttpStatus.PAYMENT_REQUIRED,
);
```

### Error Response Format

```typescript
// Success response
{ success: true, data: {...} }

// Validation error (400)
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details: [
      { field: 'email', message: 'Email must be valid' }
    ]
  }
}

// Not found (404)
{
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    resourceType: 'Patient',
    resourceId: 'patient-123'
  }
}

// Server error (500)
{
  success: false,
  error: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    trackingId: 'req-12345'  // For debugging
  }
}
```

---

## Document Generation Module

**Location**: `apps/api/src/shared/modules/document-generation/`

Builder pattern for generating PDFs (invoices, prescriptions, reports).

### Files

- **builders/document.interface.ts** - IDocumentBuilder interface
- **builders/base-document.builder.ts** - Abstract builder with common methods
- **builders/invoice-document.builder.ts** - Invoice builder
- **builders/prescription-document.builder.ts** - Prescription builder
- **renderers/pdf-renderer.service.ts** - PDF rendering
- **document-generation.service.ts** - Orchestrator
- **document-generation.module.ts** - Module definition

### Document Builder Usage

```typescript
import {
  InvoiceDocumentBuilder,
  DocumentGenerationService,
} from "@workspace/modules/document-generation";

@Injectable()
export class InvoiceService {
  constructor(
    private documentService: DocumentGenerationService,
    private pdfService: PdfRendererService,
  ) {}

  async generateInvoicePdf(invoiceId: string) {
    const builder = new InvoiceDocumentBuilder();
    const document = builder
      .setMetadata({ title: "Invoice", author: "Clinic" })
      .addHeader("INVOICE")
      .addClinicInfo(clinic)
      .addPatientInfo(patient)
      .addInvoiceItems([
        { description: "Consultation", amount: 500 },
        { description: "Lab Test", amount: 300 },
      ])
      .addTotals({ subtotal: 800, tax: 80, total: 880 })
      .addNotes("Thank you for choosing our clinic!")
      .build();

    const pdf = await this.pdfService.render(document);
    return pdf;
  }
}
```

---

## Messaging Module

**Location**: `apps/api/src/shared/modules/messaging/`

Multi-channel notifications (WhatsApp, Email, SMS) with templates.

### Files

- **channels/whatsapp.channel.ts** - WhatsApp Cloud API integration
- **channels/email.channel.ts** - Email service
- **channels/sms.channel.ts** - SMS service
- **templates/message-template.service.ts** - Template management
- **notification-orchestrator.service.ts** - Multi-channel orchestrator
- **messaging.module.ts** - Module definition

### Channel Usage

```typescript
import { NotificationOrchestrator } from "@workspace/modules/messaging";

@Injectable()
export class AppointmentService {
  constructor(private notifications: NotificationOrchestrator) {}

  async scheduleAppointment(appointment: Appointment) {
    // Save appointment
    await this.appointments.create(appointment);

    // Send multi-channel notification with fallback
    await this.notifications.sendWithFallback(
      "appointment_confirmation",
      appointment.patientPhone,
      {
        patientName: appointment.patientName,
        appointmentTime: appointment.dateTime,
        clinicName: appointment.clinicName,
      },
      ["whatsapp", "sms", "email"], // Priority order
    );
  }
}
```

### Template Variables

```typescript
// appointment_confirmation template variables:
// {{patientName}} - Patient's full name
// {{appointmentTime}} - Date and time of appointment
// {{clinicName}} - Clinic name
// {{appointmentType}} - Type of appointment
// {{doctorName}} - Assigned doctor's name

// payment_reminder template variables:
// {{patientName}}
// {{invoiceAmount}}
// {{dueDate}}
// {{invoiceLink}} - Payment link

// prescription_ready template variables:
// {{patientName}}
// {{prescriptionId}}
// {{medicinesCount}} - Number of medicines
// {{pickupDate}}
// {{clinicAddress}}
```

---

## Cache Module

**Location**: `apps/api/src/shared/modules/cache/`

Caching abstraction with in-memory and Redis implementations.

### Files

- **cache.interface.ts** - ICacheProvider interface and CacheKeys builder
- **in-memory-cache.service.ts** - Development cache (no persistence)
- **redis-cache.service.ts** - Production cache with Redis
- **cache.module.ts** - Module definition
- **index.ts** - Barrel export

### Cache Configuration

```bash
# .env
CACHE_PROVIDER=redis      # or 'memory' for development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional
```

### Cache Usage

```typescript
import { CacheKeys } from "@workspace/modules/cache";

@Injectable()
export class UserService {
  constructor(@Inject("cache") private cache: ICacheProvider) {}

  async getUser(userId: string) {
    const cacheKey = CacheKeys.userById(userId);

    // Try cache first
    let user = await this.cache.get<User>(cacheKey);
    if (user) return user;

    // Cache miss - fetch from DB
    user = await this.db.user.findUnique({ where: { id: userId } });

    // Store in cache for 1 hour (3600 seconds)
    await this.cache.set(cacheKey, user, 3600);

    return user;
  }

  async updateUser(userId: string, updates: UpdateUserDto) {
    const user = await this.db.user.update({
      where: { id: userId },
      data: updates,
    });

    // Invalidate cache
    const cacheKey = CacheKeys.userById(userId);
    await this.cache.delete(cacheKey);

    return user;
  }

  async invalidateClinicCache(clinicId: string) {
    // Invalidate all patients of clinic
    await this.cache.deletePattern(CacheKeys.patientsByClinic(clinicId));

    // Invalidate clinic settings
    await this.cache.delete(CacheKeys.clinicSettings(clinicId));
  }
}
```

### Predefined Cache Keys

```typescript
CacheKeys.userById(userId); // 'user:user-123'
CacheKeys.userByEmail(email); // 'user:email:user@example.com'
CacheKeys.clinicById(clinicId); // 'clinic:clinic-123'
CacheKeys.clinicSettings(clinicId); // 'clinic:clinic-123:settings'
CacheKeys.clinicSubscription(clinicId); // 'clinic:clinic-123:subscription'
CacheKeys.patientById(patientId); // 'patient:patient-123'
CacheKeys.patientsList(clinicId); // 'patients:clinic-123'
CacheKeys.appointmentById(appointmentId); // 'appointment:appt-123'
CacheKeys.invoiceById(invoiceId); // 'invoice:inv-123'
CacheKeys.featureFlag(flag); // 'feature:new-ui'
CacheKeys.rateLimit(identifier, action); // 'ratelimit:user-123:login'
CacheKeys.session(sessionId); // 'session:sess-123'
```

---

## Queue Module

**Location**: `apps/api/src/shared/modules/queue/`

Job queue for async processing with retries, delays, and priorities.

### Files

- **queue.interface.ts** - IQueueProvider and JobNames enum
- **in-memory-queue.service.ts** - Development queue (no persistence)
- **bull-mq-queue.service.ts** - Production queue with BullMQ + Redis
- **queue.module.ts** - Module definition
- **index.ts** - Barrel export

### Queue Configuration

```bash
# .env
QUEUE_PROVIDER=bull      # or 'memory' for development
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Queue Usage

```typescript
import { JobNames, SendEmailJobData } from "@workspace/modules/queue";

@Injectable()
export class EmailService {
  constructor(@Inject("queue") private queue: IQueueProvider) {
    // Register handler
    this.queue.process(JobNames.SEND_EMAIL, this.handleSendEmail.bind(this));
  }

  async sendEmailAsync(to: string, subject: string, body: string) {
    // Enqueue email job
    await this.queue.enqueue(
      JobNames.SEND_EMAIL,
      { to, subject, template: "email-template", variables: { body } },
      {
        delay: 1000, // Process after 1 second
        attempts: 3, // Retry 3 times on failure
        backoff: { type: "exponential", delay: 1000 },
        priority: "high",
        timeout: 30000, // 30 second timeout
      },
    );
  }

  private async handleSendEmail(job: QueueJob<SendEmailJobData>) {
    console.log(`Processing email job ${job.id}`);

    try {
      // Send actual email
      await this.nodemailer.send({
        to: job.data.to,
        subject: job.data.subject,
        // ...
      });

      console.log(`Email sent: ${job.id}`);
    } catch (error) {
      console.error(`Email failed: ${error}`);
      throw error; // Will retry based on attempts config
    }
  }

  async getQueueStats() {
    return this.queue.getStats(JobNames.SEND_EMAIL);
    // Returns: { processed, failed, waiting, active, delayed }
  }
}
```

### Predefined Job Names

```typescript
JobNames.SEND_EMAIL; // 'send-email'
JobNames.SEND_SMS; // 'send-sms'
JobNames.SEND_WHATSAPP; // 'send-whatsapp'
JobNames.GENERATE_INVOICE_PDF; // 'generate-invoice-pdf'
JobNames.SEND_APPOINTMENT_REMINDER; // 'send-appointment-reminder'
JobNames.PROCESS_SUBSCRIPTION_RENEWALS;
JobNames.GENERATE_MONTHLY_REPORTS;
JobNames.DATABASE_BACKUP;
// ... and more
```

---

## Audit Module

**Location**: `apps/api/src/shared/modules/audit/`

Compliance audit logging for all sensitive operations.

### Files

- **audit.interface.ts** - IAuditLogger and AuditAction enum
- **audit-logger.service.ts** - Service implementation
- **audit.module.ts** - Module definition
- **index.ts** - Barrel export

### Audit Usage

```typescript
import { AuditAction } from "@workspace/modules/audit";

@Injectable()
export class UserService {
  constructor(@Inject("auditLogger") private audit: IAuditLogger) {}

  async updateUser(
    userId: string,
    updates: UpdateUserDto,
    context: RequestContext,
  ) {
    const before = await this.getUser(userId);
    const after = await this.db.user.update({
      where: { id: userId },
      data: updates,
    });

    // Log the change
    await this.audit.log({
      userId: context.userId, // Who made the change
      clinicId: context.clinicId, // Which clinic
      action: AuditAction.USER_UPDATED,
      resourceType: "User",
      resourceId: userId,
      changes: {
        name: { before: before.name, after: after.name },
        email: { before: before.email, after: after.email },
        role: { before: before.role, after: after.role },
      },
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      status: "success",
    });
  }

  async changePassword(userId: string, context: RequestContext) {
    // Update password
    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    // Audit password change
    await this.audit.log({
      userId: context.userId,
      clinicId: context.clinicId,
      action: AuditAction.USER_PASSWORD_CHANGED,
      resourceType: "User",
      resourceId: userId,
      status: "success",
    });
  }

  async getAuditTrail(userId: string, clinicId: string) {
    return this.audit.getLogsForUser(userId, clinicId);
  }
}
```

### Audit Actions

```typescript
// User-related
AuditAction.USER_LOGIN;
AuditAction.USER_LOGOUT;
AuditAction.USER_CREATED;
AuditAction.USER_UPDATED;
AuditAction.USER_DELETED;
AuditAction.USER_PASSWORD_CHANGED;

// Data-related
AuditAction.PATIENT_CREATED;
AuditAction.PATIENT_UPDATED;
AuditAction.DATA_EXPORT;

// Billing-related
AuditAction.INVOICE_CREATED;
AuditAction.INVOICE_PAID;
AuditAction.REFUND_ISSUED;

// And 30+ more actions for comprehensive audit coverage
```

---

## Integration Patterns

### Using Multiple Modules Together

```typescript
@Injectable()
export class InvoiceService {
  constructor(
    // Data access
    private invoiceRepo: InvoiceRepository,
    @Inject("cache") private cache: ICacheProvider,

    // Document generation
    private documentService: DocumentGenerationService,
    @Inject("queue") private queue: IQueueProvider,

    // Notifications
    private notifications: NotificationOrchestrator,

    // Audit
    @Inject("auditLogger") private audit: IAuditLogger,
  ) {}

  async createInvoice(dto: CreateInvoiceDto, context: RequestContext) {
    // 1. Validate and persist
    const invoice = await this.invoiceRepo.save({
      ...dto,
      clinicId: context.clinicId,
    });

    // 2. Cache for fast access
    const cacheKey = CacheKeys.invoiceById(invoice.id);
    await this.cache.set(cacheKey, invoice, 3600);

    // 3. Queue PDF generation (async)
    await this.queue.enqueue(
      JobNames.GENERATE_INVOICE_PDF,
      { invoiceId: invoice.id, clinicId: context.clinicId },
      { delay: 1000 },
    );

    // 4. Queue notifications (async)
    await this.queue.enqueue(JobNames.SEND_EMAIL, {
      to: invoice.patientEmail,
      subject: "Invoice Ready",
    });

    // 5. Log operation for audit trail
    await this.audit.log({
      userId: context.userId,
      clinicId: context.clinicId,
      action: AuditAction.INVOICE_CREATED,
      resourceType: "Invoice",
      resourceId: invoice.id,
      metadata: { amount: invoice.total },
      status: "success",
    });

    return invoice;
  }
}
```

---

## Environment Configuration Reference

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/docita

# JWT Auth
JWT_SECRET=your-super-secret-key
JWT_EXPIRATION=7d

# Cache (Redis)
CACHE_PROVIDER=redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue (BullMQ)
QUEUE_PROVIDER=bull
BULL_REDIS_HOST=localhost
BULL_REDIS_PORT=6379

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password

# Payment
RAZORPAY_KEY_ID=rzp_test_Id
RAZORPAY_KEY_SECRET=rzp_test_secret

# WhatsApp Cloud API
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789
WHATSAPP_PHONE_NUMBER_ID=1234567890123
WHATSAPP_ACCESS_TOKEN=EAAbcd...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify_token

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AK...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_DOCUMENTS=docita-documents
```

---

## Testing Shared Modules

```typescript
import { Test } from "@nestjs/testing";
import { CacheModule } from "@workspace/modules/cache";
import { QueueModule } from "@workspace/modules/queue";

describe("User Service with Shared Modules", () => {
  let service: UserService;
  let cache: ICacheProvider;
  let queue: IQueueProvider;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService],
      imports: [CacheModule, QueueModule],
    }).compile();

    service = module.get(UserService);
    cache = module.get("cache");
    queue = module.get("queue");

    // Clear cache before each test
    await cache.clear();
  });

  it("should cache user data", async () => {
    const user = await service.getUser("user-123");
    const cached = await cache.get("user:user-123");

    expect(cached).toEqual(user);
  });

  it("should queue email notifications", async () => {
    await service.createUser(userDto);

    const stats = await queue.getStats(JobNames.SEND_EMAIL);
    expect(stats.waiting).toBeGreaterThan(0);
  });
});
```

---

## Best Practices

1. **Always use the provided interfaces** (ICacheProvider, IQueueProvider, etc.)
2. **Cache sensitive data carefully** - Don't cache passwords or tokens
3. **Use TTLs appropriately** - Short for frequently changing data, longer for static data
4. **Queue long operations** - Don't block HTTP requests with slow tasks
5. **Log important operations** - Use audit module for compliance
6. **Handle errors gracefully** - Provided modules handle failures safely
7. **Use environment variables** - Never hardcode configuration
8. **Clean up resources** - Modules auto-cleanup on application shutdown

---

## Migration from Development to Production

1. Set `CACHE_PROVIDER=redis` and ensure Redis is running
2. Set `QUEUE_PROVIDER=bull` and ensure Redis is available
3. Provide all required environment variables
4. Use AuditModule for compliance logging
5. Monitor queue stats and cache hit rates
6. Set up alerts for failed jobs and slow queries

---

**Last Updated**: February 2026  
**Version**: 1.0  
**Author**: Docita Architecture Team
