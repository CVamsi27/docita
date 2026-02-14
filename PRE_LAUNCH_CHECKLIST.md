# 🚀 Docita — Pre-Launch Production Checklist

**Target Launch Date:** TBD  
**Last Updated:** 2026-02-14  
**Status:** 72% Complete (87/120 items)  
**Build:** ✅ PASSING | **Lint:** ✅ CLEAN | **Tests:** ✅ 896 PASSING

---

## 🎯 Pre-Launch Objectives

This document contains **ONLY** the critical tasks required to launch Docita to production with existing features perfected. All new business features and major enhancements are deferred to the Post-Launch Roadmap.

### Core Focus Areas
1. **Code Quality & Stability** - Zero build errors, zero critical bugs
2. **Security Hardening** - Production-grade security for PHI data
3. **Testing Coverage** - Comprehensive tests for all critical paths
4. **UI/UX Polish** - Professional, accessible interface
5. **API Completeness** - All endpoints validated and documented
6. **Deployment Ready** - Vercel (frontend), Railway (backend + DB)
7. **Performance** - Fast, responsive, scalable

---

## 📊 Progress Summary

| Category | Total | Complete | Remaining | % Done |
|----------|-------|----------|-----------|--------|
| **Critical Security** | 18 | 18 | 0 | ✅ 100% |
| **Code Quality** | 12 | 8 | 4 | 🟡 67% |
| **Testing & QA** | 8 | 6 | 2 | 🟢 75% |
| **UI/UX Essentials** | 6 | 2 | 4 | 🟡 33% |
| **API & Backend** | 5 | 4 | 1 | 🟢 80% |
| **Deployment** | 4 | 3 | 1 | 🟢 75% |
| **Performance** | 5 | 4 | 1 | 🟢 80% |
| **TOTAL** | **58** | **45** | **13** | **78%** |

---

## 🔴 CRITICAL - Code Quality & Stability

### CQ-1: Enable TypeScript Strict Mode
**Priority:** 🔴 CRITICAL | **Status:** ⏳ NOT STARTED | **Effort:** 2-3 days

**Current Issue:**
- API has `strict: false` in tsconfig.json
- 22+ `any` type usages bypass type checking
- `noImplicitAny: false` allows unsafe code

**Tasks:**
- [ ] Enable `strict: true` in apps/api/tsconfig.json
- [ ] Fix all resulting type errors (estimate: 50-100 fixes)
- [ ] Enable `noImplicitAny: true`
- [ ] Enable `strictBindCallApply: true`
- [ ] Enable `noFallthroughCasesInSwitch: true`
- [ ] Add `@typescript-eslint/no-explicit-any` as error
- [ ] Verify: Zero `any` types in production code

**Acceptance Criteria:**
- ✅ All packages build with strict: true
- ✅ Zero TypeScript errors
- ✅ Zero `any` types in services (excluding test mocks)

---

### CQ-2: Fix Error-Swallowing Anti-Patterns
**Priority:** 🔴 CRITICAL | **Status:** ⏳ NOT STARTED | **Effort:** 1-2 days

**Current Issue:**
- 20+ catch blocks swallow errors silently
- Payment failures may go unnoticed
- Data import errors lost in logs

**Tasks:**
- [ ] Audit all catch blocks in `payments/*.service.ts` (7 locations)
- [ ] Audit all catch blocks in `imports/*.service.ts` (8+ locations)
- [ ] Replace silent catches with proper error handling
- [ ] Remove redundant catch-log-rethrow in auth.controller.ts
- [ ] Replace all `console.error()` with `this.logger.error()` (5 occurrences)
- [ ] Add ESLint `no-console` rule for service files

**Acceptance Criteria:**
- ✅ All errors properly logged with context
- ✅ Critical errors re-thrown or handled explicitly
- ✅ Zero `console.*` calls in service files

---

### CQ-3: Eliminate Direct process.env Accesses
**Priority:** 🟡 HIGH | **Status:** 🟢 95% COMPLETE | **Effort:** 4 hours

**Current Issue:**
- 50 direct `process.env.*` accesses bypass validation
- Inconsistent configuration access

**Completed:**
- ✅ Replaced process.env in 6 core services (auth, database, main.ts)

**Remaining Tasks:**
- [ ] Add ESLint rule to ban `process.env` in module source files
- [ ] Verify no new process.env usages in future code

**Acceptance Criteria:**
- ✅ All config accessed via ConfigService.get()
- ✅ ESLint prevents new process.env usage
- ✅ Zero direct environment variable access in modules

---

### CQ-4: Fix Circular Dependencies
**Priority:** 🟡 HIGH | **Status:** ⏳ NOT STARTED | **Effort:** 1-2 days

**Current Issue:**
- 12 `forwardRef` usages indicate circular dependencies
- Reminders ↔ WhatsApp circular dependency
- WhatsApp internal service cycles

**Tasks:**
- [ ] Refactor Reminders → WhatsApp to use EventsModule
- [ ] Emit `ReminderDue` event from reminders module
- [ ] WhatsApp module subscribes to events (no direct dependency)
- [ ] Fix WhatsApp internal service dependency graph
- [ ] Remove all 12 `forwardRef` usages
- [ ] Add `madge` or `dpdm` to CI to prevent new circular deps

**Acceptance Criteria:**
- ✅ Zero `forwardRef` in production code
- ✅ CI fails on circular dependency detection
- ✅ Clean module dependency graph

---

## 🧪 CRITICAL - Testing & Quality Assurance

### TEST-1: Complete API Module Test Coverage
**Priority:** 🔴 CRITICAL | **Status:** ✅ 100% COMPLETE | **Effort:** DONE

**Status:**
- ✅ All 12/12 critical modules now have comprehensive tests
- ✅ 896 tests passing, 0 failing
- ✅ reminders: 108 tests
- ✅ email: 35 tests  
- ✅ medical-coding: 30 tests
- ✅ search: 22 tests
- ✅ templates: 28 tests
- ✅ contact: 22 tests
- ✅ custom-fields: 22 tests
- ✅ doctor-clinics: 18 tests
- ✅ feedback: 26 tests
- ✅ config: 35 tests
- ✅ performance: 18 tests
- ✅ referrals: 32 tests

**Acceptance Criteria:**
- ✅ ACHIEVED: 12/12 modules with comprehensive test coverage
- ✅ ACHIEVED: All tests passing in CI

---

### TEST-2: Frontend Component Testing
**Priority:** 🟡 HIGH | **Status:** ⏳ NOT STARTED | **Effort:** 3-4 days

**Current Issue:**
- Zero component tests for critical UI
- No React Testing Library setup
- 11 of 21 feature directories untested

**Priority Features to Test:**
- [ ] Patient management (forms, list, profile)
- [ ] Appointment scheduling (calendar, booking flow)
- [ ] Consultation view (vitals, notes, prescriptions)
- [ ] Invoice generation (items, calculation, preview)
- [ ] Settings forms (clinic info, permissions)

**Tasks:**
- [ ] Install and configure React Testing Library + Vitest
- [ ] Create test utilities (providers, mocks, factories)
- [ ] Add component tests for 5 priority features above
- [ ] Target: 50%+ component test coverage for core features
- [ ] Add component testing to CI pipeline

**Acceptance Criteria:**
- ✅ React Testing Library configured
- ✅ 20+ component test files for critical features
- ✅ All tests passing in CI
- ✅ Coverage report shows 50%+ for tested features

---

### TEST-3: E2E Critical User Flows
**Priority:** 🟡 HIGH | **Status:** 🟢 80% COMPLETE | **Effort:** 1-2 days

**Completed:**
- ✅ E2E infrastructure working
- ✅ RBAC enforcement tests
- ✅ Tenant isolation tests
- ✅ Health check endpoint tests

**Remaining Tasks:**
- [ ] Add Playwright E2E test for complete user journey:
  1. Login → Create Patient → Book Appointment
  2. Start Consultation → Add Vitals → Add Prescription
  3. Complete Consultation → Generate Invoice → Mark Paid
- [ ] Test across 3 user roles (admin, doctor, receptionist)
- [ ] Add E2E tests to CI with test database

**Acceptance Criteria:**
- ✅ Complete user flow works end-to-end
- ✅ All 3 roles can complete their workflows
- ✅ E2E tests run in CI on every PR

---

## 🎨 CRITICAL - UI/UX Essentials

### UI-1: Accessibility Compliance (WCAG 2.1 AA)
**Priority:** 🔴 CRITICAL | **Status:** ⏳ NOT STARTED | **Effort:** 3-5 days

**Current Issue:**
- Only 14 ARIA attributes across 311 components
- Keyboard navigation incomplete
- Color contrast not verified
- No screen reader testing

**Tasks:**
- [ ] Install and run axe-core audit on all main pages
- [ ] Fix all critical accessibility violations
- [ ] Add `aria-label` to all icon-only buttons (50+ buttons)
- [ ] Ensure all forms have proper labels
- [ ] Add keyboard navigation to sidebar, modals, dropdowns
- [ ] Implement skip-to-content link
- [ ] Verify color contrast meets 4.5:1 minimum
- [ ] Add focus management for modals and dialogs
- [ ] Add `aria-live` regions for toast notifications
- [ ] Test with screen reader (NVDA or VoiceOver)

**Acceptance Criteria:**
- ✅ Zero critical axe violations on core pages
- ✅ All interactive elements keyboard accessible
- ✅ Color contrast meets WCAG 2.1 AA
- ✅ Screen reader can navigate full patient workflow

---

### UI-2: Form Validation & Error Handling
**Priority:** 🟡 HIGH | **Status:** 🟡 50% COMPLETE | **Effort:** 2-3 days

**Completed:**
- ✅ Zod validation on backend
- ✅ Error boundary components

**Remaining Tasks:**
- [ ] Implement consistent inline error messages on all forms
- [ ] Add field-level validation with debounced feedback
- [ ] Show validation state (success, error, warning) clearly
- [ ] Add confirmation dialogs for destructive actions
- [ ] Test error states for all critical forms:
  - Patient registration
  - Appointment booking
  - Prescription creation
  - Invoice generation

**Acceptance Criteria:**
- ✅ All forms show clear inline error messages
- ✅ Users can't submit invalid data
- ✅ Destructive actions require confirmation
- ✅ Error states are visually obvious and helpful

---

### UI-3: Loading & Empty States
**Priority:** 🟡 HIGH | **Status:** 🟡 40% COMPLETE | **Effort:** 2 days

**Completed:**
- ✅ Global loading.tsx with skeletons
- ✅ Global error.tsx with retry

**Remaining Tasks:**
- [ ] Add skeleton loaders to all data-heavy pages
- [ ] Replace all spinner-only loading states
- [ ] Add empty state illustrations for:
  - No patients
  - No appointments
  - No invoices
  - Search no results
- [ ] Add helpful empty state actions ("Create first patient")
- [ ] Test loading states on slow 3G connection

**Acceptance Criteria:**
- ✅ All list views have skeleton loaders
- ✅ All empty states have helpful illustrations
- ✅ Loading states feel fast and responsive
- ✅ No jarring layout shifts during loading

---

### UI-4: Mobile Responsiveness
**Priority:** 🟡 HIGH | **Status:** 🟡 60% COMPLETE | **Effort:** 2-3 days

**Current Status:**
- ✅ Tailwind responsive classes used throughout
- ⚠️ Not thoroughly tested on mobile devices

**Tasks:**
- [ ] Test all critical pages on mobile (375px width)
- [ ] Fix any layout breaks on small screens:
  - Patient list
  - Appointment calendar
  - Consultation view
  - Invoice generation
  - Settings pages
- [ ] Ensure touch targets are at least 48x48px
- [ ] Test on real Android and iOS devices
- [ ] Fix any horizontal scroll issues

**Acceptance Criteria:**
- ✅ All pages work smoothly on 375px width
- ✅ Touch targets meet minimum size
- ✅ No horizontal scrolling
- ✅ Tested on real mobile devices

---

## 🔒 CRITICAL - Security (Already 100% Complete)

### ✅ SEC-1: Authentication & Authorization
**Status:** ✅ COMPLETE

- ✅ HttpOnly cookies for JWT tokens
- ✅ Refresh token rotation
- ✅ RBAC enforcement with comprehensive E2E tests
- ✅ CSRF protection
- ✅ Session timeout (30 min idle)

### ✅ SEC-2: Data Protection
**Status:** ✅ COMPLETE

- ✅ Encryption key management with startup validation
- ✅ All PHI fields encrypted at rest
- ✅ Audit trail for all PHI access
- ✅ HIPAA/DPDP compliance verified

### ✅ SEC-3: API Security
**Status:** ✅ COMPLETE

- ✅ Rate limiting on auth endpoints
- ✅ Input validation with Zod schemas
- ✅ Content-Security-Policy headers
- ✅ Request payload size limits
- ✅ API versioning (/api/v1/)

---

## 🔌 API & Backend Completeness

### API-1: Complete DTO Validation
**Priority:** 🟡 HIGH | **Status:** ⏳ NOT STARTED | **Effort:** 1-2 days

**Current Issue:**
- 15-20 endpoints use inline `@Body()` types without validation
- Razorpay webhook, refresh token, create checkout lack DTOs

**Tasks:**
- [ ] Create Zod DTOs for all unvalidated endpoints:
  - webhooks.controller.ts (Razorpay webhook)
  - auth.controller.ts (refresh token)
  - subscription.controller.ts (create checkout)
  - consent.controller.ts (emergency access)
  - imports.controller.ts (multiple endpoints)
- [ ] Add `@UsePipes(ZodValidationPipe)` to all endpoints
- [ ] Add CI check: no inline `@Body()` without DTO class

**Acceptance Criteria:**
- ✅ All API endpoints have validated DTOs
- ✅ CI fails on inline body type annotations
- ✅ Input validation prevents malformed requests

---

### ✅ API-2: API Documentation
**Priority:** 🟡 HIGH | **Status:** ✅ COMPLETE

- ✅ OpenAPI spec generated from Swagger decorators
- ✅ Contract tests ensure API matches spec
- ✅ Documentation available at /api/docs

---

### ✅ API-3: Error Handling
**Priority:** 🔴 CRITICAL | **Status:** ✅ COMPLETE

- ✅ RFC 7807 compliant error responses
- ✅ Granular Prisma error code handling
- ✅ No stack traces leaked in production
- ✅ Structured error logging

---

### ✅ API-4: Database Operations
**Priority:** 🔴 CRITICAL | **Status:** ✅ COMPLETE

- ✅ All indexes optimized (50+ models audited)
- ✅ Connection pooling configured
- ✅ Slow query logging enabled
- ✅ Backup automation with PITR
- ✅ Data archival strategy implemented

---

## ⚙️ Deployment & Infrastructure

### DEPLOY-1: Frontend Deployment (Vercel)
**Priority:** 🔴 CRITICAL | **Status:** 🟢 90% COMPLETE | **Effort:** 1 day

**Completed:**
- ✅ vercel.json configurations present
- ✅ Apps configured for Vercel deployment

**Remaining Tasks:**
- [ ] Set up Vercel project for apps/app (main app)
- [ ] Set up Vercel project for apps/admin (admin panel)
- [ ] Set up Vercel project for apps/landing (marketing site)
- [ ] Configure environment variables in Vercel:
  - NEXT_PUBLIC_API_URL
  - NEXT_PUBLIC_SENTRY_DSN
  - (No ENCRYPTION_KEY on frontend - verified removed)
- [ ] Enable preview deployments for PRs
- [ ] Configure custom domains (if available)
- [ ] Test production build locally: `pnpm build`
- [ ] Deploy to Vercel production

**Acceptance Criteria:**
- ✅ All 3 apps successfully deployed to Vercel
- ✅ Production URLs accessible and working
- ✅ Environment variables configured correctly
- ✅ Preview deployments work on PRs

---

### DEPLOY-2: Backend Deployment (Railway)
**Priority:** 🔴 CRITICAL | **Status:** 🟡 60% COMPLETE | **Effort:** 1-2 days

**Completed:**
- ✅ railway.json configuration present
- ✅ Dockerfile for apps/api
- ✅ Health check endpoints implemented

**Remaining Tasks:**
- [ ] Create Railway project for apps/api
- [ ] Configure PostgreSQL database on Railway
- [ ] Configure Redis instance on Railway
- [ ] Set all environment variables in Railway:
  - DATABASE_URL
  - REDIS_URL
  - JWT_SECRET
  - ENCRYPTION_KEY (64 hex chars)
  - RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
  - WHATSAPP_API credentials
  - SENTRY_DSN
  - All other required env vars
- [ ] Run Prisma migrations: `pnpm db:migrate:deploy`
- [ ] Test health endpoints: /api/health, /api/health/db, /api/health/redis
- [ ] Configure auto-scaling and resource limits
- [ ] Set up monitoring and alerting
- [ ] Deploy to Railway production

**Acceptance Criteria:**
- ✅ API successfully deployed and accessible
- ✅ Database connected and migrations applied
- ✅ Redis connected and working
- ✅ All health checks passing
- ✅ Monitoring and alerts configured

---

### ✅ DEPLOY-3: CI/CD Pipeline
**Priority:** 🔴 CRITICAL | **Status:** ✅ COMPLETE

- ✅ GitHub Actions CI with build, lint, test jobs
- ✅ E2E tests in CI with Postgres + Redis
- ✅ Coverage reporting and thresholds
- ✅ Security audit (npm audit)
- ✅ Database migration validation

**Remaining Enhancement:**
- [ ] Add automatic deployment to staging on merge to `develop`

---

### DEPLOY-4: Production Monitoring
**Priority:** 🔴 CRITICAL | **Status:** ✅ 95% COMPLETE | **Effort:** 4 hours

**Completed:**
- ✅ Sentry integrated (frontend + backend)
- ✅ Health check endpoints
- ✅ Structured logging with correlation IDs
- ✅ Metrics endpoints (/api/health/metrics)

**Remaining Tasks:**
- [ ] Configure Sentry alerts for production errors
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Configure Railway monitoring dashboards
- [ ] Set up log aggregation (consider Railway's built-in logs)
- [ ] Test alerting: trigger test errors, verify notifications

**Acceptance Criteria:**
- ✅ Sentry capturing production errors
- ✅ Uptime monitoring configured with alerts
- ✅ Team receives alerts for critical errors
- ✅ Logs accessible and searchable
- ✅ Metrics dashboards showing key indicators

---

## ⚡ Performance & Optimization

### ✅ PERF-1: Database Query Optimization
**Status:** ✅ COMPLETE

- ✅ All 50+ models have proper indexes
- ✅ N+1 query detection service implemented
- ✅ Cursor pagination for large datasets

### ✅ PERF-2: Caching Strategy
**Status:** ✅ COMPLETE

- ✅ Redis caching service implemented
- ✅ React Query with optimized staleTime
- ✅ Search results cached
- ✅ Configuration data cached

### ✅ PERF-3: Frontend Optimization
**Status:** ✅ COMPLETE

- ✅ React Query with targeted invalidation
- ✅ No blanket cache invalidation
- ✅ Bundle size optimized (swr, framer-motion removed)

### PERF-4: Load Testing
**Priority:** 🟡 HIGH | **Status:** ⏳ NOT STARTED | **Effort:** 1-2 days

**Tasks:**
- [ ] Create load test scenarios with k6 or Artillery:
  - Login/authentication (100 concurrent users)
  - Patient list retrieval (50 concurrent)
  - Appointment booking (30 concurrent)
  - Consultation workflow (20 concurrent)
- [ ] Run load tests against staging environment
- [ ] Identify performance bottlenecks
- [ ] Optimize slow queries/endpoints
- [ ] Set performance budgets:
  - API response p95 < 500ms
  - API response p99 < 1000ms
  - Page load time < 2s
- [ ] Add performance regression tests to CI

**Acceptance Criteria:**
- ✅ System handles 100 concurrent users smoothly
- ✅ All API endpoints meet p95 < 500ms
- ✅ No database connection pool exhaustion
- ✅ Performance baselines documented

---

## 📋 Pre-Launch Checklist Summary

### Before Production Deployment

**Code Quality:**
- [ ] **CQ-1**: TypeScript strict mode enabled (2-3 days)
- [ ] **CQ-2**: Error swallowing fixed (1-2 days)
- [ ] **CQ-3**: ESLint rule for process.env (4 hours) - 95% done
- [ ] **CQ-4**: Circular dependencies removed (1-2 days)

**Testing:**
- [x] **TEST-1**: API module tests complete ✅
- [ ] **TEST-2**: Frontend component tests (3-4 days)
- [ ] **TEST-3**: E2E user flows complete (1-2 days) - 80% done

**UI/UX:**
- [ ] **UI-1**: Accessibility compliance (3-5 days)
- [ ] **UI-2**: Form validation complete (2-3 days) - 50% done
- [ ] **UI-3**: Loading/empty states (2 days) - 40% done
- [ ] **UI-4**: Mobile responsiveness verified (2-3 days) - 60% done

**API:**
- [ ] **API-1**: All endpoints have DTOs (1-2 days)
- [x] **API-2**: API documentation ✅
- [x] **API-3**: Error handling ✅
- [x] **API-4**: Database operations ✅

**Deployment:**
- [ ] **DEPLOY-1**: Vercel deployment (1 day) - 90% done
- [ ] **DEPLOY-2**: Railway deployment (1-2 days) - 60% done
- [x] **DEPLOY-3**: CI/CD pipeline ✅
- [ ] **DEPLOY-4**: Production monitoring (4 hours) - 95% done

**Performance:**
- [x] **PERF-1**: Database optimization ✅
- [x] **PERF-2**: Caching strategy ✅
- [x] **PERF-3**: Frontend optimization ✅
- [ ] **PERF-4**: Load testing (1-2 days)

**Security:**
- [x] All security items ✅ 100% COMPLETE

---

## 🎯 Estimated Effort to Launch

| Category | Remaining Days | Priority |
|----------|---------------|----------|
| **Code Quality** | 4-7 days | 🔴 CRITICAL |
| **Testing** | 4-6 days | 🔴 CRITICAL |
| **UI/UX** | 9-13 days | 🔴 CRITICAL |
| **API** | 1-2 days | 🟡 HIGH |
| **Deployment** | 2-3 days | 🔴 CRITICAL |
| **Performance** | 1-2 days | 🟡 HIGH |
| **TOTAL** | **21-33 days** | **3-5 weeks** |

---

## 🚦 Go/No-Go Criteria for Launch

### ✅ MUST HAVE (Blocking)
- [ ] Zero TypeScript strict mode errors
- [ ] Zero critical accessibility violations (WCAG 2.1 AA)
- [ ] All critical user flows tested (E2E)
- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway with DB + Redis
- [ ] Production monitoring active with alerts
- [ ] Load testing passed (100 concurrent users)
- [ ] All security items complete (already ✅)
- [ ] No data loss scenarios in error handling

### ✅ SHOULD HAVE (Important but not blocking)
- [ ] Frontend component tests for critical features
- [ ] Mobile responsiveness verified on real devices
- [ ] All API endpoints have DTO validation
- [ ] Performance meets budgets (p95 < 500ms)

### ✅ NICE TO HAVE (Can be done post-launch)
- [ ] Circular dependencies removed
- [ ] All loading states have skeletons
- [ ] All empty states have illustrations

---

## 📞 Launch Day Checklist

**T-7 Days:**
- [ ] Complete all code quality fixes
- [ ] Complete all testing
- [ ] Complete UI/UX essentials

**T-3 Days:**
- [ ] Deploy to staging and test thoroughly
- [ ] Run load tests and fix any issues
- [ ] Verify all monitoring and alerts work

**T-1 Day:**
- [ ] Final staging smoke test
- [ ] Prepare rollback plan
- [ ] Notify team of launch timeline

**Launch Day:**
- [ ] Deploy to production (blue-green if possible)
- [ ] Verify health checks passing
- [ ] Monitor error rates and performance
- [ ] Test critical user flows in production
- [ ] Gradual traffic migration (if applicable)
- [ ] Monitor for 24 hours

**T+1 Day:**
- [ ] Review error rates and performance metrics
- [ ] Address any critical issues immediately
- [ ] Collect user feedback
- [ ] Plan first post-launch improvements

---

**Document Status:** Living document - update as items are completed  
**Next Review:** Weekly during pre-launch sprint  
**Owner:** Engineering Team Lead
