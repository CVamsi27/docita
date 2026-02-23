# API Reference (Operational)

This document complements Swagger/OpenAPI and captures implementation conventions.

## 1) Base API Conventions

- Global prefix: `/api`
- Versioning: `/api/v1/...`
- JSON responses and standardized error format
- Auth via cookie/bearer strategy as configured

## 2) Endpoint Standards

All endpoints should include:

- Validation at request boundary.
- Auth posture (`@Public` or `@Roles(...)`).
- Explicit response DTO/shape.
- Safe error semantics.

## 3) Pagination

- Prefer cursor-based pagination for high-volume lists.
- Return stable pagination metadata with items.
- Avoid unbounded list responses.

## 4) Security Headers & CSRF

- CSRF token flow must be documented for mutating operations.
- Frontend clients should use credentials where required.

## 5) Module Taxonomy (High Level)

Primary domains include:

- Auth
- Patients
- Appointments
- Consultations/Prescriptions
- Invoices/Billing/Payments
- Inventory/Lab Tests/Documents
- Analytics/Monitoring/Admin

## 6) Operational Notes

- Use health endpoints for readiness checks.
- Monitor error rates, latency, and auth failures.
- Keep backward compatibility for existing clients on versioned routes.

## 7) Documentation Sources

- Primary: Swagger endpoint in running API (`/api/docs` where enabled).
- Secondary: this operational guide and module-level docs.
