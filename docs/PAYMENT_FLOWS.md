# Payment flows (do not mix)

Docita distinguishes **clinic-owned payment configuration**, **patient-to-clinic collection**, and **Docita SaaS billing**. They must not share credentials, webhooks, or merchant accounts in ways that move the wrong party’s money.

## Flow A: Clinic or hospital payment settings (optional)

**What it is:** **Optional** configuration in **settings** where the hospital or clinic stores **their own** payment credentials and enabled providers for **their** operational needs (whatever they choose to add).

**Whose money:** Always the **clinic’s or hospital’s** rails — their Razorpay (or other) accounts, **not** Docita’s platform merchant.

**Rules:** Flow A is **not required**. Clinics can add, omit, or swap providers over time. Implementation must read **per-tenant** settings, never reuse Docita corporate keys as a stand-in for “the clinic’s” gateway.

## Flow B: Patient pays the clinic or hospital

**Actor:** The patient (or guarantor) pays **the care provider**, not Docita.

**Purpose:** Visit invoices, procedures, consumables — revenue belongs to the clinic.

**Methods:** At-desk settlement (cash, POS, UPI QR, terminals) and **online** collection when the clinic enables it.

**Razorpay:** **Allowed** for Flow B only when the integration runs on **Flow A (clinic) credentials** from settings. **Never** use **Docita’s** Razorpay merchant or Docita-held keys for patient settlement.

**Typical surfaces:** Front-desk settlement (`/desk/...`), invoice payment links, future plug-in gateways bound to Flow A config.

## Docita platform SaaS billing (separate rail)

**What it is:** When the clinic or hospital **pays Docita** for the product (subscription, onboarding checkout, usage overage to Docita, internal ops). Uses **Docita’s** integrations and merchants.

**Rules:** Subscription and platform payment-link webhooks drive **Docita SaaS** state only. Do not route patient invoice settlement or Flow A clinic-settings webhooks through this pipeline unless the event is explicitly for Docita revenue.

**Code note:** Nest’s `DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN` names this **Docita SaaS** payment-link injection site — it is **not** “Flow A” from the product glossary above (Flow A is clinic settings).

## Engineering rules

1. **Flow A (settings):** Persist and resolve **clinic-scoped** gateway configuration; no patient or subscription logic mixed into credential storage beyond clear UI/API boundaries.
2. **Flow B:** Resolve payment actions using **that clinic’s** configured providers; desk settlement stays provider-agnostic metadata where no hosted gateway runs.
3. **Docita SaaS:** Keep subscription/order/payment-link adapters and webhooks isolated from Flow B and from clinic Flow A secrets except where you intentionally copy **public** identifiers for support.
4. **Reviews:** Block PRs that send patient charges to Docita’s merchant or that handle subscription webhooks inside clinic invoice code paths.

## Current implementation note

`CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN` (Flow B) and `DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN` (**Docita SaaS**) use **separate injection sites**. Until Flow B resolves a **clinic-scoped** `IPaymentLinkProvider` from Flow A settings, the clinic token may still delegate to a shared adapter — that is **technical debt** and must not rely on Docita keys for new patient-online flows.
