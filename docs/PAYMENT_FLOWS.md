# Payment flows (do not mix)

Docita supports **two independent payment domains**. They use different money flows, actors, compliance context, and (eventually) different gateways. **Never merge or reuse primitives across them** (no shared webhook handlers for both, no subscription Razorpay order IDs on patient invoices, no desk settlement logic inside subscription checkout).

## Flow A: Clinic or hospital pays Docita (platform SaaS)

**Actor:** The clinic or hospital (the Docita customer).  
**Purpose:** Subscription, plan upgrades, onboarding checkout, usage overage billed by Docita, internal ops tooling.  
**Gateway:** **Razorpay** (and related Docita-held credentials) under the `subscriptions` / `payments` gateway stack — orders, subscriptions, payment links issued **for Docita revenue**, webhooks processed for **platform billing** only.

**Typical surfaces:** Onboarding payment step, settings subscription checkout, subscription webhooks, internal payment-processing tools that record Docita-side gateway IDs.

## Flow B: Patient pays the clinic or hospital (clinic-collected revenue)

**Actor:** The patient (or guarantor) pays **the care provider**, not Docita.  
**Purpose:** Visit invoices, procedures, consumables — money belongs to the clinic.  
**Methods:** At-desk settlement (cash, card terminal, UPI QR, other terminals) recorded in-app; **plug-and-play** online or device integrations **chosen and configured per clinic** (their merchant accounts, their acquirers).

**Typical surfaces:** Front-desk settlement APIs (`/desk/...`), reception workflows, future per-clinic payment connectors. **Do not** implement this path using Docita’s platform Razorpay merchant or subscription webhook pipeline.

## Engineering rules

1. **Flow A code** lives around subscriptions, platform checkout, and Razorpay adapters used for **Docita’s own invoices**.  
2. **Flow B code** lives around clinic invoices, desk settlement, and future **`IPaymentLinkProvider`-style abstractions scoped to the clinic’s configured provider** — not the default platform singleton used for Flow A unless an explicit, temporary, documented bridge exists.  
3. **Webhooks:** Subscription / platform Razorpay webhooks must only drive subscription and platform billing state. Patient invoice state must be confirmed via the clinic’s gateway or in-app settlement, not by reusing Flow A webhook routing.  
4. **Naming and reviews:** PRs that touch both areas should split by flow or justify an adapter boundary; reviewers block accidental coupling.

## Current implementation note

Nest binds **`DOCITA_PLATFORM_PAYMENT_LINK_PROVIDER_TOKEN`** (Flow A: subscriptions, overage) and **`CLINIC_INVOICE_PAYMENT_LINK_PROVIDER_TOKEN`** (Flow B: patient invoice links) to **separate injection sites**; today both may resolve to the same gateway factory instance until per-clinic adapters exist. Desk settlement already follows Flow B only. Replace the clinic token’s implementation with clinic-scoped providers so Flow B never uses Docita’s platform merchant for clinic-collected revenue.
