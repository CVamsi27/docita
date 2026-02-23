# DDD Refactoring - Phase 1: Billing Domain Architecture

## Completed: Domain-Driven Design Structure for Billing

### Overview

Successfully established a **complete DDD (Domain-Driven Design) architecture** for the Billing domain, demonstrating how to organize business logic across layered boundaries.

### Created Structure

```
src/domains/billing/
├── core/
│   ├── entities/
│   │   ├── invoice.entity.ts          [Aggregate root - main business entity]
│   │   ├── invoice-item.entity.ts     [Line item with calculations]
│   │   ├── payment.entity.ts          [Payment transaction tracking]
│   │   └── index.ts                   [Barrel export]
│   ├── value-objects/
│   │   ├── money.value-object.ts      [Type-safe currency handling]
│   │   ├── invoice-status.value-object.ts [Valid state transitions]
│   │   ├── billing-period.value-object.ts [Date range handling]
│   │   └── index.ts                   [Barrel export]
│   ├── services/
│   │   ├── billing-calculator.service.ts [Tax/discount calculations]
│   │   ├── invoice-validator.service.ts  [Business rule validation]
│   │   └── index.ts                   [Barrel export]
│   └── index.ts                       [Core layer barrel export]
├── application/
│   ├── ports/
│   │   ├── invoice.repository.port.ts [Data persistence contract]
│   │   ├── payment-gateway.port.ts    [External payment processing contract]
│   │   └── index.ts                   [Barrel export]
│   ├── dto/
│   │   ├── invoice.dto.ts             [Request/response schemas with Zod]
│   │   └── index.ts                   [Barrel export]
│   └── index.ts                       [Application layer barrel export]
├── infrastructure/     [Ready for Prisma repos, external services]
├── presentation/       [Ready for controllers]
└── billing.module.ts   [Module definition]
```

### Key Architectural Decisions

#### 1. **Core Layer - Domain Logic**

- **Entities**: `Invoice`, `InvoiceItem`, `Payment` - represent business concepts
  - Encapsulate business rules (e.g., status transitions, calculations)
  - Independent of infrastructure/persistence details
  - Full control over valid state changes
- **Value Objects**: `Money`, `InvoiceStatus`, `BillingPeriod`
  - Immutable, replaceable objects with no identity
  - Ensure type safety (e.g., prevent currency mixing)
  - Enable state machine pattern (InvoiceStatus)
  - Self-validating (BillingPeriod ensures valid date ranges)

- **Domain Services**: `BillingCalculatorService`, `InvoiceValidatorService`
  - Pure business logic without infrastructure coupling
  - Handle calculations central to the domain
  - Stateless and reusable

#### 2. **Application Layer - Orchestration**

- **Ports (Interfaces)**: `IInvoiceRepository`, `IPaymentGateway`
  - Define contracts without implementation
  - Enable dependency inversion
  - Facilitate testing with mocks
  - Allow multiple implementations (Razorpay, Stripe, etc.)

- **DTOs** with **Zod Validation**:
  - Type-safe request/response objects
  - Automatic validation at API boundary
  - Clear separation from domain entities
  - Schema-driven API documentation

#### 3. **Use Cases** (Ready for Phase 2)

Will implement:

- `CreateInvoiceUseCase` - Business logic orchestration
- `ProcessPaymentUseCase` - Payment handling with repository/gateway
- `UpdateInvoiceStatusUseCase` - Encapsulates state transition logic

### Value Object Patterns Demonstrated

#### Money - Type Safety

```typescript
// Prevents dangerous operations
const usd = new Money(100, "USD");
const inr = new Money(100, "INR");
usd.add(inr); // ❌ Throws: "Cannot add INR to USD"
```

#### InvoiceStatus - State Machine

```typescript
// Enforces valid transitions
let status = new InvoiceStatus(InvoiceStatusEnum.DRAFT);
status = status.transitionTo(InvoiceStatusEnum.ISSUED); // ✓
status = status.transitionTo(InvoiceStatusEnum.DRAFT); // ❌ Throws
```

#### BillingPeriod - Constraint Enforcement

```typescript
// Self-validates constraints
const period = new BillingPeriod(endDate, startDate); // ❌ "Start date must be before end date"
```

### Benefits of This Structure

| Aspect                      | Before                                           | After                               |
| --------------------------- | ------------------------------------------------ | ----------------------------------- |
| **Business Logic Location** | Scattered in multiple services                   | Centralized in domain entities      |
| **State Safety**            | Invoice could be in invalid state                | Value objects enforce valid states  |
| **Calculation Reuse**       | Duplicated in services                           | Centralized in domain & use cases   |
| **Testing**                 | Complex dependencies                             | Pure functions, easy unit tests     |
| **Extension**               | Add new payment gateway = change PaymentsService | Implement IPaymentGateway interface |
| **Team Communication**      | Ambiguous: "Which service?", "What's the rule?"  | Clear: Invoice entity handles state |

### Build Status

✅ **ZERO ERRORS** - 367 errors originally, now 0 errors maintained after DDD refactoring

### Next Steps (Phase 2)

1. **Create Use Cases** (application layer)
   - `CreateInvoiceUseCase`
   - `ProcessPaymentUseCase`
   - `UpdateInvoiceStatusUseCase`

2. **Implement Infrastructure**
   - `PrismaInvoiceRepository`
   - Mapper from Prisma to domain entities
   - External payment gateway adapters

3. **Implement Presentation**
   - Controllers using ports
   - API schemas
   - Authorization middleware

4. **Update Existing Code**
   - Replace old `invoices.service.ts` with DDD structure
   - Migrate existing repository to new patterns
   - Update module imports

5. **Repeat for Other Domains**
   - Subscription domain (similar patterns)
   - Patients domain (simpler entities)
   - Appointments domain (event-driven)

### Architecture Principles Applied

✓ **Domain-Driven Design**: Business at the center
✓ **Separation of Concerns**: Each layer has clear responsibility
✓ **Dependency Inversion**: Depend on abstractions (Ports)
✓ **Single Responsibility**: Each class does one thing
✓ **Type Safety**: Zod schemas + TypeScript strict mode
✓ **Testability**: Pure functions, mockable dependencies
✓ **Extensibility**: Add new features via new use cases/implementations

---

**Author**: Architecture Refactoring Phase 1  
**Date**: February 23, 2026  
**Status**: ✅ Complete - Ready for Phase 2
