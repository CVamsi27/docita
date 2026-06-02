# Full Application Flow Audit - 2026-06-02

**Scope:** staff application plus public booking, upload, and patient-portal edges that affect the staff journey.  
**Standard:** `docs/ui/UI_UX_STANDARD_2026.md`, Zod-first contracts, tenant-aware repositories, role-aware access, and shared UI primitives.

## Summary

| Area                                     | Status              | Evidence                                                                                                                                                                      |
| ---------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route inventory and breadcrumbs          | Fixed               | All protected pages are represented in `route-meta.ts`; `pnpm check:route-meta-coverage` passes. Breadcrumb root is Today.                                                    |
| Sidebar and command palette destinations | Fixed               | Placeholder Pharmacy is hidden. Nav smoke coverage is derived from the advertised navigation config.                                                                          |
| WhatsApp operational route               | Fixed               | `/whatsapp` is a staff hub with conversations, campaigns, templates, and delivery tabs. Sender settings remain admin-only.                                                    |
| WhatsApp conversation persistence        | Fixed               | Outbound sends create real tenant conversations. Inbound replies append before appointment-response handling and unresolved shared-sender messages stay outside clinic views. |
| WhatsApp clinic campaigns                | Fixed               | Clinic-owned approved-template campaigns enforce patient consent and dispatch from the worker with leases, retries, and per-recipient outcomes.                               |
| Full browser and migration proof         | Pending environment | Run the commands in Final Verification with an API database, app server, and disposable production clone.                                                                     |

## Staff Flow Ledger

| Flow                  | Entry and handoff                                                    | Role and facility notes                                                                              | Verification                                      |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Login and recovery    | `/login` -> verification or safe return path -> workspace            | Clinic-associated users retain completed onboarding.                                                 | Existing auth tests plus final app E2E.           |
| Create or join clinic | `/choose-path` -> onboarding or join request -> workspace            | Admin/Admin Doctor setup; existing users are not reset.                                              | Existing onboarding API and app suites.           |
| Daily work            | `/today` -> patient search, appointments, queue, active consultation | Staff landing surface; palette and sidebar remain aligned.                                           | Nav smoke and route metadata checks.              |
| Appointments          | `/appointments` -> check-in -> `/consultation/[id]`                  | Care-coordination roles, queue feature, clinic timezone normalization.                               | Existing appointment suites plus final app E2E.   |
| Patient record        | `/patients` -> `/patients/[id]` -> records, billing, communication   | Tenant-scoped durable hub.                                                                           | Existing patient suites plus final app E2E.       |
| Consultation          | `/consultation` -> `/consultation/[id]` -> after-visit actions       | Preserves primary Plan & Rx, Collect payment, Schedule follow-up actions and secondary record links. | Existing consultation suite and app typecheck.    |
| Revenue operations    | invoices, payment desk, daybook, claims                              | Role- and feature-gated.                                                                             | Nav smoke, access tests, existing billing suites. |
| WhatsApp operations   | `/whatsapp` -> conversations, campaigns, templates, delivery         | Replies for operational WhatsApp roles; sender configuration and campaign mutation admin-only.       | API typecheck, route policies, final API/app E2E. |
| Patient-facing edges  | `/book/[referralCode]`, upload routes, `/portal/*`                   | Staff actions should remain visible to the patient where applicable.                                 | Existing route matrix plus final mobile/app E2E.  |

## Route Governance

- `apps/app/app/(protected)/route-meta.ts` is blocking inventory for protected pages.
- `scripts/checks/check-e2e-nav-routes.mjs` derives required smoke destinations from `nav-config.ts`.
- `/dashboard` redirects to `/today`; `/upgrade` redirects to Settings subscription.
- `/pharmacy` remains unavailable as a direct implementation placeholder and is not advertised.
- AI and hospital-only surfaces remain gated until their access policies are enabled.

## Final Verification

```bash
pnpm lint
pnpm verify:standard
pnpm check:hygiene
pnpm knip
pnpm turbo check-types --continue
pnpm test
pnpm build
pnpm check:prisma-boundary
pnpm check:colors
pnpm audit:app
pnpm mobile:smoke
pnpm --filter @docita/api run test:e2e
pnpm --filter @docita/app run test:e2e
pnpm --filter @docita/app run build:cloudflare:production
pnpm --filter @workspace/db run db:migrate:dry-run
pnpm --filter @workspace/db run db:migrate:safe
pnpm --filter @workspace/db run db:check-integrity
```
