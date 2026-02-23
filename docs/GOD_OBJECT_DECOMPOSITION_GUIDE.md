# God-Object Service Decomposition Guide

## Overview

This guide provides strategies and patterns for decomposing large services (>300 lines) into focused, single-responsibility services following SOLID principles.

## Quick Reference: 10 Services Requiring Decomposition

| Service                         | Lines | Priority  | Strategy                                       |
| ------------------------------- | ----- | --------- | ---------------------------------------------- |
| subscription-billing.service.ts | 1,184 | 🔴 URGENT | Split: Calculation, Invoice, Payment           |
| onboarding.service.ts           | 810   | 🟡 HIGH   | Split: Validation, Data, Setup                 |
| ocr.service.ts                  | 745   | 🟡 HIGH   | Split: Document types, Pagination              |
| templates.service.ts            | 683   | 🟡 HIGH   | Split: Validation, Rendering, Library          |
| clinics.service.ts              | 587   | 🟡 HIGH   | Split: Validation, Data, Settings              |
| whatsapp.service.ts             | 559   | 🟡 HIGH   | Already partially done (ClientService pattern) |
| reminders.service.ts            | 557   | 🟢 MEDIUM | Split: Scheduling, Notification                |
| usage-tracking.service.ts       | 557   | 🟢 MEDIUM | Split: Calculation, Reporting                  |
| payments.service.ts             | 539   | 🟢 MEDIUM | Split: Processing, Validation                  |
| super-admin-billing.service.ts  | 536   | 🟢 MEDIUM | Split: Analytics, Reporting                    |

## General Decomposition Strategy

### Step 1: Identify Responsibilities

Use the Single Responsibility Principle: each service should have **one reason to change**.

```typescript
// BAD: Multiple reasons to change
class SubscriptionBillingService {
  // Reason 1: Billing calculation logic changes
  calculateBillingAmount() {}

  // Reason 2: Invoice creation changes
  generateInvoice() {}

  // Reason 3: Payment processing changes
  processPayment() {}

  // Reason 4: Subscription renewal changes
  renewSubscription() {}
}

// GOOD: Single responsibility
class BillingCalculationService {
  // Only calculates amounts - one reason to change
  calculateBillingAmount() {}
}

class InvoiceGenerationService {
  // Only creates invoices - one reason to change
  generateInvoice() {}
}
```

### Step 2: Define Boundaries

Create clear interfaces for communication between services:

```typescript
// Service interfaces follow the Dependency Inversion Principle
interface IBillingCalculation {
  calculateAmount(subscription: Subscription): Promise<BillingAmount>;
  applyDiscount(amount: number, discountRate: number): number;
}

interface IInvoiceGeneration {
  generateInvoice(billing: BillingAmount): Promise<Invoice>;
  sendInvoice(invoice: Invoice): Promise<void>;
}

interface IPaymentProcessing {
  processPayment(invoice: Invoice): Promise<PaymentResult>;
  handleRefund(payment: Payment): Promise<void>;
}
```

### Step 3: Extract Services

```typescript
// Original orchestrator (now simpler)
@Injectable()
export class SubscriptionBillingService {
  constructor(
    private billingCalc: IBillingCalculation,
    private invoiceGen: IInvoiceGeneration,
    private paymentProc: IPaymentProcessing,
  ) {}

  async processSubscription(subscription: Subscription) {
    // Orchestrate, but don't duplicate logic
    const billing = await this.billingCalc.calculateAmount(subscription);
    const invoice = await this.invoiceGen.generateInvoice(billing);
    const payment = await this.paymentProc.processPayment(invoice);
    return { billing, invoice, payment };
  }
}

// Extracted services are now focused
@Injectable()
export class BillingCalculationService implements IBillingCalculation {
  // ~200-250 lines: only billing calculation logic
  calculateAmount(subscription: Subscription) {}
  applyDiscount(amount: number, rate: number) {}
}

@Injectable()
export class InvoiceGenerationService implements IInvoiceGeneration {
  // ~150-200 lines: only invoice generation logic
  generateInvoice(billing: BillingAmount) {}
  sendInvoice(invoice: Invoice) {}
}

@Injectable()
export class PaymentProcessingService implements IPaymentProcessing {
  // ~250-300 lines: only payment processing logic
  processPayment(invoice: Invoice) {}
  handleRefund(payment: Payment) {}
}
```

### Step 4: Update Module Providers

```typescript
// billing.module.ts
@Module({
  providers: [
    // Original service (now an orchestrator)
    SubscriptionBillingService,

    // New focused services
    BillingCalculationService,
    InvoiceGenerationService,
    PaymentProcessingService,

    // Implement interfaces with concrete classes
    {
      provide: "IBillingCalculation",
      useClass: BillingCalculationService,
    },
    {
      provide: "IInvoiceGeneration",
      useClass: InvoiceGenerationService,
    },
    {
      provide: "IPaymentProcessing",
      useClass: PaymentProcessingService,
    },
  ],
  exports: [SubscriptionBillingService],
})
export class BillingModule {}
```

## Case Study: Decomposing subscription-billing.service.ts

### Current State (1,184 lines)

**Current Methods:**

```
✗ calculateMonthlyCharge() - 45 lines
✗ calculateProration() - 60 lines
✗ applyDiscount() - 35 lines
✗ calculateTax() - 40 lines
✗ generateInvoice() - 80 lines
✗ sendInvoice() - 25 lines
✗ recordTransaction() - 50 lines
✗ processPayment() - 95 lines
✗ handlePaymentFailure() - 70 lines
✗ renewSubscription() - 85 lines
✗ handleSubscriptionCancel() - 60 lines
✗ generateBillingReport() - 100 lines
... and 30+ more methods
```

### Decomposition Strategy

**Service 1: BillingCalculationService (250 lines)**

```typescript
// Responsibility: Calculate billing amounts
calculateMonthlyCharge();
calculateProration();
calculateAdjustments();
applyDiscount();
calculateTax();
calculateTotalAmount();
calculateRefund();
```

**Service 2: InvoiceGenerationService (180 lines)**

```typescript
// Responsibility: Create and manage invoices
generateInvoice();
updateInvoice();
voidInvoice();
addLineItems();
generatePDF();
sendInvoice();
recordInvoiceAudit();
```

**Service 3: PaymentProcessingService (280 lines)**

```typescript
// Responsibility: Handle payment processing
processPayment();
capturePayment();
handlePaymentFailure();
retryFailedPayment();
processRefund();
recordTransaction();
updatePaymentStatus();
handleWebhookCallback();
```

**Service 4: SubscriptionLifecycleService (200 lines)**

```typescript
// Responsibility: Manage subscription state changes
renewSubscription();
upgradeSubscription();
downgradeSubscription();
cancelSubscription();
pauseSubscription();
resumeSubscription();
handleExpirationDate();
```

**Service 5: BillingReportingService (150 lines)**

```typescript
// Responsibility: Generate reports and analytics
generateBillingReport();
generatePaymentSummary();
generateUsageMetrics();
calculateMRR();
calculateChurn();
exportBillingData();
```

### Original Service (Reduced to 100-150 lines)

```typescript
// Now acts as an orchestrator only
@Injectable()
export class SubscriptionBillingService {
  constructor(
    private billingCalc: BillingCalculationService,
    private invoiceGen: InvoiceGenerationService,
    private paymentProc: PaymentProcessingService,
    private lifecycle: SubscriptionLifecycleService,
    private reporting: BillingReportingService,
  ) {}

  // High-level workflow coordination only
  async processMonthlyBilling(subscription: Subscription) {
    const amount = await this.billingCalc.calculateMonthlyCharge(subscription);
    const invoice = await this.invoiceGen.generateInvoice(subscription, amount);
    const payment = await this.paymentProc.processPayment(invoice);

    if (payment.status === "success") {
      await this.lifecycle.renewSubscription(subscription);
    } else {
      await this.paymentProc.handlePaymentFailure(payment);
    }

    return { invoice, payment };
  }
}
```

## Benefits of Decomposition

### Before (God-Object Pattern)

❌ Hard to test (need to mock 1,184 lines)  
❌ Hard to understand (too many responsibilities)  
❌ Hard to maintain (changes in one area affect the whole)  
❌ Hard to reuse (all-or-nothing dependency)  
❌ Difficult PR reviews (large changes in single file)

### After (Single Responsibility Pattern)

✅ Easy to test (each service <300 lines, clear mocks)  
✅ Easy to understand (each service has one job)  
✅ Easy to maintain (changes isolated to one service)  
✅ Easy to reuse (inject only needed services)  
✅ Easier PR reviews (smaller, focused changes)

## Implementation Checklist

For each service being decomposed:

- [ ] List all public methods (20+ methods = decompose)
- [ ] Group methods by responsibility (domain-driven)
- [ ] Create interfaces for each group
- [ ] Create new service files for each interface
- [ ] Extract and copy relevant logic
- [ ] Update original service to be an orchestrator
- [ ] Create/update module providers
- [ ] Update DI container registrations
- [ ] Create unit tests for new services
- [ ] Verify integration tests still pass
- [ ] Update documentation/API docs
- [ ] Create PR with decomposed services

## Priority Decomposition Order

### Phase 1 (Sprint 1): Urgent

1. **subscription-billing.service.ts** (1,184 lines) → 5 services
   - Highest complexity, most dependencies
   - Will unlock cleaner billing module
   - Estimated effort: 8-10 hours

### Phase 2 (Sprint 2): High Priority

2. **onboarding.service.ts** (810 lines) → 3 services
3. **ocr.service.ts** (745 lines) → 2-3 services

### Phase 3 (Sprint 3): Medium Priority

4. **templates.service.ts** (683 lines) → 3 services
5. **clinics.service.ts** (587 lines) → 3 services

### Phase 4+ (Future Sprints): Lower Priority

- reminders, usage-tracking, payments, super-admin-billing

## Testing Strategy for Decomposed Services

### Unit Tests

```typescript
describe("BillingCalculationService", () => {
  let service: BillingCalculationService;

  beforeEach(() => {
    service = new BillingCalculationService();
    // Mock dependencies if needed
  });

  describe("calculateMonthlyCharge", () => {
    it("should calculate base charge", async () => {
      const subscription = createMockSubscription({
        tier: "professional",
        basePrice: 99,
      });
      const result = await service.calculateMonthlyCharge(subscription);
      expect(result).toBe(99);
    });

    it("should apply pro-rata for partial month", () => {
      // Test partial month calculations
    });
  });
});
```

### Integration Tests

```typescript
describe("Billing Module Integration", () => {
  let app: INestApplication;
  let subscriptionService: SubscriptionBillingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [BillingModule],
    }).compile();

    app = module.createNestApplication();
    subscriptionService = module.get(SubscriptionBillingService);
  });

  it("should orchestrate full billing workflow", async () => {
    const subscription = createMockSubscription();
    const result =
      await subscriptionService.processMonthlyBilling(subscription);

    expect(result.invoice).toBeDefined();
    expect(result.payment.status).toBe("success");
  });
});
```

## Common Pitfalls to Avoid

### ❌ Don't Create Too Many Micro-Services

Creating a service for every method defeats the purpose:

```typescript
// BAD: Too granular
class DiscountService {
  applyDiscount();
}
class TaxService {
  calculateTax();
}
class ProrationService {
  calculateProration();
}
class RefundService {
  processRefund();
}

// GOOD: Balanced responsibility
class BillingCalculationService {
  applyDiscount();
  calculateTax();
  calculateProration();
  processRefund();
}
```

### ❌ Don't Introduce Circular Dependencies

```typescript
// BAD: A → B → A
class InvoiceGenerationService {
  constructor(private billing: BillingCalculationService) {}
}

class BillingCalculationService {
  constructor(private invoice: InvoiceGenerationService) {}
}

// GOOD: One-way dependency
class InvoiceGenerationService {
  constructor(private billing: BillingCalculationService) {}
}

class SubscriptionBillingService {
  constructor(
    private billing: BillingCalculationService,
    private invoice: InvoiceGenerationService,
  ) {}
}
```

### ❌ Don't Forget to Update Tests

```typescript
// BAD: Leave old tests, add new ones (duplicate coverage)
// GOOD: Refactor tests to match new structure
describe("BillingCalculationService", () => {
  /* new tests */
});
describe("InvoiceGenerationService", () => {
  /* new tests */
});
describe("SubscriptionBillingService - Integration", () => {
  /* orchestration tests */
});
```

## Tools & Resources

- **SOLID Principles**: https://en.wikipedia.org/wiki/SOLID
- **Service Decomposition Pattern**: DDD (Domain-Driven Design)
- **NestJS Modules**: https://docs.nestjs.com/modules
- **Dependency Injection in NestJS**: https://docs.nestjs.com/providers

## Conclusion

Decomposing god-object services is a critical step in improving code maintainability and testability. By following the Single Responsibility Principle and using proper dependency injection, we create services that are easier to understand, test, and maintain.

**Next Steps:**

1. Start with subscription-billing.service.ts (Phase 1)
2. Create focused services following this guide
3. Update tests and module providers
4. Document the new structure in architecture docs
