# ABDM Milestone Plan — Sandbox Declaration

> **Last updated:** 2026-06-16
> **Status:** Active execution plan

---

## 1. Sandbox Declaration Form Values

| Milestone | Completed? | Start Date | End Date | Notes |
|-----------|------------|------------|----------|-------|
| **M1** | Yes | 15/06/2026 | 15/06/2026 | ABHA verification via mobile OTP. Code complete, V3 endpoints live-verified. |
| **M2** | In progress | 16/06/2026 | 16/06/2026 | HIP care contexts, FHIR, data flow. Code complete, needs NRCeS validation + sandbox certification. |
| **M3** | Not started | — | — | HIU consent + data fetch. Substrate built, needs timeline UI + certification. |
| **M4** | Not applicable | — | — | ABHA *creation* not needed for clinic SaaS. |
| **PHR App** | Not applicable | — | — | Not relevant — Docita is clinic-facing, not patient-facing. |
| **Health Locker** | Not applicable | — | — | Not relevant — clinics don't store records in ABDM cloud locker. |

> **Note:** The form does not allow future date selection. Enter today's date for in-progress milestones and update the end date as work completes.

---

## 2. Milestone Details

### M1 — ABHA Verification (DONE)

**What it covers:** Verify patient ABHA numbers via mobile OTP against the ABDM gateway.

**Implementation status:**
- `AbdmAbhaClient` — V3 API endpoints (`/v3/profile/login/request/otp`, `/v3/profile/login/verify`)
- `AbdmGatewayClient` — session token management with `REQUEST-ID` + `TIMESTAMP` headers
- `AbhaMobileVerificationService` — OTP flow with persistence + audit logging
- `PatientAbdmController` — 3 endpoints (request-otp, verify-otp, verify)
- Frontend: `AbhaOtpVerificationDialog` (mobile → OTP → verified)
- Data-access hooks: `useRequestAbhaOtp`, `useVerifyAbhaOtp`
- Database: `Patient.abhaNumber`, `abhaKycName`, `abhaVerifiedAt` columns
- Settings: `Clinic.abdmEnabled` toggle

**Verified:**
- Gateway session token obtained successfully from `dev.abdm.gov.in`
- V3 ABHA endpoint reachable on `abhasbx.abdm.gov.in` (returns proper validation responses)

**Remaining for certification:**
- Live OTP round-trip with a registered sandbox mobile number
- Submit certification evidence to ABDM

---

### M2 — HIP Services (IN PROGRESS)

**What it enables:** Share patient health records with other providers via ABDM. Clinics create care contexts (prescriptions, lab reports, consultations) and push them to the patient's ABHA profile.

**Implementation status:**
- Database: `AbdmCareContext`, `AbdmTransaction` tables with enums (6 source types, 6 statuses)
- Repository: `PrismaAbdmRepository` (670 lines, full CRUD + transaction lifecycle)
- Exchange service: `AbdmExchangeService` — create care context, request link/share, record callbacks
- Callback state service: `AbdmCallbackStateService` — handle consent/link/data callbacks
- Gateway client: `pushHealthInformation`, `notifyHealthInformation` methods
- FHIR service: `FhirService.getPatientBundle` — FHIR R4 bundles (Patient, Observation, MedicationRequest, Condition, AllergyIntolerance, Immunization, Appointment)
- Callback endpoint: `POST /abdm/callbacks/:clinicId/:type` with shared-secret verification
- Dashboard: `GET /clinic/abdm/dashboard` with readiness items + DHIS estimate

**What needs to be done (by 07/07/2026):**

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | NRCeS FHIR profile validation on generated bundles | Backend | Not started |
| 2 | Live sandbox test: create care context → discovery → linking → consent → data push | Backend | Not started |
| 3 | Encryption material handling for FHIR bundles before push | Backend | Not started |
| 4 | HFR facility ID collection UI in Settings | Frontend | Not started |
| 5 | HPR doctor ID collection UI in Settings | Frontend | Not started |
| 6 | Submit M2 certification evidence to ABDM | Ops | Not started |

---

### M3 — HIU Services (NOT STARTED)

**What it enables:** Request and receive patient health records from other providers (hospitals, labs) via ABDM consent flow.

**Implementation status:**
- Database: `AbdmConsentRequest`, `AbdmExternalRecord` tables
- Gateway client: `requestConsent` method
- Controller: `POST /abdm/consent-requests`, `GET /abdm/ops-inbox`, `GET /abdm/external-records`
- Data-access hooks: `useCreateAbdmConsentRequest`, `useAbdmOpsInbox`, `useAbdmExternalRecords`

**What needs to be done (by 21/07/2026):**

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Patient timeline UI for viewing external records from other HIPs | Frontend | Not started |
| 2 | Live sandbox test: consent request → grant → data fetch callback | Backend | Not started |
| 3 | Ops inbox UI for managing consent requests + retries | Frontend | Not started |
| 4 | Submit M3 certification evidence to ABDM | Ops | Not started |

---

## 3. Key Files Reference

| Layer | Path |
|-------|------|
| Zod schemas | `packages/types/src/clinical/abdm.ts` |
| Prisma schema | `packages/db/prisma/schema.prisma` (lines 1294–1460) |
| ABDM module | `apps/api/src/domains/abdm/abdm.module.ts` |
| Gateway client | `apps/api/src/domains/abdm/infrastructure/abdm-gateway.client.ts` |
| ABHA client | `apps/api/src/domains/abdm/infrastructure/abdm-abha.client.ts` |
| Exchange service | `apps/api/src/domains/abdm/application/services/abdm-exchange.service.ts` |
| Callback state | `apps/api/src/domains/abdm/application/services/abdm-callback-state.service.ts` |
| Repository | `apps/api/src/domains/abdm/infrastructure/repositories/prisma-abdm.repository.ts` |
| FHIR service | `apps/api/src/shared/modules/fhir/fhir.service.ts` |
| Dashboard | `apps/api/src/domains/clinics/presentation/controllers/clinic-abdm.controller.ts` |
| Frontend dialog | `apps/app-vite/src/features/patients/components/forms/dialogs/abha-otp-verification-dialog.tsx` |
| Data-access hooks | `packages/data-access/src/hooks/use-patients.ts`, `packages/data-access/src/hooks/use-abdm.ts` |

---

## 4. Environment Variables

```bash
# ABDM Gateway (required for all milestones)
ABDM_BASE_URL=https://dev.abdm.gov.in
ABDM_CLIENT_ID=SBXID_044062
ABDM_CLIENT_SECRET=<secret>

# ABHA Profile (required for M1)
ABDM_ABHA_BASE_URL=https://abhasbx.abdm.gov.in
ABDM_ABHA_PUBLIC_KEY=<sandbox-public-key>

# Callback security (required for M2/M3)
ABDM_CALLBACK_SECRET=<shared-secret-for-callbacks>
```

---

## 5. Certification Checklist

### M1 Certification
- [ ] Live OTP round-trip with registered sandbox mobile
- [ ] Capture evidence: request OTP response + verify OTP response
- [ ] Submit to ABDM portal

### M2 Certification
- [ ] NRCeS FHIR profile validation passes
- [ ] Live care context creation → discovery → linking flow
- [ ] Live consent grant → data push flow
- [ ] Capture evidence: API calls + ABDM portal confirmation
- [ ] Submit to ABDM portal

### M3 Certification
- [ ] Live consent request → grant → data fetch flow
- [ ] External records rendered in patient timeline
- [ ] Capture evidence: API calls + ABDM portal confirmation
- [ ] Submit to ABDM portal

---

## 6. Blockers & Gaps (as of 2026-06-16)

### Critical Blockers (must fix before sandbox exit)

| # | Blocker | Milestone | Impact | Effort |
|---|---------|-----------|--------|--------|
| B1 | **No live OTP round-trip** — M1 code is done but we've never completed a full OTP flow with a real registered sandbox mobile. All V3 endpoints return "Invalid Mobile Number" for test numbers. | M1 | Cannot claim M1 complete without this | Need a registered sandbox mobile number |
| B2 | **WASA security audit not booked** — CERT-IN empanelled agency required. Takes 1–2 weeks. Must be done before sandbox exit. | All | Blocks production credentials | Find agency, schedule audit |
| B3 | **NRCeS FHIR validation missing** — FHIR R4 bundles are generated but not validated against India-specific NRCeS profiles. ABDM requires this for M2. | M2 | M2 certification will fail | Implement validation library |
| B4 | **No encryption for FHIR push** — `pushHealthInformation` expects pre-encrypted content from callback payload. Actual RSA encryption of FHIR bundles before push is not implemented. | M2 | Data push will fail in production | Implement RSA-OAEP encryption |
| B5 | **Demo to ABDM panel not scheduled** — After sandbox exit, a live demo to an ABDM panel is required. | All | Blocks production credentials | Schedule after WASA |

### Minor Gaps (should fix, won't block sandbox exit)

| # | Gap | Milestone | Impact | Effort |
|---|-----|-----------|--------|--------|
| G1 | **No HFR facility ID UI** — `Clinic.hfrFacilityId` column exists but no Settings UI to collect it. | M2 | Clinics can't register in HFR | Small frontend task |
| G2 | **No HPR doctor ID UI** — `User.hprId` column exists but no UI to collect doctor HPR IDs. | M2 | Doctors can't register in HPR | Small frontend task |
| G3 | **No patient timeline for external records** — M3 code stores received records but no UI to view them in patient timeline. | M3 | HIU feature incomplete | Frontend task |
| G4 | **No ops inbox UI** — M3 code has API for consent requests but no UI to manage retries/pending consents. | M3 | Staff can't manage consent flow | Frontend task |
| G5 | **Legacy verifyAbha path still in code** — Old `POST /patients/:id/abha/verify` calls a 404 endpoint. Marked deprecated but not removed. | M1 | Dead code, confusing | Cleanup task |

### Strategic Decisions (product, not technical)

| # | Decision | Context |
|---|----------|---------|
| D1 | **Ship without ABDM** — ABDM is optional for clinics. Feature-gated via `Feature.ABDM_INTEGRATION` (off by default). Core product works without it. | Ship now, iterate on ABDM later |
| D2 | **M4 / PHR / Health Locker not needed** — ABHA *creation*, PHR app, and Health Locker are not relevant for a clinic management SaaS. | Skip these milestones |
| D3 | **PM-JAY hospitals will need ABDM** — If targeting PM-JAY empanelled hospitals, ABDM becomes mandatory. Prioritize for that segment. | Revenue-driven prioritization |

---

## 7. Certification Process Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ABDM CERTIFICATION FLOW                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Register on sandbox                                     │
│     └── Fill declaration form (you are here)                │
│                                                             │
│  2. Get sandbox credentials                                 │
│     └── ABDM team reviews, gives Client ID + Secret         │
│     └── Timeline: ~3-4 days                                 │
│                                                             │
│  3. Implement M1/M2/M3 in sandbox                           │
│     └── Build flows, test against sandbox APIs              │
│     └── Timeline: weeks to months                           │
│                                                             │
│  4. Functional testing                                      │
│     └── Run mandatory test cases for each milestone         │
│     └── Capture evidence (API calls, screenshots)           │
│                                                             │
│  5. WASA security audit  ◄── BLOCKER                        │
│     └── CERT-IN empanelled agency                           │
│     └── Timeline: 1-2 weeks                                │
│                                                             │
│  6. Sandbox exit application                                │
│     └── Submit test report + WASA report                    │
│                                                             │
│  7. Demo to ABDM panel  ◄── BLOCKER                         │
│     └── Live demonstration of workflows                     │
│     └── Scheduled by ABDM team                              │
│                                                             │
│  8. Production credentials                                  │
│     └── If approved, get production API keys                │
│     └── Go live!                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Timeline Summary

```
June 2026
├── Week 3 (now): Fill declaration form, start live OTP testing
├── Week 4: Complete M1 live round-trip, book WASA agency

July 2026
├── Week 1-2: M2 live sandbox testing, NRCeS validation
├── Week 3: WASA audit
├── Week 4: Sandbox exit application

August 2026
├── Week 1-2: Demo to ABDM panel
├── Week 3: Production credentials (if approved)
└── Week 4: Go live with ABDM in production
```
