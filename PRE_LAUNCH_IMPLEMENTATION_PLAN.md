# 🚀 Pre-Launch Implementation Plan - Week-by-Week

**Status:** 78% Complete → Target: 100% (21-33 days remaining)  
**Current:** Build ✅ | Lint ✅ | Tests ✅ (896 passing)

---

## 📅 Week 1: Quick Wins & Critical Fixes (Days 1-5)

### Day 1-2: CQ-3 & API-1 (Quick Wins: 2-3 days)

**CQ-3: Complete process.env Elimination (95% → 100%)**
- [ ] Add ESLint rule to ban `process.env` in module source files
- [ ] Verify no new process.env usages in future code
- [ ] Update CONTRIBUTING.md with the rule
- [ ] **Effort:** 4 hours | **Status:** 95% done

**API-1: Complete DTO Validation** 
- [ ] Create Zod DTOs for all unvalidated endpoints:
  - webhooks.controller.ts (Razorpay webhook)
  - auth.controller.ts (refresh token)
  - subscription.controller.ts (create checkout)
  - consent.controller.ts (emergency access)
  - imports.controller.ts (multiple endpoints)
- [ ] Add `@UsePipes(ZodValidationPipe)` to all endpoints
- [ ] Add CI check: no inline `@Body()` without DTO
- [ ] **Effort:** 1-2 days

### Day 3-5: CQ-2 Fix Error Swallowing (1-2 days)

**Error Swallowing Anti-Patterns**
- [ ] Audit 20+ catch blocks in payments/ and imports/ modules
- [ ] Replace silent catches with proper error handling
  - Log with full context
  - Re-throw domain exceptions
- [ ] Replace `console.error()` with `this.logger.error()` (5 occurrences)
- [ ] Add tests verifying errors are properly handled
- [ ] **Effort:** 1-2 days

**Completion Criteria:** Errors logged + re-thrown properly, zero silent failures

---

## 📅 Week 2: Testing & E2E (Days 6-12)

### Day 6-7: TEST-3 Complete E2E Flows (80% → 100%)

**Complete User Journey E2E Test**
- [ ] Add Playwright E2E test for full workflow:
  1. Login → Create Patient → Book Appointment
  2. Start Consultation → Add Vitals → Add Prescription  
  3. Complete Consultation → Generate Invoice → Mark Paid
- [ ] Test across 3 user roles (admin, doctor, receptionist)
- [ ] Add E2E tests to CI with test database
- [ ] Verify path works across CLI: `pnpm --filter @docita/api test:e2e`
- [ ] **Effort:** 1-2 days

### Day 8-12: TEST-2 Frontend Component Tests (0% → 50%+)

**Setup React Testing Library + Vitest**
- [ ] Install RTL, Vitest, and dependencies
- [ ] Create test utilities: providers, mocks, factories
- [ ] Create component tests for 5 priority features:
  - [ ] Patient management (forms, list, profile)
  - [ ] Appointment scheduling (calendar, booking flow)
  - [ ] Consultation view (vitals, notes, prescriptions)
  - [ ] Invoice generation (items, calculation, preview)
  - [ ] Settings forms (clinic info, permissions)
- [ ] Target: 20+ component test files, 50%+ coverage for tested features
- [ ] Add component testing to CI pipeline
- [ ] **Effort:** 3-4 days

**Completion Criteria:** RTL configured, 20+ tests passing, CI integration done

---

## 📅 Week 3: UI/UX Polish & Accessibility (Days 13-19)

### Day 13-17: UI-1 Accessibility Overhaul (0% → 100%)

**WCAG 2.1 AA Compliance**
- [ ] Install and run axe-core audit on all main pages
- [ ] Fix all critical violations found
- [ ] Add aria labels to 50+ icon-only buttons
- [ ] Ensure all forms have proper labels
- [ ] Add keyboard navigation to:
  - [ ] Sidebar (arrow keys, enter)
  - [ ] Modals (ESC to close, focus trap)
  - [ ] Dropdowns (arrow keys, enter)
  - [ ] Color contrast verification (4.5:1 minimum)
- [ ] Add skip-to-content link
- [ ] Add aria-live regions for toasts and alerts
- [ ] Test with screen reader (VoiceOver on macOS)
- [ ] **Effort:** 3-5 days

**Completion Criteria:** Zero critical axe violations, keyboard accessible, screen reader tested

### Day 18-19: UI-2 Form Validation (50% → 100%)

**Complete Form Validation Implementation**
- [ ] Add inline error messages to all forms
- [ ] Implement field-level validation with debounce
- [ ] Add confirmation dialogs for destructive actions
- [ ] Test error states for critical forms:
  - [ ] Patient registration
  - [ ] Appointment booking
  - [ ] Prescription creation
  - [ ] Invoice generation
- [ ] **Effort:** 1 day

---

## 📅 Week 4: Loading States & Mobile (Days 20-26)

### Day 20-21: UI-3 Loading & Empty States (40% → 100%)

**Complete Loading States**
- [ ] Add skeleton loaders to all data-heavy pages
- [ ] Replace all spinner-only states
- [ ] Add empty state illustrations for:
  - [ ] No patients
  - [ ] No appointments
  - [ ] No invoices
  - [ ] Search no results
- [ ] Add helpful empty state actions
- [ ] Test on slow 3G connection
- [ ] **Effort:** 1-2 days

### Day 22-26: UI-4 Mobile Responsiveness (60% → 100%)

**Mobile Testing & Fixes**
- [ ] Test all critical pages on 375px width
- [ ] Fix layout breaks:
  - [ ] Patient list
  - [ ] Appointment calendar  
  - [ ] Consultation view
  - [ ] Invoice generation
  - [ ] Settings pages
- [ ] Verify touch targets 48x48px minimum
- [ ] Test on real Android & iOS devices
- [ ] Fix any horizontal scroll issues
- [ ] **Effort:** 2-3 days

---

## 📅 Week 5: Circular Dependencies & Load Testing (Days 27-33)

### Day 27-28: CQ-4 Fix Circular Dependencies (0% → 100%)

**Remove 12 ForwardRef Usages**
- [ ] Refactor Reminders → WhatsApp to use EventsModule
  - [ ] Emit `ReminderDue` event from reminders
  - [ ] WhatsApp subscribes to events
  - [ ] Remove direct dependency
- [ ] Fix WhatsApp internal service graph
- [ ] Remove all 12 `forwardRef` usages
- [ ] Add `madge` or `dpdm` to CI
- [ ] **Effort:** 1-2 days

**Completion Criteria:** Zero forwardRef, CI prevents new circular deps

### Day 29-30: PERF-4 Load Testing (0% → 100%)

**Load Test Implementation**
- [ ] Create load test scenarios with k6 or Artillery:
  - [ ] Login/auth (100 concurrent users)
  - [ ] Patient list retrieval (50 concurrent)
  - [ ] Appointment booking (30 concurrent)
  - [ ] Consultation workflow (20 concurrent)
- [ ] Run against staging environment
- [ ] Identify and fix bottlenecks
- [ ] Set performance budgets:
  - [ ] API p95 < 500ms, p99 < 1000ms
  - [ ] Page load < 2s
- [ ] Add performance regression tests to CI
- [ ] **Effort:** 1-2 days

### Day 31-33: Deployment & Final Checks

**DEPLOY-1 & DEPLOY-2: Production Deployment**
- [ ] Vercel Frontend (3 apps: app, admin, landing)
  - [ ] Create projects in Vercel
  - [ ] Configure env variables
  - [ ] Enable PR preview deployments
  - [ ] Test production build locally
- [ ] Railway Backend
  - [ ] Create Railway project
  - [ ] Configure PostgreSQL
  - [ ] Configure Redis
  - [ ] Set all env variables
  - [ ] Run Prisma migrations
  - [ ] Test health endpoints
  - [ ] Configure auto-scaling
- [ ] Production Monitoring
  - [ ] Configure Sentry alerts
  - [ ] Set up uptime monitoring
  - [ ] Configure Railway dashboards
  - [ ] Test alert notifications
- [ ] **Effort:** 2-3 days total

**Final Pre-Launch Checks:**
- [ ] All code quality items complete
- [ ] All tests passing (targets met)
- [ ] All UI/UX requirements met
- [ ] Both environments deployed and tested
- [ ] Monitoring and alerts active
- [ ] Performance budgets met
- [ ] Go/No-Go decision point

---

## 🎯 Daily Standup Template

**Status Each Day:**
```
📊 Today's Focus: [CQ-3 / API-1 / etc]
✅ Completed: [List items]
🔄 In Progress: [Current task]
⏭️ Tomorrow: [Next priority]
🚧 Blockers: [If any]
```

---

## 🚦 Go/No-Go Checkpoints

### End of Day 5 (Friday, Week 1)
- **CQ-3:** ESLint rule implemented ✅/❌
- **API-1:** All endpoints have DTO validation ✅/❌
- **CQ-2:** Error handling fixes merged ✅/❌
→ **Decision:** Ready for Week 2?

### End of Week 2 (Friday, Week 2)
- **TEST-3:** E2E complete user flow passing ✅/❌
- **TEST-2:** 20+ component tests passing ✅/❌
→ **Decision:** Ready for UI work?

### End of Week 3 (Friday, Week 3)
- **UI-1:** Zero critical axe violations ✅/❌
- **UI-2:** Form validation complete ✅/❌
→ **Decision:** Ready for final polish?

### End of Week 4 (Friday, Week 4)  
- **UI-3:** All loading states done ✅/❌
- **UI-4:** Mobile responsive verified ✅/❌
→ **Decision:** All UI/UX ready?

### End of Week 5 (Friday, Week 5)
- **CQ-4:** Zero forwardRef usages ✅/❌
- **PERF-4:** Load tests passing ✅/❌
- **DEPLOY:** Both envs deployed ✅/❌
→ **Decision:** ✅ LAUNCH READY or ⏸️ NEEDS MORE TIME?

---

## 📊 Success Metrics

| Item | Current | Target | Week | Status |
|------|---------|--------|------|--------|
| TypeScript Errors | 0 | 0 | 1 | ✅ |
| Error Swallowing Cases | 20+ | 0 | 1 | ⏳ |
| Unit Tests | 896 | 896 | 1 | ✅ |
| Component Tests | 0 | 20+ | 2 | ⏳ |
| E2E Tests | 80% | 100% | 2 | ⏳ |
| Axe Violations | Many | 0 | 3 | ⏳ |
| ARIA Attributes | 14 | 100+ | 3 | ⏳ |
| Mobile 375px Score | ? | 100% | 4 | ⏳ |
| Circular Deps | 12 | 0 | 5 | ⏳ |
| Load Test (100 users) | ? | Pass | 5 | ⏳ |
| Vercel Deployed | No | Yes | 5 | ⏳ |
| Railway Deployed | No | Yes | 5 | ⏳ |

---

## ⚠️ Risk Mitigation

**High-Risk Items:**
1. **Accessibility (UI-1)** - Could reveal issues if axe-core finds 50+ violations
   - *Mitigation:* Start early, prioritize critical issues first
   
2. **Circular Dependencies (CQ-4)** - Refactoring could break reminders/WhatsApp
   - *Mitigation:* Have comprehensive E2E tests before refactoring
   
3. **Load Testing (PERF-4)** - May reveal database bottlenecks
   - *Mitigation:* Run early, optimize detected queries before launch

4. **Mobile Testing (UI-4)** - Real device testing could uncover unexpected issues
   - *Mitigation:* Test on actual iOS/Android devices, not just browser emulation

---

## 📞 Escalation Path

**If blocked on:**
- **API Changes:** Architectural review needed?
- **Test Setup:** Need external library help?
- **Accessibility:** Need accessibility expert consultation?
- **Performance:** Need database optimization specialist?

---

**Document Owner:** Engineering Lead  
**Update Frequency:** Daily  
**Next Review:** Start of each week
