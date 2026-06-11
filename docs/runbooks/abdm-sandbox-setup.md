# ABDM Sandbox Setup (Developer Quick-Start)

> Get ABHA verification working locally against the ABDM sandbox in ~15 minutes.
> For the full operator runbook (production, HFR/HPR, certification) see
> [abdm-onboarding.md](./abdm-onboarding.md).

## Prerequisites

- A company email address (not personal)
- GST certificate details (entity name, GSTIN, address)
- The Docita API running locally or on a Fly staging machine

## 1. Register on the ABDM Sandbox

1. Go to **https://sandbox.abdm.gov.in/** and sign up with the company email.
2. After email verification, log in to the sandbox console.

## 2. Create an Application

1. In the sandbox console, navigate to **My Apps** or the registration form.
2. Fill the **ABDM Sandbox Request Form** as follows:

   | Field | Value |
   |---|---|
   | Select Integration | **ABDM Integration** |
   | Select Category | **Application on behalf of Organization** |
   | Nature of entity | Match your GST certificate (5th PAN char: `P`=proprietor, `C`=company) |
   | Type of organization | **Health-IT / Software** (not "Hospital") |
   | Category | **HMIS solution provider** |
   | Registered in India | **Yes** |
   | Entity name | Exact legal name on the GST certificate |
   | GSTIN | Your GSTIN |
   | Product name | **Docita** |
   | Website | `https://docita.work` |
   | Solution type | **HMIS** |
   | Intent | "Docita is a multi-tenant clinic/hospital HMIS SaaS; requesting sandbox access to integrate ABHA verify (M1) as HIP on behalf of onboarded facilities." |

   > Entity name + Nature of entity **must** match the GST or the request is
   > rejected. The exact dropdown options vary — pick the closest health-IT/HMIS
   > choice.

3. Submit and wait for approval (usually within a few hours for sandbox).

## 3. Generate Credentials

Once approved, generate application credentials in the sandbox console. You will receive:

| Output | Maps to |
|---|---|
| **Client ID** | `ABDM_CLIENT_ID` |
| **Client Secret** | `ABDM_CLIENT_SECRET` |
| **Gateway Base URL** | `ABDM_BASE_URL` |

Typical sandbox base URL: `https://dev.abdm.gov.in` or `https://sandbox.abdm.gov.in`
(verify against the sandbox console — ABDM versions its endpoints).

## 4. Configure Environment Variables

### Local development

Add to `apps/api/.env`:

```bash
ABDM_BASE_URL="https://dev.abdm.gov.in"
ABDM_CLIENT_ID="<your-sandbox-client-id>"
ABDM_CLIENT_SECRET="<your-sandbox-client-secret>"
```

### Fly staging / production

```bash
fly secrets set \
  ABDM_BASE_URL="https://dev.abdm.gov.in" \
  ABDM_CLIENT_ID="<your-sandbox-client-id>" \
  ABDM_CLIENT_SECRET="<your-sandbox-client-secret>"
```

Once all three are set, `ExternalIntegrationsConfigService.getAbdmConfig().enabled`
flips to `true` and the `/patients/:id/abha/verify` endpoint stops returning
`503 ABDM_NOT_CONFIGURED`.

## 5. Verify It Works

### Smoke test (curl)

```bash
curl -X POST http://localhost:3001/api/v1/patients/<patient-id>/abha/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{"abhaNumber": "12345678901234", "abhaAddress": "testuser@sbx"}'
```

Expected response when configured:
```json
{
  "verified": true,
  "abhaAddress": "testuser@sbx",
  "abhaNumber": "12345678901234",
  "kycName": "Test User",
  "verifiedAt": "2026-06-12T10:30:00.000Z",
  "error": null
}
```

Expected response when **not** configured (env vars empty):
```json
{
  "verified": false,
  "error": "ABDM_NOT_CONFIGURED"
}
```

### What gets persisted

On successful verification the following fields are saved to the Patient record:

| Field | Source |
|---|---|
| `abhaNumber` | `healthIdNumber` from the ABDM response |
| `abhaKycName` | `name` from the ABDM response |
| `abhaVerifiedAt` | Timestamp of verification |
| `abhaAddress` | The ABHA address used for verification |

An `ABHA_VERIFIED` audit row is also written.

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `503 ABDM_NOT_CONFIGURED` | Env vars missing or empty | Set all three `ABDM_*` vars; restart the API |
| `ABDM_VERIFY_FAILED_401` | Invalid client ID or secret | Re-check credentials from the sandbox console |
| `ABDM_VERIFY_FAILED_403` | Application not approved yet | Wait for sandbox approval, or re-submit the request form |
| `ABDM_VERIFY_ERROR` | Network issue or wrong base URL | Check `ABDM_BASE_URL` — must include `https://`; trailing slash is handled automatically |
| Verification returns `verified: true` but no patient data saved | Missing `ABDM_INTEGRATION` feature flag on the clinic tier | Ensure the clinic's plan includes the ABDM feature |

## Architecture Notes

- **Gateway adapter**: [`abdm-http.gateway.ts`](../../apps/api/src/domains/patients/infrastructure/external/abdm-http.gateway.ts) — single place where ABDM endpoint paths and request/response shapes are handled. Update here when ABDM versions its API.
- **Config**: [`external-integrations-config.service.ts`](../../apps/api/src/shared/modules/config/external-integrations-config.service.ts) `getAbdmConfig()` — reads the env vars and exposes `enabled: boolean`.
- **Schema**: [`packages/types/src/clinical/abdm.ts`](../../packages/types/src/clinical/abdm.ts) — Zod schemas for `VerifyAbhaRequest` and `AbhaVerificationResult`.
- **Feature gate**: The ABHA verify endpoint requires `Feature.ABDM_INTEGRATION` on the clinic. If the feature is not in the clinic's tier, the endpoint returns 403.

## ABDM Credential Lifecycle

```
Sandbox credentials  →  Development & testing
                              ↓
M1 certification     →  Sandbox milestone submission
                              ↓
Production credentials →  Real ABHA verification in production
```

Sandbox credentials are **free** and unlimited. Production credentials require
M1 certification and at least one live HFR-registered facility.
