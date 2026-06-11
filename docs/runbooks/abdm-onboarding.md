# ABDM / ABHA Onboarding Runbook

> Operator steps to take Docita's ABHA verification (M1) from "built, dormant"
> to "live". The code is already shipped (`feat(abdm): ABHA verification layer
> (M1)`); it returns `503 ABDM_NOT_CONFIGURED` until the steps below are done.
>
> **Cost:** every ABDM portal/registration/API below is **free** (government
> public good). The only cost is the engineering in Phase 4 + your time on the
> portals. See [india-compliance-and-abdm-roadmap.md](../UpcomingPlans/india-compliance-and-abdm-roadmap.md).
>
> ⚠️ ABDM versions its APIs (v0.5 → v3 / "HIE-CM"). Treat the endpoint paths
> here as canonical-but-confirm: always check the current contract in the
> sandbox docs portal before wiring. The adapter is written to be updated in
> one place (`AbdmHttpGateway.verifyAbha`).

---

## Phase 0 — Prerequisites (before touching any portal)

- [ ] Facility details: clinic name, address, type, ownership proof.
- [ ] An authorised signatory's Aadhaar + mobile (for KYC).
- [ ] At least one doctor with their NMC/State Medical Council registration number.

## Phase 1 — Register the facility (HFR)

Health Facility Registry — identifies your clinic to ABDM.

1. Go to **https://facility.abdm.gov.in/** → **Register**.
2. Verify via Aadhaar OTP or mobile OTP.
3. Enter facility details (type, address, ownership, region — pick Mumbai/`ap-south-1` to match our hosting).
4. Submit for verification (typically 3–5 working days).
5. **Record the Facility ID (HFR ID).** You'll store this per-clinic in Settings (Phase 6).

## Phase 2 — Register the professionals (HPR)

Healthcare Professionals Registry — identifies each prescribing doctor.

1. Each doctor goes to **https://hpr.abdm.gov.in/** → **Register**.
2. Create an HPR ID (e.g. `dr.asha@hpr`), linking their council + registration number.
3. **Record each HPR ID.** These tie a doctor to ABDM-signed records in M2.

## Phase 3 — Get developer/integration credentials (Sandbox)

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

## Phase 4 — Wire + test against the sandbox (engineering, M1)

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

## Phase 6 — Go to production

1. After M1 approval, request **production credentials** (prod `client_id`/`client_secret` + prod gateway base URL) via the sandbox/production onboarding.
2. Set the production env vars (Phase 4 step 1) in the prod environment.
3. Store each clinic's **HFR Facility ID** + doctors' **HPR IDs** in Settings (UI is a follow-up — see roadmap "Phase M1 (remaining)").
4. Enable the ABHA **Verify** action in the patient screen (frontend follow-up).

## Phase 7 — Enrol for incentives (DHIS, optional, revenue)

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
