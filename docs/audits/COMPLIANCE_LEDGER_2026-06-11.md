# Compliance Ledger - SOLID, Design Patterns, SSOT, Safety

Updated: 2026-06-11

Definition of done for this ledger: no known standards violation remains without one of these outcomes: fixed in code, enforced by an automated check, or accepted as a time-boxed exception with owner, reason, and review date.

## Status Summary

| Area                                    | Status                             | Owner                 | Evidence                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SOLID / backend dependency inversion    | Fixed + automated                  | API platform          | `check:repository-di-tokens`, `check:controller-cqs --enforce`, `check:use-case-loc`                                                                                                   |
| Design-pattern boundaries               | Fixed + automated                  | Platform architecture | `check:feature-boundaries`, `check:frontend-fetch`, `check:cross-domain-application-imports`, `check:cross-domain-infrastructure-imports`, `check:facade-delegation --enforce`         |
| SSOT constants and shared data points   | Fixed + automated                  | Types/platform        | `check:facility-type-ssot`, `check:support-contact-ssot`, `check:patient-name-ssot`, `check:type-duplicates`                                                                           |
| Form schema derivation                  | Automated with reviewed exceptions | App platform          | `check:form-schema-extends`, inline `allow-no-base-schema` metadata                                                                                                                    |
| Security, PHI, audit, tenancy           | Automated                          | Security/platform     | `check:phi-read-audit --enforce`, `check:sensitive-logging`, `check:auth-tenant-safety`, `check:audit-logging --enforce`, `check:phi-encryption-coverage`, `check:phi-boundary-parity` |
| UI standards and accessibility          | Automated                          | UI platform           | `check:native-ui-affordances`, `check:native-button-types`, `check:responsive-data-tables`, `check:a11y-budget:enforce`                                                                |
| DB safety and migrations                | Automated                          | Data platform         | `check:prisma-boundary`, `check:migration-prefix-collision`, `check:migration-reversibility`, `check:multi-write-transaction`, `check:json-column-zod`                                 |
| Performance and production deploy scope | Automated                          | Platform/DevOps       | `check:env-vs-globalenv`, `check:deployment-contracts`, `verify:app-security-headers`, `check:external-http-timeouts`, `check:cache-redis-required`                                    |
| Check reliability                       | Automated                          | Platform architecture | `test:standards-checks`, `check:standard-gate-wiring`                                                                                                                                  |
| Duplication and dead code               | Automated                          | Platform architecture | `check:duplication`, `check:fallow`, `pnpm knip` for broad changes                                                                                                                     |

## Closed Findings

| Finding class                                     | Outcome                                                                       | Automation                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Feature-to-feature internal imports               | Fixed through public feature exports                                          | `check:feature-boundaries`                            |
| Direct frontend fetch/API calls outside adapters  | Fixed through feature/shared API adapters and data-access hooks               | `check:frontend-fetch`                                |
| Facility type literal drift                       | Fixed through `facilityTypeSchema` / `FacilityTypeType`                       | `check:facility-type-ssot`                            |
| Support email hardcodes                           | Fixed through `SUPPORT_EMAIL` in `@workspace/types`                           | `check:support-contact-ssot`                          |
| Repository concrete DI                            | Fixed through token provider recognition and missing token aliases            | `check:repository-di-tokens`                          |
| Oversized use cases                               | Fixed by extracting checkout, usage-threshold, and WhatsApp delivery services | `check:use-case-loc`                                  |
| Controller CQS violation                          | Fixed with `AbhaVerificationCommandService`                                   | `check:controller-cqs --enforce`                      |
| Form schemas without base derivation              | Automated and time-boxed where UI-only                                        | `check:form-schema-extends`                           |
| Env example keys missing Turbo cache env          | Fixed in `turbo.json`                                                         | `check:env-vs-globalenv`                              |
| Standards checks not wired into the standard gate | Fixed with meta-check and standards fixture tests                             | `check:standard-gate-wiring`, `test:standards-checks` |

## Accepted Exceptions

| Exception                                          | Owner            | Reason                                                                                                                                                                                            | Review date | Guardrail                                                         |
| -------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------- |
| UI-only form schemas marked `allow-no-base-schema` | App platform     | Forms include confirm fields, UI string-number coercion, local settings projections, or dialog-only state that has no direct API schema analogue                                                  | 2026-09-30  | `check:form-schema-extends` requires owner/reason/review metadata |
| Client-storage allowlist entries                   | Privacy/platform | Storage is limited to test bootstrap, route/preferences, lockout timers, subscription notice dismissal, transient upload session ids, or post-auth clinic identifiers; no PHI payload is approved | 2026-09-30  | `check:client-storage-usage` blocks new unreviewed storage use    |

## Continuous Gate

The standard compliance gate is:

```bash
pnpm verify:standard
```

The full release-quality proof layer remains:

```bash
pnpm lint
pnpm verify:standard
pnpm turbo check-types --continue
pnpm test
pnpm build
pnpm knip
pnpm audit --audit-level=high
git diff --check
```

This ledger does not claim mathematical perfection. It records that every currently known or detectable standards issue is fixed, automated, or time-boxed for review.
