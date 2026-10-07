# ADR 0017 — Billing and usage period boundaries use the clinic's local timezone

- **Status:** Accepted
- **Date:** 2026-10-03
- **Deciders:** Product owner
- **Relates to:** backlog items O01 (usage reporting), U01 (usage accounting), Q02 (catalog/reporting periods), `Clinic.timezone`

## Context

Three backlog items needed a period boundary to slice usage and billing data, and each one found the same unresolved question: is a "week" the clinic's week or a UTC week?

`Clinic.timezone` already exists and is used for appointment scheduling (§3.3.1 of `AGENTS.md`: recurring hours are `String` HH:mm interpreted at runtime against `Clinic.timezone`), but usage and billing aggregation was being written against UTC instants.

This matters because a UTC day boundary falls at **05:30 IST**. An IST clinic asking for "this week's usage" would see roughly a fifth of Monday's activity attributed to the previous week, and a month-end invoice would split a single night's activity across two periods. The clinician-facing number and the billed number would not agree with the calendar in front of them.

The ambiguity was carried through O01 and U01 as an open question rather than being resolved, which is why this decision record exists now rather than before those items landed.

## Decision

**Billing and usage period boundaries follow the clinic's local timezone** (`Clinic.timezone`), not UTC.

- A period edge is computed in the clinic's wall-clock time and converted to a UTC instant for the query.
- Period identity (the `weekKey`/`monthKey` an aggregate is filed under) is derived from clinic-local calendar units — ISO week numbers and `YYYY-MM`.
- A clinic whose `Clinic.timezone` changes has its period identity computed against the timezone in effect for that period. Boundaries are not silently re-cut for historical aggregates.

### Scope

This applies to **billing and usage reporting**: usage metering, plan quota windows, invoice periods, and analytics week/month buckets.

It does **not** change:

- Instant storage. Every `DateTime` column remains `timestamptz(3)` holding a UTC instant (§3.3.1). This decision changes *which instant a period starts at*, never *how instants are stored*.
- Appointment and scheduling time. Those already resolve against `Clinic.timezone` and are unaffected.
- Any absolute-time audit record (telemetry, queue runs, sync runs), which stays in UTC by design.

### Non-goals

Not in scope: per-clinic timezone inheritance from a parent organisation, historical re-cutting when a clinic changes timezone, or currency of record. Those need their own decisions if they become real requirements.

## Consequences

### Good

- The number a clinician sees on their dashboard is the number they are billed for.
- Weekly and monthly reports align with the calendar in front of the user, which is the only frame they can reason about.
- `Clinic.timezone` becomes a single, consistently honoured field rather than one used only by scheduling.

### Costs and risks

- **Period edges are no longer round UTC instants.** Any integration that reconciles a period boundary against an external system expecting `00:00:00Z` must convert. This is the main integration hazard and needs an explicit note wherever a period range crosses an external boundary.
- **A clinic that changes `Clinic.timezone` creates a discontinuity.** Period identity before and after the change is computed against different offsets. Historical aggregates are not re-cut; the discontinuity is recorded rather than smoothed over.
- **DST is handled by the timezone library, not by hand.** A clinic in a DST-observing zone has 23-hour and 25-hour weeks. Period arithmetic must go through the shared timezone helpers rather than fixed offsets.

## Implementation notes

- Period computation must reuse the existing timezone helpers in `@workspace/utils` rather than introducing a second conversion path. §3.1 (single source of truth) applies: if a period boundary is computed in two places, one of them is wrong.
- Any new period field is a period *identity* (the `weekKey`/`monthKey`) alongside the period *instant range*. Both are needed: the range to query, the key to aggregate and deduplicate.
- Reporting queries that slice by period must be indexed on the clinic-local identity column, not by re-deriving the key in application code per row.

## Verification

Evidence required before this decision is considered implemented across the codebase:

- A regression test at a DST-observing zone boundary and at a half-hour offset zone (IST is +05:30), asserting the period instant range matches the clinic-local calendar unit.
- A regression test that two clinics in different timezones produce different period instant ranges for the same calendar week.
- A test that a timezone change does not re-cut a historical period identity.

## Rejected alternatives

**UTC everywhere.** Rejected: it makes a billed week disagree with the clinic's calendar, and produces month-end splits at 05:30 IST. The simplicity gain does not outweigh a number the user cannot reconcile with their own diary.

**Clinic-local for display, UTC for billing.** Rejected: this is the current worst case. It produces two different answers to "how much did I use this week", which is exactly the defect O01 was opened for.