# ABDM / ABHA Onboarding Runbook

> Operator steps to take Docita's ABHA verification (M1) from "built, dormant"
> to "live". The code is already shipped (`feat(abdm): ABHA verification layer
> (M1)`); it returns `503 ABDM_NOT_CONFIGURED` until the steps below are done.
>
> **Cost:** every ABDM portal/registration/API below is **free** (government
> public good). The only cost is the engineering in Phase 4 + your time on the
> portals. See [india-compliance-and-abdm-roadmap.md](../UpcomingPlans/india-compliance-and-abdm-roadmap.md).

## Who does what (read this first — ABDM is multi-tenant)

Docita is a SaaS bridge. There are **three distinct registrations**, with
different owners and frequencies — do not conflate them:

| Layer | Owner | When | Frequency | Lands in |
|---|---|---|---|---|
| **[PLATFORM] Gateway integration credentials** (`client_id`/`client_secret`/base URL) | **Docita (company)** | Once, ever | **One set total** | env vars `ABDM_*` |
| **[PER CLINIC] HFR facility registration** (Facility ID) | The clinic/hospital | At clinic onboarding | Per tenant | `Clinic.hfrFacilityId` (to add) |
| **[PER DOCTOR] HPR registration** (HPR ID) | Each doctor | At doctor onboarding | Per doctor | doctor `hprId` (to add) |

So **Docita registers with the gateway once** (Phase 3); **each clinic registers
its own facility** (Phase 1) and **each doctor their HPR ID** (Phase 2) as part
of *Docita's onboarding flow*. At runtime Docita makes gateway calls with its
single platform credential, **scoped to the calling clinic's HFR Facility ID**.

> **Data-model implication (not yet built):** add additive `Clinic.hfrFacilityId`
> and a doctor `hprId`, collected in onboarding/Settings, and pass the clinic's
> HFR ID into `AbdmHttpGateway.verifyAbha`. The env vars stay platform-level.

Phases below are tagged **[PLATFORM]** (Docita does once) /
**[PER CLINIC]** / **[PER DOCTOR]** (part of tenant onboarding).

> ⚠️ ABDM versions its APIs (v0.5 → v3 / "HIE-CM"). Treat the endpoint paths
> here as canonical-but-confirm: always check the current contract in the
> sandbox docs portal before wiring. The adapter is written to be updated in
> one place (`AbdmHttpGateway.verifyAbha`).

---

## Part A — Register Docita first (one-time, before any clinic)

Do this **once**, as the company. Nothing per-clinic happens until Part A is
done. (Detailed portal steps for each item are in Phases 3–6 below; this is the
ordered checklist.)

- [ ] **A0 — Company prerequisites.** A company domain & email, an authorised
      signatory + a technical contact, and a legal entity / PAN. *Note: a GSTIN
      already embeds a PAN (chars 3–12); the 5th char gives the entity type
      (`C`=company, `P`=proprietor). Sandbox (A1–A5) needs little; entity KYC
      bites at **production (A6)** — if the GSTIN is a proprietorship, consider
      incorporating a Pvt Ltd before production for the ABDM participant
      agreement + DPDP data-fiduciary posture. Confirm ABDM's exact prod
      document list on the live portal.* Decide the integration role: **HIP**
      (we *create* records) now, **HIU** (fetch) later for M3. M1 only needs
      the ABHA/PHR APIs.
- [ ] **A1 — Create the ABDM Sandbox account.** [sandbox.abdm.gov.in](https://sandbox.abdm.gov.in/) →
      sign up with the company email → verify. *(One account for the company.)*
- [ ] **A2 — Register Docita as an application / health-tech integrator** in the
      sandbox console → receive the **sandbox `client_id` + `client_secret` +
      gateway base URL**. These are Docita's platform credentials (→ `ABDM_*`
      env vars). See Phase 3.
- [ ] **A3 — Engineering: wire + build to M1.** Set the three env vars; in
      `AbdmHttpGateway` add the session-token call + confirm the ABHA verify
      endpoint contract. See Phase 4.
- [ ] **A4 — Self-test M1 in the sandbox** with ABDM's test ABHA IDs until
      verify works end-to-end and persists. See Phase 4.
- [ ] **A5 — Apply for M1 milestone certification.** Submit the demo/checklist
      in the sandbox milestone program; ABDM reviews & certifies. See Phase 5.
- [ ] **A6 — Production onboarding.** Apply for production access (this usually
      requires **at least one real go-live facility** registered in HFR and a
      signed ABDM participant/integration agreement). Receive **production**
      `client_id`/`client_secret` + production gateway base URL → set the prod
      env vars (Fly secrets). See Phase 6.
- [ ] **A7 — Operational readiness.** Token caching/refresh, gateway error
      handling + monitoring, PHI-safe logging (scrubbers already in place).

> Note on A6: ABDM typically won't grant production access on sandbox testing
> alone — it wants a real facility live. So your **first pilot clinic** (its HFR
> registration, Part B) overlaps with finishing Part A. Plan one friendly clinic
> as the go-live facility.

Once Part A is certified and in production, onboarding any clinic is just
**Part B** (HFR + HPR), which slots into Docita's existing onboarding flow.

---

## Phase 0 — Prerequisites (before touching any portal)

- [ ] Facility details: clinic name, address, type, ownership proof.
- [ ] An authorised signatory's Aadhaar + mobile (for KYC).
- [ ] At least one doctor with their NMC/State Medical Council registration number.

## Phase 1 — Register the facility (HFR)  ·  [PER CLINIC, at onboarding]

Health Facility Registry — identifies your clinic to ABDM.

1. Go to **https://facility.abdm.gov.in/** → **Register**.
2. Verify via Aadhaar OTP or mobile OTP.
3. Enter facility details (type, address, ownership, region — pick Mumbai/`ap-south-1` to match our hosting).
4. Submit for verification (typically 3–5 working days).
5. **Record the Facility ID (HFR ID).** You'll store this per-clinic in Settings (Phase 6).

## Phase 2 — Register the professionals (HPR)  ·  [PER DOCTOR, at onboarding]

Healthcare Professionals Registry — identifies each prescribing doctor.

1. Each doctor goes to **https://hpr.abdm.gov.in/** → **Register**.
2. Create an HPR ID (e.g. `dr.asha@hpr`), linking their council + registration number.
3. **Record each HPR ID.** These tie a doctor to ABDM-signed records in M2.

## Phase 3 — Get developer/integration credentials (Sandbox)  ·  [PLATFORM, Docita once]

This is where the values for our env vars come from.

1. Go to **https://sandbox.abdm.gov.in/** → sign up as a health-tech / developer.
2. Create an **application** (a.k.a. "facility/HIP-HIU" registration) in the sandbox.
3. Generate credentials — the sandbox issues a **`client_id`** and **`client_secret`**, and gives you the **gateway base URL** (sandbox: typically `https://dev.abdm.gov.in` / `https://sandbox.abdm.gov.in`).
4. Note the **auth flow**: ABDM is session-token based — you `POST {baseUrl}/gateway/v0.5/sessions` (or the current `/api/hiecm/gateway/v3/sessions`) with `{ clientId, clientSecret }`, receive a short-lived **access token**, then send it as `Authorization: Bearer <token>` on subsequent calls. (Our adapter currently sends the secret directly — Phase 4 wires the session step.)

These three map directly to the env vars our code reads
([external-integrations-config.service.ts](../../apps/api/src/shared/modules/config/external-integrations-config.service.ts) `getAbdmConfig()`):

| ABDM sandbox value | Docita env var |
|---|---|
| gateway base URL | `ABDM_BASE_URL` |
| client_id | `ABDM_CLIENT_ID` |
| client_secret | `ABDM_CLIENT_SECRET` |

## Phase 4 — Wire + test against the sandbox (engineering, M1)  ·  [PLATFORM]

1. Set the three env vars on the API + worker (Fly secrets): `fly secrets set ABDM_BASE_URL=... ABDM_CLIENT_ID=... ABDM_CLIENT_SECRET=...`. Once set, `getAbdmConfig().enabled` flips true and the endpoint stops returning 503.
2. In [abdm-http.gateway.ts](../../apps/api/src/domains/patients/infrastructure/external/abdm-http.gateway.ts) `verifyAbha`, confirm against the sandbox docs and adjust:
   - add the **session-token** call (cache the token until expiry),
   - set the **real verify endpoint path** + request/response field names (current placeholder: `POST /v1/abha/verify` with `healthIdNumber`/`healthId`),
   - the response parser is already defensive (`toResult`), so only the request shape + auth header need confirming.
3. Test with sandbox **test ABHA addresses**: `POST /patients/:id/abha/verify` with `{ "abhaAddress": "<sandbox-abha>@sbx" }` → expect `verified: true`, and `Patient.abhaNumber` / `abhaKycName` / `abhaVerifiedAt` persisted.
4. Verify the audit row (`ABHA_VERIFIED`) is written and no PHI leaks to logs.

## Phase 5 — Milestone certification (M1)

1. Complete the M1 checklist in the sandbox portal (ABHA creation/verification at registration).
2. Submit the demo/recording per the sandbox's milestone submission flow.
3. ABDM reviews and certifies M1. (M2 = link care-contexts + FHIR; M3 = fetch external records — future phases.)

## Phase 6 — Go to production  ·  [PLATFORM + per-clinic HFR/HPR storage]

1. After M1 approval, request **production credentials** (prod `client_id`/`client_secret` + prod gateway base URL) via the sandbox/production onboarding.
2. Set the production env vars (Phase 4 step 1) in the prod environment.
3. Store each clinic's **HFR Facility ID** + doctors' **HPR IDs** in Settings (UI is a follow-up — see roadmap "Phase M1 (remaining)").
4. Enable the ABHA **Verify** action in the patient screen (frontend follow-up).

## Phase 7 — Enrol for incentives (DHIS)  ·  [PER CLINIC, optional revenue]

1. Enrol the facility in the **Digital Health Incentive Scheme** at **https://abdm.gov.in/DHIS**.
2. Earn **₹20 per ABHA-linked record above 100/month** (up to ₹4 Cr/facility). This is income, not cost — a sales lever for clinics on Docita.

---

## Quick reference

| Portal | URL | Output |
|---|---|---|
| HFR (facility) | https://facility.abdm.gov.in/ | Facility ID |
| HPR (doctors) | https://hpr.abdm.gov.in/ | HPR IDs |
| Sandbox (dev) | https://sandbox.abdm.gov.in/ | `client_id`, `client_secret`, base URL |
| DHIS (incentives) | https://abdm.gov.in/DHIS | Incentive enrolment |

**Definition of done for go-live:** three env vars set + session-token/endpoint
confirmed in `AbdmHttpGateway` + M1 certified + clinic HFR/HPR IDs stored.
