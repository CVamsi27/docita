# Sub-processor Register, Data-Flow Map & DPA Guide (DPDP)

> Under the DPDP Act, Docita (Data Fiduciary) is responsible for every third
> party (Data Processor / sub-processor) that touches personal or health data.
> This is the register + how to get a DPA with each. Keep it current — update it
> whenever a new external service is added.
>
> ⚠️ Not legal advice. Confirm each vendor's current DPA terms; sign as the
> incorporated company once the Pvt Ltd exists (see entity note in
> [DPDP_READINESS.md](./DPDP_READINESS.md)).

## 1. Sub-processor register + data-flow map

| Sub-processor | Purpose | Data it receives | Location | Cross-border? | DPA |
|---|---|---|---|---|---|
| **Fly.io** | API/worker compute | Everything (in transit/memory) | Singapore (`sin`) since 2026-07-29 (was `bom` Mumbai) | Compute no longer in India; US vendor; **DB/PHI stays in AWS RDS `ap-south-1`** | Fly DPA |
| **AWS RDS** | Primary database | All PHI (encrypted at rest) | `ap-south-1` (Mumbai) | No (India region) | AWS DPA (auto via Service Terms) |
| **Cloudflare R2** | Object storage | Patient **documents/PDFs** (PHI) | Bucket-region dependent | Set bucket to India/EU | Cloudflare DPA (self-serve) |
| **Razorpay** | Payments | Patient name, contact, amount | India | No | Razorpay DPA / merchant terms |
| **Meta — WhatsApp Cloud API** | Messaging | Patient **phone + message content** (clinic/appointment context) | US / global | **Yes** | Meta/WhatsApp data terms |
| **Zoho — ZeptoMail** | Transactional email | Patient email + message content | India (`api.zeptomail.in`) | No | Zoho DPA |
| **Sentry** | Error/perf monitoring | Errors/metadata (**PHI scrubbed**, see scrubber checks) | US/EU | **Yes** (non-PHI) | Sentry DPA (self-serve) |
| **OpenAI** | AI features + OCR text parsing | OCR/clinical **text** — now **identifier-redacted**; raw images **off by default** (`AI_CLOUD_OCR_ENABLED=false`) | US | **Yes** (when AI enabled) | OpenAI DPA; API data not used for training |
| **ABDM gateway (NHA)** | ABHA verification | ABHA address/number | India (government) | No | Govt participant agreement |

### Cross-border summary (what leaves India)
- **Meta/WhatsApp** — patient phone + message content. Unavoidable for WhatsApp; **disclose in the consent notice**.
- **OpenAI** — only when AI is enabled; now **redacted text only**, and **raw patient images are not sent** (cloud OCR off by default). Disclose AI processing in the notice.
- **Sentry** — non-PHI error metadata (scrubbers enforced in CI). Low risk.

DPDP currently permits cross-border transfer (no country is blacklisted yet),
**provided it is disclosed** and the processor is contractually bound. The two
to call out in the consent notice are **WhatsApp** and **AI**.

## 2. How to get a DPA with each (step-by-step)

A "DPA" (Data Processing Agreement) is the contract that binds a vendor to
process data only on your instructions, with security, breach-notice, and
deletion duties. Most SaaS vendors have a standard one.

1. **Inventory** — confirm what data each vendor gets (table above).
2. **Find their DPA** — usually under *Legal / Trust / Privacy* on the vendor
   site, often titled "Data Processing Addendum/Agreement". Many are:
   - **click-accept** (Cloudflare, Sentry, Zoho, OpenAI — accept in account/legal settings), or
   - **auto-incorporated** into the terms you already accepted (AWS Service Terms, Fly), or
   - **request-based** (Razorpay — ask support/your account manager).
3. **Accept/sign** as the business entity. (As a proprietorship now → under your
   GST legal name; re-sign under the **Pvt Ltd** after incorporation.)
4. **Store** every signed/accepted DPA in one place (e.g. a `compliance/dpa/`
   drive folder) with the date + version.
5. **Check each DPA covers:** purpose limitation, security safeguards,
   sub-processor controls, **breach notification to you**, data **deletion on
   termination**, and cross-border safeguards for non-India vendors.
6. **Re-paper on incorporation** — when the Pvt Ltd is formed, re-accept/sign
   every DPA under the company (part of the entity-transfer checklist).

### Quick links (confirm current URLs)
- AWS DPA — part of [AWS Service Terms](https://aws.amazon.com/service-terms/) (auto-applies).
- Cloudflare DPA — Dashboard → Legal, self-serve.
- Sentry DPA — Settings → Legal & Compliance, self-serve.
- OpenAI DPA — [OpenAI privacy/trust portal](https://openai.com/policies); API data is not used to train by default.
- Zoho DPA — Zoho privacy/trust pages.
- Razorpay — request via dashboard/support.
- Meta/WhatsApp — Meta Business data processing terms apply to Cloud API usage.

## 3. DPO / Grievance Officer (required)

DPDP requires a contactable grievance/DPO function published to users.
- Designate one (can be the founder initially).
- Publish **name + email** in-app (privacy/trust page + consent notice) and
  honour the **90-day grievance SLA** (the DSR queue tracks this).
- After incorporation, the **company** becomes the Data Fiduciary — update the
  notice + this register accordingly.

## 4. What the code already enforces (so DPAs are the gap, not the tech)
- PHI encrypted at rest (AES-256-GCM, 13 fields, CI-checked) + RLS tenant isolation.
- PHI scrubbed from logs + Sentry (CI-checked).
- **AI/OCR minimised**: cloud Vision OCR **off by default** (no raw patient
  images to OpenAI); text to AI is **identifier-redacted**
  (`redactPatientIdentifiers`).
- Consent capture + versioning; DSR export/erasure; 72h breach runbook.

→ The remaining work is **paperwork** (sign the DPAs above + publish the DPO
contact), not engineering.
