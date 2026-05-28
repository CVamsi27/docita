# Data Foundations

> **Descriptive.** Captures the canonical data entities and their
> relationships as they exist in `packages/db/prisma/schema/`. Schema
> changes update this doc, not the other way around. For prescriptive
> rules (Zod-first, Prisma boundary), see [`AGENTS.md`](../../AGENTS.md).

## First-Class Operational Entities
- `clinic`
- `facility_branch`
- `provider`
- `patient`
- `encounter`
- `appointment`
- `prescription`
- `prescription_item`
- `diagnosis`
- `procedure`
- `lab_order`
- `lab_result`
- `invoice`
- `payment`
- `consent`
- `communication_event`
- `inventory_item`
- `referral`

## Normalization Priorities
- Map diagnoses to ICD-10 where possible.
- Keep procedure coding consistent for claims and analytics.
- Build a durable `drug_master` with:
  - generic name
  - brand aliases
  - strength
  - formulation
  - therapeutic grouping
- Standardize clinic, provider, and specialty taxonomy.

## Analytics Separation
- Keep operational PHI and business analytics distinct.
- Prefer de-identified facts and aggregated reporting tables for usage and benchmarking.
- Avoid future designs that require row-level PHI resale or uncontrolled sharing.

## Event Model
- `patient_created`
- `import_completed`
- `appointment_booked`
- `queue_started`
- `consultation_completed`
- `prescription_sent`
- `whatsapp_message_sent`
- `reminder_delivered`
- `no_show`
- `invoice_generated`
- `invoice_paid`
- `refill_requested`
- `followup_booked`

## Product Direction
- Use this foundation for:
  - clinic benchmarking
  - recall campaign performance
  - medication and refill adherence insights
  - claims and coding quality reporting
- Keep trust and governance ahead of monetization ideas.
