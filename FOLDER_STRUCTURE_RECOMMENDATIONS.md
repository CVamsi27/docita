# Recommended Folder Structure - Best Practices Guide

## Current vs. Proposed Backend Organization

### Current Structure (Module-based, Mixed Concerns)
```
apps/api/src/
├── modules/
│   ├── subscriptions/
│   │   ├── subscription-billing.service.ts          [1,182 lines - GOD OBJECT]
│   │   ├── subscription.controller.ts
│   │   ├── billing-calculation.service.ts
│   │   ├── proration.service.ts
│   │   ├── referral.service.ts
│   │   └── subscription.module.ts
│   ├── billing/
│   │   ├── pricing.controller.ts
│   │   ├── pricing.service.ts
│   │   └── billing.module.ts
│   ├── payments/
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── payments.module.ts
│   └── [100+ other modules]
├── common/
│   ├── services/
│   │   ├── pdf/
│   │   │   ├── pdf-generator.service.ts             [1,342 lines]
│   │   │   └── base-pdf.service.ts
│   │   ├── feature-flag.service.ts
│   │   └── [scattered utilities]
│   ├── guards/
│   ├── filters/
│   └── interceptors/
└── prisma/
    └── [direct access everywhere]
```

### Proposed Structure (DDD-based, Clear Separation of Concerns)
```
apps/api/src/
├── domains/                              [DOMAIN-DRIVEN DESIGN]
│   ├── billing/                         [Unified billing domain]
│   │   ├── core/                        [Domain logic]
│   │   │   ├── entities/
│   │   │   │   ├── invoice.entity.ts
│   │   │   │   ├── invoice-item.entity.ts
│   │   │   │   └── payment.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── money.value-object.ts
│   │   │   │   ├── invoice-status.value-object.ts
│   │   │   │   └── billing-period.value-object.ts
│   │   │   └── services/
│   │   │       ├── billing-calculator.service.ts
│   │   │       ├── invoice-validator.service.ts
│   │   │       └── billing.constants.ts
│   │   ├── application/                 [Use cases & DTOs]
│   │   │   ├── use-cases/
│   │   │   │   ├── create-invoice.use-case.ts
│   │   │   │   ├── update-invoice-status.use-case.ts
│   │   │   │   └── calculate-prorations.use-case.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-invoice.dto.ts
│   │   │   │   └── invoice-response.dto.ts
│   │   │   └── ports/                   [Interfaces/contracts]
│   │   │       ├── invoice.repository.port.ts
│   │   │       └── payment-gateway.port.ts
│   │   ├── infrastructure/              [Implementation details]
│   │   │   ├── repositories/
│   │   │   │   └── invoice.repository.ts
│   │   │   ├── external-services/
│   │   │   │   ├── razorpay-payment.service.ts
│   │   │   │   └── email-notification.service.ts
│   │   │   └── mappers/
│   │   │       └── invoice.mapper.ts
│   │   ├── presentation/                [API layer]
│   │   │   ├── controllers/
│   │   │   │   └── invoices.controller.ts
│   │   │   ├── api-schemas/
│   │   │   │   └── invoice.schema.ts
│   │   │   └── middleware/
│   │   │       └── invoice-authorization.middleware.ts
│   │   └── billing.module.ts            [Module definition]
│   │
│   ├── subscription/                    [Subscription domain]
│   │   ├── core/
│   │   │   ├── entities/
│   │   │   │   └── subscription.entity.ts
│   │   │   └── services/
│   │   │       ├── subscription-lifecycle.service.ts
│   │   │       └── subscription.constants.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── activate-subscription.use-case.ts
│   │   │   │   ├── upgrade-subscription.use-case.ts
│   │   │   │   └── cancel-subscription.use-case.ts
│   │   │   ├── dto/
│   │   │   │   └── subscription.dto.ts
│   │   │   └── ports/
│   │   │       ├── subscription.repository.port.ts
│   │   │       └── plan-calculator.port.ts
│   │   ├── infrastructure/
│   │   │   └── repositories/
│   │   │       └── subscription.repository.ts
│   │   ├── presentation/
│   │   │   └── controllers/
│   │   │       └── subscriptions.controller.ts
│   │   └── subscription.module.ts
│   │
│   ├── patients/                       [Another domain example]
│   │   ├── core/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── patients.module.ts
│   │
│   └── [refactored appointments, clinical, etc.]
│
├── shared/                             [Cross-cutting concerns]
│   ├── modules/
│   │   ├── database/
│   │   │   ├── repositories/
│   │   │   │   ├── base.repository.ts
│   │   │   │   ├── pagination.helper.ts
│   │   │   │   └── query-builder.ts
│   │   │   └── database.module.ts
│   │   ├── auth/
│   │   │   ├── guards/
│   │   │   ├── strategies/
│   │   │   ├── decorators/
│   │   │   └── auth.module.ts
│   │   ├── document-generation/       [Replaces pdf-generator monolith]
│   │   │   ├── builders/
│   │   │   │   ├── invoice-document.builder.ts
│   │   │   │   ├── prescription-document.builder.ts
│   │   │   │   └── report-document.builder.ts
│   │   │   ├── renderers/
│   │   │   │   ├── pdf-renderer.ts
│   │   │   │   ├── table-renderer.ts
│   │   │   │   └── layout-manager.ts
│   │   │   ├── strategies/
│   │   │   │   ├── invoice.strategy.ts
│   │   │   │   └── prescription.strategy.ts
│   │   │   └── document-generation.module.ts
│   │   ├── messaging/                 [Replaces WhatsApp God Module]
│   │   │   ├── templates/
│   │   │   │   ├── template.service.ts
│   │   │   │   └── template.repository.ts
│   │   │   ├── channels/
│   │   │   │   ├── whatsapp/
│   │   │   │   │   ├── whatsapp.service.ts
│   │   │   │   │   ├── whatsapp-webhook.handler.ts
│   │   │   │   │   └── whatsapp.api-client.ts
│   │   │   │   ├── email/
│   │   │   │   │   └── email.service.ts
│   │   │   │   ├── sms/
│   │   │   │   │   └── sms.service.ts
│   │   │   │   └── channels.module.ts
│   │   │   ├── notifications/
│   │   │   │   └── notification-orchestrator.ts
│   │   │   └── messaging.module.ts
│   │   ├── config/
│   │   │   ├── app.configuration.ts
│   │   │   ├── database.configuration.ts
│   │   │   ├── logger.configuration.ts
│   │   │   └── config.module.ts
│   │   ├── error-handling/
│   │   │   ├── exceptions/
│   │   │   │   ├── validation.exception.ts
│   │   │   │   ├── not-found.exception.ts
│   │   │   │   └── business-logic.exception.ts
│   │   │   ├── filters/
│   │   │   │   └── global-exception.filter.ts
│   │   │   ├── logger.service.ts
│   │   │   └── error-handling.module.ts
│   │   └── [queue, cache, audit, etc.]
│   │
│   └── constants/
│       ├── index.ts
│       ├── auth.constants.ts
│       ├── subscription.constants.ts
│       └── billing.constants.ts
│
└── main.ts
```

---

## Frontend Structure - Recommended Organization

### Current Frontend (Route-based but scattered components)
```
apps/app/
├── app/
│   ├── portal/
│   │   ├── [patient pages]
│   ├── (protected)/
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   └── components/        [Components scattered in routes]
│   │   ├── appointments/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   └── settings/
│   ├── login/
│   ├── api/                        [API routes - good ✓]
│   └── layout.tsx
├── components/                     [Some shared, but not organized]
├── lib/                           [Scattered utilities]
├── hooks/                         [App-level hooks missing]
└── providers/

[Issue: Hard to find components, utilities, hooks]
```

### Recommended Frontend Structure
```
apps/app/
├── app/                                [Next.js routes]
│   ├── (auth)/                        [Group: Authentication routes]
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── auth-layout.tsx
│   ├── (protected)/                   [Group: Authenticated routes]
│   │   ├── dashboard/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── clinical/
│   │   ├── billing/
│   │   ├── [clinic]/settings/
│   │   └── layout.tsx
│   ├── landing/
│   ├── api/                          [API routes]
│   │   ├── auth/
│   │   ├── clinic/
│   │   └── patients/
│   ├── error.tsx
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                       [Shared components - WELL ORGANIZED]
│   ├── common/
│   │   ├── buttons/
│   │   │   ├── button.tsx
│   │   │   ├── primary-button.tsx
│   │   │   ├── secondary-button.tsx
│   │   │   ├── button.stories.tsx
│   │   │   └── button.test.tsx
│   │   ├── inputs/
│   │   │   ├── text-input.tsx
│   │   │   ├── select.tsx
│   │   │   └── checkbox.tsx
│   │   ├── dialogs/
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   └── dialog.test.tsx
│   │   ├── loaders/
│   │   ├── empty-state/
│   │   └── error-boundary/
│   ├── layout/
│   │   ├── navbar.tsx
│   │   ├── sidebar.tsx
│   │   ├── breadcrumbs.tsx
│   │   └── footer.tsx
│   ├── forms/
│   │   ├── patient-form.tsx
│   │   ├── appointment-form.tsx
│   │   ├── prescription-form.tsx
│   │   ├── invoice-form.tsx
│   │   └── form-helpers.ts
│   ├── tables/
│   │   ├── data-table.tsx
│   │   ├── columns/
│   │   │   ├── patient-columns.tsx
│   │   │   ├── appointment-columns.tsx
│   │   │   └── types.ts
│   │   └── use-data-table.ts
│   └── index.ts                    [Barrel export]
│
├── features/                       [Feature-specific components]
│   ├── patients/
│   │   ├── components/
│   │   │   ├── patient-card.tsx
│   │   │   ├── patient-list.tsx
│   │   │   └── patient-detail-view.tsx
│   │   ├── hooks/
│   │   │   ├── use-patients.ts
│   │   │   └── use-patient-form.ts
│   │   ├── lib/
│   │   │   ├── patient-validation.ts
│   │   │   ├── patient-formatters.ts
│   │   │   └── patient.constants.ts
│   │   └── index.ts
│   ├── appointments/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── index.ts
│   ├── clinical/
│   ├── billing/
│   └── settings/
│
├── lib/                            [Cross-cutting utilities]
│   ├── api/
│   │   ├── client.ts              [API client configuration]
│   │   ├── endpoints.ts           [API route mappings]
│   │   └── fetch-wrapper.ts       [Centralized fetch]
│   ├── auth/
│   │   ├── session.ts
│   │   ├── permissions.ts
│   │   └── auth-helpers.ts
│   ├── validation/
│   │   ├── schemas.ts             [Zod schemas]
│   │   └── validators.ts
│   ├── formatters/
│   │   ├── date-formatters.ts
│   │   └── currency-formatters.ts
│   ├── hooks/                      [App-level hooks]
│   │   ├── use-api.ts
│   │   ├── use-notification.ts
│   │   └── use-feature-flags.ts
│   ├── constants/
│   │   ├── status-mappings.ts
│   │   ├── enum-labels.ts
│   │   └── routes.constants.ts
│   ├── errors/
│   │   ├── error-parser.ts
│   │   └── error-messages.ts
│   └── index.ts                   [Barrel export]
│
├── hooks/                          [Simple app-wide hooks]
│   ├── use-modal.ts
│   ├── use-tab.ts
│   ├── use-debounce.ts            [Now using @workspace/hooks]
│   └── index.ts
│
├── providers/                      [Context providers]
│   ├── app-provider.tsx            [Root provider with all contexts]
│   ├── auth-provider.tsx
│   ├── notification-provider.tsx
│   ├── theme-provider.tsx
│   └── feature-flag-provider.tsx
│
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── utilities.css
│
├── types/
│   ├── api.ts
│   ├── domain.ts
│   └── component.ts
│
├── config/
│   ├── app.config.ts
│   ├── api.config.ts
│   └── feature-flags.config.ts
│
└── package.json
```

---

## Shared Packages - Recommended Structure

### Current Organization (Good baseline)
```
packages/
├── db/                      [Prisma & DB client]
├── ui/                      [Shadcn UI components]
├── types/                   [Shared types]
├── utils/                   [Shared utilities - needs organization]
├── hooks/                   [Shared React hooks]
├── auth/                    [Auth logic]
├── config/
├── eslint-config/
└── typescript-config/
```

### Proposed - More Focused Packages
```
packages/
├── db/                      [Prisma client]
│   ├── prisma/
│   ├── src/
│   │   ├── repositories/   [All repositories go here]
│   │   ├── migrations/
│   │   └── seed/
│   └── package.json
│
├── ui/                      [Shared UI library - @workspace/ui]
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── index.ts
│   └── package.json
│
├── types/                   [Shared type definitions]
│   ├── src/
│   │   ├── api/
│   │   ├── domain/
│   │   ├── common/
│   │   └── index.ts
│   └── package.json
│
├── utils/                   [Shared utilities]
│   ├── src/
│   │   ├── date/            [Date utilities]
│   │   │   ├── index.ts
│   │   │   ├── date-formatter.ts
│   │   │   ├── date-parser.ts
│   │   │   └── date-calculator.ts
│   │   ├── medical/         [Medical utilities]
│   │   │   ├── index.ts
│   │   │   ├── vital-validation.ts
│   │   │   ├── dosage-calculator.ts
│   │   │   └── medical-constants.ts
│   │   ├── formatting/      [Formatting utilities]
│   │   │   └── currency-formatter.ts
│   │   ├── validation/      [Validation utilities]
│   │   │   └── common-validators.ts
│   │   ├── security/        [Security utilities]
│   │   │   └── html-sanitizer.ts
│   │   └── index.ts
│   └── package.json
│
├── hooks/                   [Shared React hooks]
│   ├── src/
│   │   ├── use-debounce.ts
│   │   ├── use-local-storage.ts
│   │   ├── use-intersection-observer.ts
│   │   ├── use-mounted.ts
│   │   ├── use-toggle.ts
│   │   ├── use-media-query.ts
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-click-outside.ts
│   │   └── index.ts
│   └── package.json
│
├── auth/                    [Authentication logic]
│   ├── src/
│   │   ├── strategies/
│   │   ├── guards/
│   │   ├── decorators/
│   │   ├── types/
│   │   └── index.ts
│   └── package.json
│
├── data-access/             [Data access layer - repositories]
│   ├── src/
│   │   ├── repositories/
│   │   │   ├── base.repository.ts
│   │   │   └── index.ts
│   │   ├── factories/
│   │   └── index.ts
│   └── package.json
│
├── config/                  [Shared configuration]
│   ├── src/
│   │   ├── app.config.ts
│   │   ├── constants.ts
│   │   └── index.ts
│   └── package.json
│
├── eslint-config/
├── typescript-config/
└── jest-config/             [Shared Jest config]
```

---

## Key Principles

### 1. **Domain-Driven Design (DDD)**
- Organize around business domains, not technical layers
- Each domain has clear boundaries
- Easy to understand business logic

### 2. **Single Responsibility Principle**
- Services do ONE thing well
- Composition through dependency injection
- Easy to test and reuse

### 3. **Layered Architecture (per domain)**
- **Core**: Business entities, domain services, value objects
- **Application**: Use cases, DTOs, ports (interfaces)
- **Infrastructure**: Repository implementations, external service clients
- **Presentation**: Controllers, middleware, schemas

### 4. **Dependency Inversion**
- Domains depend on abstractions (ports)
- Implementations injected at runtime
- Easy to swap implementations (testing, alternative providers)

### 5. **Shared Conventions**
- File naming: `entity.ts`, `service.ts`, `.dto.ts`, `.repository.ts`
- Folder structure: Core > Application > Infrastructure > Presentation
- Barrel exports: `index.ts` in each folder for clean imports

---

## Migration Path

### Incremental Approach (Don't rewrite everything)

**Phase 1**: Start with new features in DDD structure
```typescript
// New features use DDD:
src/domains/new-feature/ { core, application, infrastructure, presentation }

// Old modules refactored gradually:
src/modules/billing/ { existing code with small improvements }
```

**Phase 2**: Refactor existing large modules
```
Week 1-2: Billing module
Week 3-4: Subscription module
Week 5-6: WhatsApp module
```

**Phase 3**: Reorganize frontend gradually
```
- New features in recommended structure
- Slowly migrate existing routes
```

---

## Benefits of Recommended Structure

| Aspect | Current | Proposed |
|--------|---------|----------|
| **Discoverability** | Hard - scattered across 100+ modules | Easy - organized by domain |
| **Testing** | Complex dependencies | Clear ports/interfaces |
| **Reusability** | Difficult - tight coupling | Natural - composition |
| **Onboarding** | Steep - where is billing logic? | Fast - clear domain boundaries |
| **Scaling** | Services grow large | Bounded contexts, manageable size |
| **Shared Logic** | Duplicated in services | Centralized in domain services |
| **Feature Development** | Risk of breaking other features | Isolated within domain |
| **Database Changes** | Ripple through 10+ services | Contained in repositories |
