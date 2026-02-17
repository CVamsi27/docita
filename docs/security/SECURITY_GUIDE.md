# Security Guide

Security controls for Docita (healthcare SaaS) and required engineering practices.

- Owner: Security Engineering
- Review Cadence: Monthly (first Monday)
- Last Reviewed: February 15, 2026

## 1) Security Objectives

- Protect patient data confidentiality and integrity.
- Enforce strict tenant isolation.
- Prevent unauthorized access and privilege escalation.
- Maintain auditable access to sensitive operations.

## 2) Existing Core Controls

- JWT-based auth with cookie support.
- Role-based authorization with deny-by-default posture.
- Multi-layer rate limiting.
- CSRF mitigation (double-submit pattern).
- Tenant context enforcement.
- Field-level encryption for sensitive patient fields.
- Structured logging and monitoring.

## 3) Required Development Rules

- No plaintext PHI in logs.
- No hardcoded secrets in code.
- Every endpoint declares auth posture explicitly.
- Inputs validated at boundary.
- Sensitive operations audited.

## 4) Secure Coding Checklist

Before merge:
- [ ] New endpoint has explicit auth annotations.
- [ ] Validation added/updated.
- [ ] Tenant boundaries preserved and tested.
- [ ] Error responses do not expose internals.
- [ ] No debug artifacts or secret leakage.

## 5) Priority Hardening Backlog

- Tighten CSP (`unsafe-inline` removal with nonce/hash strategy).
- Add/verify `frame-ancestors` policy.
- Enforce request timeout globally.
- Validate health check paths across all Docker variants.
- Add payload size limits for websocket channels.

## 6) Incident Readiness

- Keep on-call contacts and escalation paths current.
- Ensure status page and incident comms template are active.
- Run periodic incident drills and postmortem reviews.

## 7) Verification Cadence

- Pre-release security checklist.
- Dependency vulnerability checks.
- Quarterly authz and tenant-isolation review.
- Annual external security assessment (recommended).
