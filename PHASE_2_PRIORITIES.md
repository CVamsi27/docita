# 🎯 Top 10 Priority Tasks for Phase 2

Based on security impact, business value, and implementation complexity, here are the 10 highest-priority items to tackle next.

## Phase 2 Immediate Priorities (Next Sprint)

### 🔴 CRITICAL - Execute Immediately

#### 1. Input Validation & Sanitization Hardening (§1.6)
**Impact:** Prevents injection attacks, DoS via large payloads  
**Time:** 4 hours  
**Files:** All DTOs, service files  
**Tasks:**
- [ ] Add Zod schemas to validate all Json type Prisma fields (customData, items, settings)
- [ ] Sanitize HTML/script in free-text fields (notes, instructions, chiefComplaint)
- [ ] Add input length limits on all string fields
- [ ] Extend Helmet CSP headers (Content-Security-Policy)
- [ ] Validate file uploads (MIME type, magic bytes, path traversal protection)

**Acceptance Criteria:**
- No unvalidated inputs accepted by API
- Email templates HTML-escaped
- File uploads reject suspicious files
- CSP headers present in all responses

---

#### 2. Business Rule Validation at Service Layer (§2.3)
**Impact:** Prevents data corruption, invalid appointments, prescription errors  
**Time:** 6 hours  
**Files:** Appointment, Prescription, Invoice services  
**Tasks:**
- [ ] Add appointment overlap detection (conflict resolution rules)
- [ ] Validate date/time consistency (endTime > startTime, expiryDate > issueDate)
- [ ] Add medication dosage bounds checking
- [ ] Cross-field validation (if isPRN=true, then prnInstructions required)
- [ ] Implement invoice tax/discount calculation validation

**Acceptance Criteria:**
- Overlapping appointments rejected
- Invalid date ranges caught before DB write
- Prescription dosages within safe bounds
- All numeric fields have min/max validation

---

#### 3. Repository Pattern Adoption (§3.1)
**Impact:** Improves testability, decouples from Prisma, enables ORM migration  
**Time:** 8 hours  
**Files:** Appointment, Invoice, Prescription services  
**Tasks:**
- [ ] Create AppointmentsRepository interface & implementation
- [ ] Create InvoicesRepository (audit existing mixed pattern)
- [ ] Create PrescriptionsRepository interface
- [ ] Inject repositories into services (remove direct PrismaService)
- [ ] Add repository unit tests with mock implementations

**Acceptance Criteria:**
- 0 direct `this.prisma.*` calls in services (verified via grep)
- All repositories implement consistent interface
- Services accept repositories via DI
- Mock repositories work in tests

---

#### 4. API Controller Tests for Critical Endpoints (§5.1, §9.26)
**Impact:** Ensures authorization, validation, error handling work correctly  
**Time:** 6 hours  
**Files:** Multiple controller.spec.ts  
**Tasks:**
- [ ] Add tests for appointments.controller (RBAC, date validation)
- [ ] Add tests for invoices.controller (authorization, calculation)
- [ ] Add tests for users.controller (role segregation)
- [ ] Add tests for auth.controller (refresh token flow, lockout)
- [ ] Target 80%+ route coverage

**Acceptance Criteria:**
- 40+ new test cases added
- All critical endpoints tested
- RBAC verified per role
- Input validation tested

---

#### 5. Service Decomposition - WhatsApp (§9.6)
**Impact:** Reduces complexity from 953 lines to <300 per service, improves maintainability  
**Time:** 8 hours  
**Files:** Whatsapp service  
**Tasks:**
- [ ] Extract WhatsappClientService (Meta API calls only)
- [ ] Extract WhatsappWebhookService (signature validation, event processing)
- [ ] Refactor WhatsappService as orchestrator (business logic)
- [ ] Add unit tests for each service
- [ ] Ensure each service < 300 lines

**Acceptance Criteria:**
- No service exceeds 300 lines
- Meta API calls isolated in client service
- Webhook logic isolated with validation tests
- Orchestration layer handles dependencies

---

### 🟡 HIGH PRIORITY - Complete This Week

#### 6. WebSocket Rate Limiting (§9.4)
**Impact:** Prevents WebSocket message flood attacks  
**Time:** 3 hours  
**Files:** payment-websocket.gateway.ts  
**Tasks:**
- [ ] Implement message rate limiting (e.g., 10 messages per 60s per connection)
- [ ] Add client ID tracking for rate limit identification
- [ ] Return rate limit exceeded errors to clients
- [ ] Add metrics collection for rate limit hits

**Acceptance Criteria:**
- Excessive WebSocket messages rejected
- Rate limits configurable per room
- Metrics track limit violations

---

#### 7. More Controller Tests - Invoices & Appointments (§9.26)
**Impact:** Comprehensive RBAC and DTO validation coverage  
**Time:** 4 hours  
**Files:** invoices.controller.spec.ts, appointments.controller.spec.ts  
**Tasks:**
- [ ] Create invoices.controller.spec.ts (10+ test cases)
- [ ] Create appointments.controller.spec.ts (10+ test cases)
- [ ] Test authorization per role (DOCTOR/ADMIN/RECEPTIONIST)
- [ ] Test input validation (date ranges, enum values)
- [ ] Test response shapes match DTOs

**Acceptance Criteria:**
- 20+ new test cases
- All critical routes covered
- RBAC validated per endpoint

---

#### 8. React Query Performance Optimization (§9.2)
**Impact:** Prevents unnecessary refetches, improves app responsiveness  
**Time:** 3 hours  
**Files:** hook-factory.ts, useAPIQuery usage  
**Tasks:**
- [ ] Add staleTime defaults to useAPIQuery (5 min for patient data, 10 min for settings)
- [ ] Enable refetchOnWindowFocus for critical queries (Dashboard, Queue)
- [ ] Add cacheTime configuration (30 min default)
- [ ] Audit existing hooks for custom invalidation patterns

**Acceptance Criteria:**
- Queries not immediately refetched on mutation success
- Dashboard query survives window focus
- Settings cached for 10 minutes

---

#### 9. God-Object Service Decomposition - Monitoring (§9.6)
**Impact:** Reduces from 952 lines to 4 services <300 lines each  
**Time:** 8 hours  
**Files:** monitoring.service.ts → 4 new services  
**Tasks:**
- [ ] Create RequestLogService (request/response logging)
- [ ] Create ErrorTrackingService (error tracking & resolution)
- [ ] Create MetricsService (performance metrics collection)
- [ ] Create HealthCheckService (system health checks)
- [ ] Refactor MonitoringService as facade

**Acceptance Criteria:**
- Each service < 300 lines
- Single responsibility per service
- Facade coordinates between services

---

#### 10. Strict Tenant Isolation E2E Tests (§5.2)
**Impact:** Prevents clinic data leakage, ensures HIPAA/DPDP compliance  
**Time:** 4 hours  
**Files:** e2e test suite  
**Tasks:**
- [ ] Create test for Clinic A patient inaccessible to Clinic B user
- [ ] Create test for Clinic A appointment inaccessible to Clinic B user
- [ ] Create test for user can only see own clinic's invoices
- [ ] Verify clinicId filtering in all queries
- [ ] Implement test data factories for multi-clinic scenarios

**Acceptance Criteria:**
- Clinic A user cannot access Clinic B data
- API returns 403 Forbidden when clinic mismatch
- Queries filtered by clinicId at service layer

---

## 📊 Impact Analysis

| Task | Security | Performance | Testing | Architecture | Time |
|------|----------|-------------|---------|--------------|------|
| Input Validation | 🔴 | 🟢 | 🟡 | 🟡 | 4h |
| Business Rules | 🔴 | 🟡 | 🟡 | 🟡 | 6h |
| Repository Pattern | 🟢 | 🟢 | 🔴 | 🔴 | 8h |
| Controller Tests | 🔴 | 🟢 | 🔴 | 🟢 | 6h |
| WhatsApp Service | 🟡 | 🟢 | 🟡 | 🔴 | 8h |
| WebSocket Rate Limit | 🔴 | 🔴 | 🟡 | 🟢 | 3h |
| More Tests | 🔴 | 🟢 | 🔴 | 🟢 | 4h |
| React Query Opt | 🟢 | 🔴 | 🟡 | 🟢 | 3h |
| Monitoring Service | 🟢 | 🟢 | 🟡 | 🔴 | 8h |
| Tenant Isolation | 🔴 | 🟢 | 🔴 | 🟢 | 4h |

**Total Time Estimate:** 54 hours (1.3 weeks for dedicated team)

---

## 🚦 Sequencing Recommendation

**Week 1:**
- Tasks 1, 2, 3 (Input validation, business rules, repository pattern)
- Enables other architectural improvements

**Week 2:**
- Tasks 4, 7, 10 (Controller tests, E2E tests)
- Increases confidence in architecture changes

**Week 3:**
- Tasks 5, 9 (Service decomposition)
- Reduces code complexity

**Week 4:**
- Tasks 6, 8 (WebSocket limits, React Query optimization)
- Performance & UX improvements

---

## ✅ Success Metrics

By end of Phase 2, target:
- ✅ **Security:** 80%+ of critical items completed
- ✅ **Testing:** 50+ new unit tests, 10+ E2E tests added
- ✅ **Architecture:** Repository pattern adopted in 3+ services
- ✅ **Performance:** React Query staleTime reduced unnecessary refetches by 60%+
- ✅ **Code Quality:** 3 god-object services decomposed to 11 focused services

---

**Last Updated:** 2026-02-11  
**Updated By:** Production Improvement Implementation  
**Next Review:** Weekly team sync
