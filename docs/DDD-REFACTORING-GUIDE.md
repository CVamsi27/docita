# DDD Refactoring Implementation Guide

**Purpose**: Step-by-step guide for incrementally refactoring domains into Clean Architecture (DDD) pattern  
**Target Audience**: Backend developers  
**Prerequisites**: Understanding of current codebase structure and NestJS patterns

---

## Quick Start: Refactoring a Domain (Billing Example)

### Step 1: Create Layer Structure (15 minutes)

```bash
# Create new DDD directory structure
mkdir -p src/domains/billing/{core,application,infrastructure,presentation}

# Create subdirectories
mkdir -p src/domains/billing/core/{entities,value-objects,services}
mkdir -p src/domains/billing/application/{use-cases,dto,ports}
mkdir -p src/domains/billing/infrastructure/{repositories,external-services,mappers}
mkdir -p src/domains/billing/presentation/controllers
```

### Step 2: Identify Domain Components (30 minutes)

For **Billing Domain**, extract from current monolithic service:

```typescript
// CURRENT: src/domains/billing/billing-calculation.service.ts
// ~300 lines doing multiple things

export class BillingCalculationService {
  // Domain logic (move to core)
  calculateProrations() {
    /* ... */
  }
  calculateMonthlyCost() {
    /* ... */
  }

  // Use case logic (move to application)
  generateInvoice() {
    /* ... */
  }

  // Persistence (move to infrastructure)
  saveInvoice() {
    /* ... */
  }
  fetchInvoice() {
    /* ... */
  }

  // API layer (move to presentation)
  @Post("/invoices")
  createInvoice() {
    /* ... */
  }
}

// NEW STRUCTURE
// src/domains/billing/core/services/billing-calculator.service.ts
// Pure domain logic - no dependencies on NestJS or Prisma

// src/domains/billing/application/use-cases/create-invoice.use-case.ts
// Orchestrates domain logic and repository calls

// src/domains/billing/infrastructure/repositories/invoice.repository.ts
// Database access pattern

// src/domains/billing/presentation/controllers/invoices.controller.ts
// HTTP endpoints
```

### Step 3: Create Domain Entities & Value Objects (45 minutes)

```typescript
// src/domains/billing/core/entities/invoice.entity.ts
export class Invoice {
  id: string;
  clinicId: string;
  patientId: string;
  items: InvoiceItem[];
  total: Money; // Value object, not primitive
  status: InvoiceStatus; // Value object, not string
  createdAt: Date;

  // Domain methods (business logic)
  markAsPaid(paymentMethod: PaymentMethod): void {
    if (this.status !== InvoiceStatus.PENDING) {
      throw new InvalidInvoiceStatusError();
    }
    this.status = InvoiceStatus.PAID;
  }

  // Validation
  isValid(): boolean {
    return this.items.length > 0 && this.total.isPositive();
  }
}

// src/domains/billing/core/value-objects/money.value-object.ts
export class Money {
  readonly amount: number;
  readonly currency: "INR" | "USD";

  constructor(amount: number, currency: "INR" | "USD") {
    if (amount < 0) throw new Error("Amount must be positive");
    this.amount = amount;
    this.currency = currency;
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  isPositive(): boolean {
    return this.amount > 0;
  }
}

// src/domains/billing/core/value-objects/invoice-status.value-object.ts
export enum InvoiceStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}
```

### Step 4: Create Ports (Interfaces) (30 minutes)

```typescript
// src/domains/billing/application/ports/invoice.repository.port.ts
export interface IInvoiceRepository {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
  findByClinicId(clinicId: string): Promise<Invoice[]>;
  delete(id: string): Promise<void>;
}

// src/domains/billing/application/ports/payment-gateway.port.ts
export interface IPaymentGateway {
  createPaymentIntent(amount: Money): Promise<PaymentIntent>;
  confirmPayment(intentId: string): Promise<boolean>;
  refundPayment(transactionId: string): Promise<boolean>;
}

// src/domains/billing/application/ports/notification.port.ts
export interface INotificationService {
  sendInvoiceEmail(invoiceId: string, recipientEmail: string): Promise<void>;
  sendPaymentReminder(invoiceId: string): Promise<void>;
}
```

### Step 5: Create Use Cases (Application Layer) (1 hour)

```typescript
// src/domains/billing/application/use-cases/create-invoice.use-case.ts
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    @Inject("IInvoiceRepository")
    private invoiceRepository: IInvoiceRepository,

    @Inject("INotificationService")
    private notificationService: INotificationService,
  ) {}

  async execute(command: CreateInvoiceCommand): Promise<CreateInvoiceResponse> {
    // 1. Validate input
    if (!command.items || command.items.length === 0) {
      throw new InvalidInvoiceError("Invoice must have at least one item");
    }

    // 2. Create domain entity
    const invoice = new Invoice(
      UUID.v4(),
      command.clinicId,
      command.patientId,
      command.items.map(
        (item) =>
          new InvoiceItem(item.description, new Money(item.amount, "INR")),
      ),
      InvoiceStatus.DRAFT,
    );

    // 3. Calculate totals using domain service
    const billingCalculator = new BillingCalculatorService();
    invoice.total = billingCalculator.calculateTotal(invoice.items);

    // 4. Validate domain object
    if (!invoice.isValid()) {
      throw new InvalidInvoiceError("Invoice validation failed");
    }

    // 5. Persist
    await this.invoiceRepository.save(invoice);

    // 6. Send notifications
    await this.notificationService.sendInvoiceEmail(
      invoice.id,
      command.recipientEmail,
    );

    // 7. Return response
    return {
      invoiceId: invoice.id,
      total: invoice.total.amount,
      status: invoice.status,
    };
  }
}

// src/domains/billing/application/use-cases/mark-invoice-paid.use-case.ts
@Injectable()
export class MarkInvoicePaidUseCase {
  constructor(
    @Inject("IInvoiceRepository")
    private invoiceRepository: IInvoiceRepository,
  ) {}

  async execute(command: MarkInvoiceAsPaidCommand): Promise<void> {
    // 1. Fetch domain entity
    const invoice = await this.invoiceRepository.findById(command.invoiceId);
    if (!invoice) {
      throw new InvoiceNotFoundError(command.invoiceId);
    }

    // 2. Call domain method (business logic encapsulated)
    invoice.markAsPaid(command.paymentMethod);

    // 3. Persist changes
    await this.invoiceRepository.save(invoice);
  }
}
```

### Step 6: Create Repositories (Infrastructure Layer) (45 minutes)

```typescript
// src/domains/billing/infrastructure/repositories/invoice.repository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class InvoiceRepository implements IInvoiceRepository {
  constructor(private prisma: PrismaService) {}

  async save(invoice: Invoice): Promise<void> {
    // Map domain entity to persistence model
    const persistenceModel = InvoiceMapper.toPersistence(invoice);

    await this.prisma.invoice.upsert({
      where: { id: invoice.id },
      update: persistenceModel,
      create: persistenceModel,
    });
  }

  async findById(id: string): Promise<Invoice | null> {
    const record = await this.prisma.invoice.findUnique({ where: { id } });
    if (!record) return null;
    // Map persistence model back to domain entity
    return InvoiceMapper.toDomain(record);
  }

  async findByClinicId(clinicId: string): Promise<Invoice[]> {
    const records = await this.prisma.invoice.findMany({
      where: { clinicId },
    });
    return records.map(InvoiceMapper.toDomain);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.invoice.delete({ where: { id } });
  }
}

// src/domains/billing/infrastructure/mappers/invoice.mapper.ts
export class InvoiceMapper {
  static toDomain(raw: InvoiceRecord): Invoice {
    return new Invoice(
      raw.id,
      raw.clinicId,
      raw.patientId,
      raw.items.map(
        (item) =>
          new InvoiceItem(
            item.description,
            new Money(item.amount, raw.currency),
          ),
      ),
      InvoiceStatus[raw.status],
      raw.createdAt,
    );
  }

  static toPersistence(invoice: Invoice): InvoiceRecord {
    return {
      id: invoice.id,
      clinicId: invoice.clinicId,
      patientId: invoice.patientId,
      items: invoice.items, // Store raw items
      total: invoice.total.amount,
      currency: invoice.total.currency,
      status: invoice.status,
      createdAt: invoice.createdAt,
    };
  }
}
```

### Step 7: Create Controllers (Presentation Layer) (30 minutes)

```typescript
// src/domains/billing/presentation/controllers/invoices.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from "@nestjs/common";
import { CreateInvoiceUseCase } from "../../application/use-cases/create-invoice.use-case";

@Controller("invoices")
export class InvoicesController {
  constructor(private createInvoiceUseCase: CreateInvoiceUseCase) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createInvoice(
    @Body() dto: CreateInvoiceDtoRequest,
  ): Promise<CreateInvoiceResponse> {
    const command = new CreateInvoiceCommand(
      dto.clinicId,
      dto.patientId,
      dto.items,
      dto.recipientEmail,
    );

    return this.createInvoiceUseCase.execute(command);
  }

  @Get(":id")
  @Roles(Role.ADMIN, Role.DOCTOR)
  async getInvoice(@Param("id") id: string): Promise<GetInvoiceResponse> {
    const command = new GetInvoiceQuery(id);
    return this.getInvoiceUseCase.execute(command);
  }
}
```

### Step 8: Create Module Configuration (30 minutes)

```typescript
// src/domains/billing/billing.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";

// Use cases
import { CreateInvoiceUseCase } from "./application/use-cases/create-invoice.use-case";
import { MarkInvoicePaidUseCase } from "./application/use-cases/mark-invoice-paid.use-case";

// Repositories
import { InvoiceRepository } from "./infrastructure/repositories/invoice.repository";

// Controllers
import { InvoicesController } from "./presentation/controllers/invoices.controller";

@Module({
  imports: [PrismaModule],
  controllers: [InvoicesController],
  providers: [
    // Use cases
    CreateInvoiceUseCase,
    MarkInvoicePaidUseCase,

    // Repositories (implement ports)
    {
      provide: "IInvoiceRepository",
      useClass: InvoiceRepository,
    },

    // Domain services
    BillingCalculatorService,
  ],
  exports: [CreateInvoiceUseCase, MarkInvoicePaidUseCase, "IInvoiceRepository"],
})
export class BillingModule {}
```

### Step 9: Test (1-2 hours)

```typescript
// test/domains/billing/core/services/billing-calculator.service.spec.ts
describe("BillingCalculatorService", () => {
  let service: BillingCalculatorService;

  beforeEach(() => {
    service = new BillingCalculatorService();
  });

  describe("calculateTotal", () => {
    it("should correctly sum invoice items", () => {
      const items = [
        new InvoiceItem("Service 1", new Money(1000, "INR")),
        new InvoiceItem("Service 2", new Money(500, "INR")),
      ];

      const total = service.calculateTotal(items);
      expect(total.amount).toBe(1500);
    });

    it("should handle currency conversion", () => {
      const items = [new InvoiceItem("Service", new Money(100, "INR"))];

      const total = service.calculateTotal(items, "USD");
      // Assuming 1 USD = 80 INR
      expect(total.amount).toBe(1.25); // 100/80
    });
  });
});

// test/domains/billing/application/use-cases/create-invoice.use-case.spec.ts
describe("CreateInvoiceUseCase", () => {
  let useCase: CreateInvoiceUseCase;
  let mockRepository: Mock<IInvoiceRepository>;
  let mockNotificationService: Mock<INotificationService>;

  beforeEach(() => {
    mockRepository = mock(IInvoiceRepository);
    mockNotificationService = mock(INotificationService);
    useCase = new CreateInvoiceUseCase(mockRepository, mockNotificationService);
  });

  it("should create an invoice and send notification", async () => {
    const command = new CreateInvoiceCommand(/*...*/);

    const response = await useCase.execute(command);

    expect(response.invoiceId).toBeDefined();
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockNotificationService.sendInvoiceEmail).toHaveBeenCalled();
  });
});
```

### Step 10: Integration & Verification (30 minutes)

```bash
# 1. Update imports in app.module.ts
# Import BillingModule instead of old billing controllers/services

# 2. Run tests
pnpm test domains/billing

# 3. Build
pnpm build

# 4. Verify API endpoints still work
curl -X POST http://localhost:3000/invoices \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Template: Copy & Paste Structure for New Domain

Use this template when refactoring additional domains:

```bash
# 1. Create structure
mkdir -p src/domains/{DOMAIN}/{core,application,infrastructure,presentation}/{entities,value-objects,services,use-cases,dto,ports,repositories,external-services,mappers,controllers}

# 2. Create files:
src/domains/{DOMAIN}/
├── core/
│   ├── entities/{entity}.entity.ts
│   ├── value-objects/{value-object}.value-object.ts
│   └── services/{service}.service.ts
├── application/
│   ├── use-cases/{use-case}.use-case.ts
│   ├── dto/{dto}.dto.ts
│   └── ports/{port}.port.ts
├── infrastructure/
│   ├── repositories/{repository}.repository.ts
│   ├── external-services/{service}.service.ts
│   └── mappers/{mapper}.mapper.ts
├── presentation/
│   └── controllers/{controller}.controller.ts
└── {domain}.module.ts
```

---

## Timeline for Full Refactoring

| Phase     | Domain                               | Effort | Duration       |
| --------- | ------------------------------------ | ------ | -------------- |
| 1         | **Billing** (priority - 1,182 lines) | High   | 1 week         |
| 2         | **Clinical** + **Medical Coding**    | High   | 1 week         |
| 3         | **Messaging** (WhatsApp refactor)    | Medium | 4 days         |
| 4         | **Payments** + **Appointments**      | Medium | 1 week         |
| 5         | **Remaining Domains**                | Medium | 2 weeks        |
| 6         | **Testing & Integration**            | High   | 1 week         |
| **TOTAL** | All Domains                          | -      | **~6-7 weeks** |

---

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Mixing Concerns

```typescript
// ❌ WRONG: Use case mixing presentation and persistence
export class CreateInvoiceUseCase {
  async execute(req: Request, res: Response) {
    // Presentation logic
    const invoice = await this.prisma.invoice.create({
      // Persistence logic
      data: req.body,
    });
    res.json(invoice);
  }
}

// ✅ CORRECT: Separated concerns
// Use case takes domain model, returns response DTO
// Controller handles HTTP request/response
```

### ❌ Pitfall 2: Exposing Core to Presentation

```typescript
// ❌ WRONG: Controller directly mutates domain entity
@Post('/invoices/:id/pay')
async payInvoice(@Param('id') id: string) {
  const invoice = await this.repository.findById(id);
  invoice.status = 'PAID';  // Direct mutation bypasses validation
  await this.repository.save(invoice);
}

// ✅ CORRECT: Use case encapsulates business logic
@Post('/invoices/:id/pay')
async payInvoice(@Param('id') id: string) {
  return this.markInvoicePaidUseCase.execute({ invoiceId: id });
}
```

### ❌ Pitfall 3: Over-Engineering

```typescript
// ❌ WRONG: Creating value objects for everything
class CliniId extends ValueObject {}
class PatientId extends ValueObject {}
// ... now every parameter needs these

// ✅ CORRECT: Use value objects for complex domain concepts
class Money extends ValueObject {} // Has business rules
class InvoiceStatus extends ValueObject {} // Has validation
// Regular primitives for IDs
```

---

## Checklist for Refactoring Review

- [ ] All domain logic moved to **core/** layer
- [ ] No direct Prisma calls outside infrastructure layer
- [ ] Use cases in **application/** layer (orchestration only)
- [ ] Repositories implement ports (interfaces)
- [ ] Controllers don't call repositories directly
- [ ] All dependencies injected via constructor
- [ ] Unit tests for core business logic
- [ ] Integration tests for use cases
- [ ] E2E tests for API endpoints
- [ ] Build passes with 0 errors
- [ ] All imports use correct relative paths
- [ ] Module entry point properly exports public API

---

**Document Version**: 1.0  
**Last Updated**: February 23, 2026  
**Status**: Ready for Implementation
