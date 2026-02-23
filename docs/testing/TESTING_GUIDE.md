# Testing Guide

This guide defines testing strategy, ownership, and execution standards across Docita.

- Owner: QA + Frontend Platform
- Review Cadence: Monthly (first Monday)
- Last Reviewed: February 15, 2026

## 1) Testing Pyramid

- Unit tests: highest volume, fastest feedback.
- Integration tests: service/module behavior with dependencies.
- E2E tests: critical user journeys and regression safety.
- Accessibility checks: mandatory for patient/staff facing flows.

## 2) Tooling by Layer

- Frontend unit/component: Vitest + Testing Library.
- Backend unit/integration: Jest.
- E2E: Playwright (frontend), Supertest/Jest (API e2e).
- A11y: axe-core/axe-playwright.

## 3) Coverage Expectations

- Backend global minimum: 80% (existing baseline).
- Business-rule units: target 90%+ for pure logic modules.
- New features: include happy path + one failure path minimum.

## 4) What To Test

## 4.1 Frontend

- Render states: loading, empty, error, success.
- Form validation and submit paths.
- Permissions/feature gating UI.
- Routing interactions (without full page reload).
- Keyboard and focus behavior for critical flows.

## 4.2 Backend

- Controller validation and status codes.
- Service domain rules.
- Auth and RBAC guards.
- Tenant isolation behavior.
- Error handling contracts.

## 4.3 E2E Critical Flows

Minimum protected set:

- Login/session lifecycle.
- Create/search/update patient.
- Appointment create/reschedule/cancel.
- Consultation + prescription.
- Invoice creation/payment state.

## 5) Test Data Practices

- Use factories/fixtures; avoid brittle hand-crafted data.
- Keep tests isolated; no shared mutable state.
- Clean up side effects after each test where needed.

## 6) CI Recommendations

- Run lint/typecheck before heavy suites for fast fail.
- Parallelize E2E where stable.
- Mark flaky tests and fix promptly; do not normalize flakiness.

## 7) Commands

```bash
pnpm test
pnpm test:api
pnpm test:e2e
pnpm audit:accessibility
```

## 8) Definition of Done (Testing)

A feature is test-complete when:

- relevant unit/integration tests are added,
- critical flow E2E impact is covered,
- accessibility checks pass for changed UI,
- no flaky/failing tests remain in CI.
