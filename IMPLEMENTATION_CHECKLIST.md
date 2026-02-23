# Code Quality Implementation Checklist

**Created**: February 19, 2026  
**Scope**: 18-week refactoring roadmap for docita codebase  
**Owner**: Development Team  
**Status**: In Planning

---

## Phase 1: Foundation (Weeks 1-2) - QUICK WINS

### P1.1: Consolidate Business Constants

- [ ] Create `apps/api/src/modules/subscription/subscription.constants.ts`
  - [ ] Consolidate 3x `REFERRAL_DISCOUNT_PERCENT` definitions
  - [ ] Consolidate common billing constants
  - [ ] Export all subscription domain constants from single file
- [ ] Create `apps/api/src/modules/billing/billing.constants.ts`
  - [ ] Move hardcoded price tiers
  - [ ] Move invoice numbering patterns
- [ ] Update imports in all services (use grep: REFERRAL_DISCOUNT_PERCENT)
- [ ] Add barrel export `apps/api/src/constants/index.ts`
- [ ] Verify all tests pass

**Owner**: [Assign]  
**Effort**: 1 day  
**Impact**: HIGH - Improves maintainability, reduces duplication

---

### P1.2: Centralize Configuration

- [ ] Create `apps/api/src/config/app.configuration.ts`
  - [ ] Class-based config with typed getters
  - [ ] Support for environment variable fallbacks
  - [ ] Validation on instantiation
- [ ] Migrate all `process.env` accesses (91 instances)
  - [ ] Search: `grep_search "process.env" --isRegexp`
  - [ ] Replace with config service injection
- [ ] Update `.env.example` with all required vars
- [ ] Test with CI/CD pipeline
- [ ] Add configuration section to CONTRIBUTING.md

**Owner**: [Assign]  
**Effort**: 1.5 days  
**Impact**: MEDIUM - Improves security, reduces env var bugs

---

### P1.3: Migrate Raw SQL to Safer Queries

- [ ] Identify all `$queryRawUnsafe` calls
  - [ ] Search: `grep_search "$queryRawUnsafe"`
- [ ] Convert to `$queryRaw` with tagged templates
  - [ ] Current: `prisma.$queryRawUnsafe("SELECT * FROM " + table)`
  - [ ] Target: `prisma.$queryRaw\`SELECT \* FROM ${table}\``
- [ ] Add parameterized query examples to data-access docs
- [ ] Create utility functions for common raw SQL patterns
- [ ] Add security review checklist to PR template

**Owner**: [Assign]  
**Effort**: 1 day  
**Impact**: HIGH - Security vulnerability mitigation

---

**Phase 1 Total Effort**: 3.5 days (can parallelize all 3)

---

## Phase 2: Type Safety (Weeks 3-5)

### P2.1: Eliminate `any` Types

- [ ] **Audit 145+ `any` instances**
  - [ ] Search: `grep_search " any" --isRegexp`
  - [ ] Categorize: function params (45), return types (30), variable types (35), error handlers (35)
- [ ] **Week 3: Function signatures with `any` params**
  - [ ] Priority 1: Error handlers (35 instances) → `Error` base type
  - [ ] Priority 2: Event handlers (20 instances) → Specific event types
  - [ ] Add types from existing schemas
- [ ] **Week 4: Return types**
  - [ ] Data transformation functions → specific return types
  - [ ] API response handlers → discriminated unions
  - [ ] Create common response types
- [ ] **Week 5: Variable types**
  - [ ] Intermediate values in calculations
  - [ ] Collection types
  - [ ] Add type inference guidance to contributions guide

**Owner**: [Assign]  
**Effort**: 3+ weeks (parallel team work recommended)  
**Impact**: MEDIUM - Better IDE support, fewer runtime bugs

---

### P2.2: Standardize Error Handling

- [ ] Create error hierarchy
  ```typescript
  src/common/errors/
  ├── app.error.ts           (base)
  ├── validation.error.ts    (form validation, rules)
  ├── not-found.error.ts     (404s)
  ├── conflict.error.ts      (409s, business logic)
  ├── unauthorized.error.ts  (401s)
  ├── forbidden.error.ts     (403s)
  └── internal.error.ts      (500s)
  ```
- [ ] Update `apps/api/src/common/filters/global-exception.filter.ts`
  - [ ] Map custom errors to HTTP status codes
  - [ ] Log with context but never PHI
  - [ ] Add sentry integration
- [ ] Audit all `catch (error: any)` blocks (35 instances)
  - [ ] Type to `Error` or specific domain exception
  - [ ] Add logging with operation context
- [ ] Add error handling guide to CONTRIBUTING.md
- [ ] Create error shape tests

**Owner**: [Assign]  
**Effort**: 1.5 weeks  
**Impact**: MEDIUM - Consistent error responses, better debugging

---

### P2.3: Refactor Large Test Files

- [ ] Identify test files >500 lines
  - [ ] `subscription.service.spec.ts` (680 lines)
  - [ ] `appointment.service.spec.ts` (620 lines)
  - [ ] `patient.service.spec.ts` (550 lines)
  - [ ] Others: grep for `.spec.ts` files and check line count
- [ ] Split each into logical suites
  - [ ] Separate arrange/act/assert
  - [ ] Group by feature (creation, updates, deletion, edge cases)
  - [ ] Share common fixtures in `test-fixtures.ts`
- [ ] Create `shared/testing/` directory
  - [ ] `mock-factories.ts` - Data builders
  - [ ] `test-db-helper.ts` - DB transaction helpers
  - [ ] `mock-services.ts` - Service mocks
- [ ] Target: No test file >250 lines

**Owner**: [Assign]  
**Effort**: 1.5 weeks  
**Impact**: LOW-MEDIUM - Easier to navigate, faster test runs

---

**Phase 2 Total Effort**: 6 weeks (can parallelize all 3)

---

## Phase 3: Architecture (Weeks 6-12) - CRITICAL WORK

### P3.1: Break Subscription Billing God Object

**Current State**: `subscription-billing.service.ts` (1,182 lines, 22 methods)

- [ ] **Analysis**
  - [ ] Extract method signatures and dependencies
  - [ ] Map data flows between methods
  - [ ] Identify transaction boundaries
- [ ] **Create 5 focused services**
  ```
  src/modules/subscriptions/
  ├── services/
  │   ├── billing-calculation.service.ts    (420 lines)
  │   ├── subscription-lifecycle.service.ts  (380 lines)
  │   ├── checkout-orchestrator.service.ts   (280 lines)
  │   ├── referral.service.ts               (140 lines)
  │   └── payment-method.service.ts         (80 lines)
  ```
- [ ] **Create orchestrator pattern**
  ```typescript
  // Old: this.subscriptionBilling.activateSubscription(...)
  // New: this.orchestrator.activateSubscription(...)
  // Orchestrator internally uses 3-4 focused services
  ```
- [ ] **Update all importers** (grep: `SubscriptionBillingService`)
- [ ] **Add integration tests** verifying orchestration
- [ ] **Monitor performance** - ensure no additional queries

**Owner**: [Assign]  
**Effort**: 4-6 weeks (2 devs recommended)  
**Impact**: HIGH - Enables other features, prevents merge conflicts

---

### P3.2: Implement Repository Pattern

**Current State**: 779+ direct Prisma calls, only 3 repositories

- [ ] **Week 6-7: Create repository infrastructure**
  - [ ] Create `src/shared/data-access/base.repository.ts`
    ```typescript
    abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
      async findById(id: string): Promise<T>;
      async findAll(options?: FindOptions): Promise<Paginated<T>>;
      async create(dto: CreateDTO): Promise<T>;
      async update(id: string, dto: UpdateDTO): Promise<T>;
      async delete(id: string): Promise<void>;
      // Query building helpers
    }
    ```
  - [ ] Create `src/shared/data-access/query-builder.ts`
    - [ ] Common query patterns (with relations, pagination, filtering)
  - [ ] Create `src/shared/data-access/pagination.helper.ts`

- [ ] **Week 7-8: Extract repositories for main entities** (Priority 1)
  - [ ] `BaseAppoRepository`
  - [ ] `PatientRepository`
  - [ ] `InvoiceRepository`
  - [ ] `PrescriptionRepository`
  - [ ] `SubscriptionRepository`
  - [ ] Each: extract all Prisma queries into methods, add specs

- [ ] **Week 9-10: Extract repositories for secondary entities** (Priority 2)
  - [ ] CloudRoom / Clinical repositories
  - [ ] Billing entities
  - [ ] Document repositories

- [ ] **Week 10-11: Migrate services to use repositories**
  - [ ] Priority 1 services: 15-20 services
  - [ ] Update imports: remove direct `this.prisma` calls
  - [ ] Add unit tests for repository layer

- [ ] **Week 11-12: Query optimization**
  - [ ] Review all Prisma calls for N+1 patterns
  - [ ] Ensure eager loading is consistent
  - [ ] Performance test with real data volume

**Owner**: [Assign] (2+ devs for extraction phase)  
**Effort**: 5-6 weeks (can parallelize Priority 1 & 2)  
**Impact**: HIGH - Better testability, data consistency, reduced Prisma knowledge spread

---

### P3.3: Refactor WhatsApp Module

**Current State**: 23 files, 19 providers, excessive coupling

- [ ] **Sub-module 1: Message Templates** (Weeks 6-7)
  - [ ] Create `src/modules/messaging/templates/`
  - [ ] Service: template rendering, variable substitution
  - [ ] Repository: template CRUD, versioning
  - [ ] Extract from current: `whatsapp-template-loader.provider`, `message-formatter.provider`

- [ ] **Sub-module 2: Messaging Channel** (Weeks 7-9)
  - [ ] Create `src/modules/messaging/channels/whatsapp/`
  - [ ] Separate: message sending, API client, error handling
  - [ ] Extract from: `whatsapp-service.provider`, `message-sender.provider`, `whatsapp-client.provider`
  - [ ] Remove phone number formatting providers (move to utils)

- [ ] **Sub-module 3: Webhook Handlers** (Weeks 9-10)
  - [ ] Create `src/modules/messaging/webhooks/`
  - [ ] Separate: webhook processing, ACK handling, status updates
  - [ ] Extract from: `webhook-handler.provider`, `message-status-tracker.provider`
  - [ ] Add queue for async processing

- [ ] **Sub-module 4: Notifications Orchestrator** (Weeks 10-11)
  - [ ] Create `src/modules/notifications/`
  - [ ] Service: selects channel (WhatsApp, Email, SMS) based on preferences
  - [ ] Extract from: `notification-manager.provider`, `channel-selector.provider`

- [ ] **Module Definition** (Week 11-12)
  - [ ] Update `messaging.module.ts` with new structure
  - [ ] Export clean routes (MessageTemplate, SendMessage, WebhookReceiver)
  - [ ] Remove unused providers (19 → ~8 focused providers)

**Owner**: [Assign]  
**Effort**: 4-6 weeks  
**Impact**: MEDIUM - Easier to maintain, reduce bugs from coupling

---

**Phase 3 Total Effort**: 10 weeks (recommend 2-3 devs, parallelize services)

---

## Phase 4: Optimization (Weeks 13-16)

### P4.1: Query Optimization Pattern

- [ ] Create Query Object pattern
  ```typescript
  // Example: InvoiceQueryBuilder.byClinic(clinicId).unpaid().withPatient()
  ```
- [ ] Audit 45+ N+1 query patterns identified
- [ ] Create `query-optimizer.utility.ts` with:
  - [ ] Eager loading helpers
  - [ ] Batch loading utilities
  - [ ] Caching decorators
- [ ] Document patterns in code-standards.md
- [ ] Add query analyzer to CI/CD

**Owner**: [Assign]  
**Effort**: 1-2 weeks  
**Impact**: MEDIUM - Performance improvements

---

### P4.2: PDF Generator Refactoring

**Current State**: `pdf-generator.service.ts` (1,342 lines, 3 document types)

- [ ] Create Strategy pattern (Week 13)
  ```
  src/shared/modules/document-generation/
  ├── builders/
  │   ├── invoice-document.builder.ts
  │   ├── prescription-document.builder.ts
  │   └── report-document.builder.ts
  └── renderers/
      ├── table-renderer.ts
      └── layout-manager.ts
  ```
- [ ] Extract document-specific logic into builders
- [ ] Create reusable rendering components
- [ ] Test each builder independently
- [ ] Performance: maintain or improve PDF generation time

**Owner**: [Assign]  
**Effort**: 1.5-2 weeks  
**Impact**: MEDIUM - Easier to add new document types

---

### P4.3: Frontend Organization

- [ ] Reorganize `apps/app/components/` by type
  - [ ] `common/` - Generic, reusable components
  - [ ] `forms/` - Form-specific components
  - [ ] `layout/` - Layout components
  - [ ] `tables/` - Table-specific components
- [ ] Audit and remove 12+ duplicate components
  - [ ] List components: `grep_search "type\s+List"` in tsx files
- [ ] Create feature directories for domain components (see folder structure guide)
- [ ] Move deep imports to use `@workspace/` aliases
- [ ] Verify all 1,200+ imports still work

**Owner**: [Assign]  
**Effort**: 1.5-2 weeks  
**Impact**: MEDIUM - Easier navigation, reduced duplication

---

### P4.4: Deep Relative Imports Elimination

- [ ] Audit all `../../../` imports (558 identified)
- [ ] Strategy:
  - [ ] Create path alias for each domain: `@features/billing`, `@features/patients`
  - [ ] Update `tsconfig.json` with aliases
  - [ ] Create barrel exports in domain index.ts
  - [ ] Replace 3+ level imports with aliases
- [ ] Verify TypeScript compilation after each batch
- [ ] Update ESLint rules to enforce max 1-level relative imports

**Owner**: [Assign]  
**Effort**: 1-1.5 weeks  
**Impact**: LOW - Code readability, maintainability

---

**Phase 4 Total Effort**: 5-6 weeks

---

## Phase 5: Polish (Weeks 17-18)

### P5.1: Magic Numbers to Constants

- [ ] Identify 40+ magic numbers
  - [ ] Search: `grep_search "\b[0-9]+\b"` in service files
  - [ ] Filter constants (page sizes 20, 50; timeouts 5000; retry counts)
- [ ] Create constants files by domain
- [ ] Document why each constant exists
- [ ] Add unit tests verifying constants are used

**Owner**: [Assign]  
**Effort**: 2-3 days  
**Impact**: LOW - Code clarity

---

### P5.2: Technical Debt Triage

- [ ] Collate all TODO/FIXME comments
- [ ] Create GitHub Issues for each major item
- [ ] Prioritize by impact/effort
- [ ] Plan into future sprints or backlog
- [ ] Remove obsolete TODOs

**Owner**: [Assign]  
**Effort**: 1-2 days  
**Impact**: LOW - Housekeeping

---

### P5.3: Documentation & Training

- [ ] Update architecture documentation
- [ ] Create runbooks for common tasks
- [ ] Record walkthrough video for new developers
- [ ] Add to onboarding checklist
- [ ] Gather team feedback and iterate

**Owner**: [Assign]  
**Effort**: 2-3 days  
**Impact**: MEDIUM - Team velocity, fewer bugs

---

**Phase 5 Total Effort**: 5-7 days

---

## Summary: 18-Week Refactoring Roadmap

| Phase | Weeks | Focus                                             | Effort          | Parallel Work                                   |
| ----- | ----- | ------------------------------------------------- | --------------- | ----------------------------------------------- |
| **1** | 1-2   | Foundation (constants, config, security)          | 3.5 days        | All 3 in parallel                               |
| **2** | 3-5   | Type Safety (any types, error handling, tests)    | 6 weeks         | All 3 in parallel (2 devs)                      |
| **3** | 6-12  | Architecture (God Objects, repositories, modules) | 10 weeks        | Parallelize: P3.1 + P3.2 (2 devs), P3.3 (1 dev) |
| **4** | 13-16 | Optimization (queries, UI, imports)               | 5-6 weeks       | All 4 in parallel                               |
| **5** | 17-18 | Polish (constants, TODOs, docs)                   | 5-7 days        | Can parallelize                                 |
|       |       |                                                   | **28-30 weeks** | **12-16 weeks with 2-3 devs**                   |

---

## Parallel Execution Recommendation

### Team Configuration

- **Developer A**: P3.1 (Subscription refactoring) - 6 weeks
- **Developer B**: P3.2 (Repository pattern) - 6 weeks
- **Developer C**: P1 + P2 + P3.3 (Sequential completion) - 10 weeks

**Result**: 6-week critical path with parallel feature development possible

---

## Success Metrics

After completing all 5 phases:

- [ ] God Objects eliminated (no service >300 lines)
- [ ] All direct Prisma calls replaced with repositories
- [ ] Zero `any` types in codebase (TypeScript strict)
- [ ] 90%+ test coverage on critical paths
- [ ] Average response time: <200ms (measured with k6)
- [ ] Bundle size: <1MB (frontend JS)
- [ ] Build time: <5 mins (API), <3 mins (Frontend)
- [ ] Code duplication: <5% (SonarQube scan)
- [ ] New feature development: 30% faster (velocity metric)

---

## Risk Mitigation

### For P3.1 & P3.2 (Critical Architecture Work)

- [ ] Feature flag new repository calls
- [ ] Dual-write pattern: old service + new repository
- [ ] Gradual migration service-by-service
- [ ] Maintain backwards compatibility during transition
- [ ] Continuous deployment with feature flags
- [ ] Rollback procedures for each phase

### Conflict Prevention

- [ ] Daily syncs during P3 work
- [ ] Git workflow: separate git branches per refactoring
- [ ] Code review requirement: 1 arch team member
- [ ] No merging without green CI/CD

---

## Tracking & Reporting

### Weekly Progress Updates

- Checklist completion status (% done)
- Blockers and mitigation
- Team velocity metrics
- Quality metrics (tests, linting, types)

### Monthly Milestones

- **After Week 2**: Foundation solid, constants & config centralized
- **After Week 5**: Type safety, test organization - easier to develop
- **After Week 12**: Architecture refactoring complete - team agility increases
- **After Week 16**: Performance baseline established
- **After Week 18**: Ready for next phase initiatives

---

## Going Forward: Prevention Rules

After completing this refactoring, enforce:

1. **No service >250 lines** - Split into focused services
2. **No `any` types** - Use strict TypeScript (update ESLint)
3. **No direct Prisma calls** outside repositories
4. **Max 2-level relative imports** - Use path aliases
5. **All new code has tests** (>80% coverage)
6. **Code review checklist** - Verify against guidelines above

---

## Responsible Parties (to fill in)

| Task                                | Owner | Backup |
| ----------------------------------- | ----- | ------ |
| Phase 1 Coordination                | [ ]   | [ ]    |
| Phase 2 Type Safety Lead            | [ ]   | [ ]    |
| Phase 3.1 Subscription Refactoring  | [ ]   | [ ]    |
| Phase 3.2 Repository Implementation | [ ]   | [ ]    |
| Phase 3.3 WhatsApp Reorganization   | [ ]   | [ ]    |
| Phase 4 Optimization                | [ ]   | [ ]    |
| Phase 5 polish                      | [ ]   | [ ]    |
| Quality Assurance                   | [ ]   | [ ]    |
| Documentation Update                | [ ]   | [ ]    |

---

## Resources & References

- [Folder Structure Recommendations](./FOLDER_STRUCTURE_RECOMMENDATIONS.md)
- [Code Quality Analysis Summary](./CODE_QUALITY_ANALYSIS_SUMMARY.md)
- [Contributing Guidelines](./CONTRIBUTING.md) - Updated with test strategy
- [Architecture Decision Records](./docs/architecture/) - Create if missing

---

**Last Updated**: February 19, 2026  
**Version**: 1.0 - Planning Phase
