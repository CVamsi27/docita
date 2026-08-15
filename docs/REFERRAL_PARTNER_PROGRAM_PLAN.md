# Docita Referral Partner Program — Product and Implementation Plan

Point-in-time: **2026-08-03**. This is the authoritative plan for partner
recruitment, facility referrals, clinic-to-clinic discounts, commission
ledgering, internal operations, and outreach handoff. The existing
[`CONNECTOR_PARTNER_ROADMAP.md`](CONNECTOR_PARTNER_ROADMAP.md) remains useful
for recruiting and qualification, but its older commission examples are
historical and are superseded by this document.

## Executive answer

The referral program is **not properly implemented end-to-end yet**.

The repository currently has a useful foundation:

| Area | Current implementation | Verdict |
| --- | --- | --- |
| Partner authentication | OTP login for an already-created active `Referrer`; WhatsApp OTP path exists. | Partial — no public partner signup/profile completion. |
| Partner portal | Dashboard, share link/message, showcase PDF, referral list, payout list, and encrypted bank-detail submission. | Partial — no facility lead submission or partner-invite flow. |
| Internal partner creation | API `POST /internal/referrers` generates a code and emits a welcome event; create is idempotent on normalized phone (409 conflict surfaces the existing partner). The internal Vite page (2026-08-15) has a create-partner dialog, per-row resend-welcome, message-log drawer, and an edit dialog; `PATCH /internal/referrers/:id` (phone reassignment re-runs the normalized dedupe excluding self) and `PATCH /internal/referrers/:id/deactivate` (blocks sign-in, code resolution, welcome resends, and accrual; ledger rows preserved) shipped 2026-08-15. | Done for internal ops — create, edit, and deactivate are covered by unit tests. |
| Referral capture | Referral codes can link a clinic during onboarding/settings; clinic referrals can earn free-month credits. | Partial — no facility lead record, contact workflow, or configurable clinic discount policy. |
| Partner commission | Idempotent first-year payout ledger and scheduler exist. Defaults are now a flat 10% first-year policy (2026-08-15); payout rows snapshot `ratePercent` per period, so historical obligations are never rewritten by a future default change. | Partial — refunds/chargebacks exclusion and payout holds still need finance sign-off. |
| Welcome message | Internal creation triggers a WhatsApp template with app link, share copy, and signed showcase PDF. | Partial — no SMS fallback/campaign orchestration or delivery/readiness evidence. |
| Docita follow-up | No partner-lead notification workflow, assignment, SLA, calendar booking, or onboarding invite orchestration found. | Missing. |
| Anti-abuse | Some one-referral and idempotency guards exist. | Insufficient for duplicate facilities, self-referrals, collusion, partner trees, consent, refunds, and payout holds. |

The current feature must therefore be tracked as **PARTIAL / release-blocked**
for the partner program. Its existing payout and authentication code should be
reused, but the missing workflows below must be implemented before describing
the program as live.

## Commercial contract

The following is the proposed default contract for implementation. Finance and
legal must approve the customer-facing terms before production activation.

### Commercial and lab/medical-shop partners

- A verified partner earns **10% of net collected subscription revenue** from
  each qualifying facility they refer, for the facility's first **12 billed
  months**.
- “Net collected” means successfully settled subscription revenue after
  refunds, chargebacks, reversals, credits, taxes, and payment-provider fees
  are excluded according to the approved finance policy. Do not accrue on an
  invoice merely because it was created.
- The partner reward is attached to one immutable referral attribution. A
  facility cannot be reassigned after its first qualifying conversion except
  through an audited internal correction with a reason and approver.
- Payouts remain `PENDING` until the payment/refund window clears, bank details
  are verified, KYC/TDS requirements are satisfied, and the payout is approved
  by an internal operator. A paid ledger row is immutable; corrections are
  reversal/adjustment rows, never edits.
- The 10% rate is stored in a versioned reward policy snapshot on the referral
  and payout rows. Changing the future default must not rewrite historical
  obligations.

### Hospital and clinic referrers

- A clinic or hospital may refer another facility and receive a discount on
  its own current plan. The discount percentage, eligibility, duration, and
  maximum value are **not yet specified by the request** and must be a
  configurable product decision before implementation.
- This discount is separate from the partner's 10% cash commission. The
  referred facility's discount, if any, must be visible at checkout and
  ledgered separately from partner payout expense.
- Clinic referrals are tracked in the same attribution system but use the
  `CLINIC_CREDIT`/`PLAN_DISCOUNT` reward policy rather than the cash partner
  policy. A clinic must never receive both a cash partner payout and a plan
  discount for the same referral unless an explicit policy allows it.

### Partner-to-partner referral bonus

This is a proposed, gated extension and should not be activated silently:

- A verified partner may invite another partner.
- The sponsor earns an additional **5% of qualifying revenue generated by the
  child partner's converted facility referrals**, paid in addition to the
  child's 10%; the child's 10% must not be reduced.
- The relationship is one level only. No recursive or unlimited commission
  tree is allowed; a child cannot earn on its sponsor and a sponsor cannot
  earn on a grandchild.
- No bonus is created merely for submitting a phone number or creating a
  partner account. The child must complete verification and produce a
  legitimate converted facility before any sponsor bonus accrues.
- Finance must confirm whether “additional 5%” means five percentage points
  of the same net revenue or another base. The implementation must store the
  approved interpretation as a policy version before enabling it.

## Partner experience

### Signup and profile completion

Partners such as medical-shop workers, diagnostic/lab workers, medical
representatives, and marketing partners need:

1. Public signup with name, phone, partner type, operating area, optional
   email, consent to receive operational messages, and sponsor code if they
   were invited by another partner.
2. OTP verification using the normalized phone number, with rate limits,
   attempt limits, expiry, replay prevention, and account enumeration safety.
3. Profile completion and terms acceptance before the partner can submit a
   facility lead or invite another partner.
4. Referral dashboard showing submitted facilities, lifecycle status,
   conversion date, eligible revenue, pending/approved/paid rewards, and
   rejected/duplicate reasons without exposing other partners' data.
5. Secure banking/KYC submission with masked read-back and an operator
   verification state. Bank edits invalidate previous verification.
6. Share kit containing the partner app link, approved pitch copy, referral
   link, and a short-lived signed Docita PDF.

### Facility lead submission

The partner submits a potential customer with:

- facility name and type (clinic, hospital, diagnostic centre, pharmacy,
  nursing home, or other);
- complete address, city, state, postal code, and optional maps URL/latitude/
  longitude;
- contact person's name, role, and phone number; optional email;
- source/relationship note, preferred contact channel, and whether the
  facility consented to a Docita follow-up;
- optional notes and next-best time to contact;
- idempotency key supplied by the client and a normalized phone/address
  duplicate check on the server.

The partner must see only their own submissions. A partner cannot mark a lead
as converted or change its attribution, commission, discount, payout state, or
internal notes.

## Internal portal experience

Internal users need a real referral operations workspace, not only a table:

1. Create a partner with name and phone, select type, optional email/area, and
   optional sponsor partner. Creation must be idempotent on normalized phone
   and show an existing-partner conflict instead of creating a duplicate.
2. Resend or retry the welcome message with a message audit trail and a
   channel result. The operator must be able to see whether the message was
   queued, accepted, failed, or blocked by consent/suppression rules.
3. View and edit partner profile details with audit history; deactivate rather
   than delete a partner with financial history.
4. Review facility leads in a queue with filters for partner, status, age,
   location, owner, duplicate confidence, and consent state.
5. Assign an owner, add internal notes, mark contact attempts, record demo and
   onboarding dates, attach Google Calendar event metadata, and send a
   WhatsApp/mobile invite after the appointment is confirmed.
6. Resolve duplicates and attribution disputes through an audited workflow.
7. Review/verify bank details, approve/void payouts, create reversal rows, and
   export a finance-safe payout report.
8. See sponsor/child relationships, bonus eligibility, caps, and fraud holds
   without exposing bank secrets or unnecessary PHI.

## Lifecycle and notifications

### Facility lead states

Use a constrained state machine rather than free-form status text:

`SUBMITTED → TRIAGED → CONTACT_ATTEMPTED → CONTACTED → DEMO_SCHEDULED →
ONBOARDING → TRIAL → CONVERTED`

Terminal or exception states are `DUPLICATE`, `NOT_INTERESTED`, `INVALID`,
`UNREACHABLE`, `REJECTED`, and `LOST`. Every transition records actor, time,
reason, and an idempotency key. Only internal users may transition a lead past
submission.

### Partner-created lead notification

When a valid lead is submitted:

- persist the lead and an outbox event in one transaction;
- notify Docita via the internal notification/inbox path with facility name,
  contact, location, partner, consent state, duplicate score, and a deep link;
- notify the assigned owner, not every operator, unless escalation rules say
  otherwise;
- retry delivery with bounded exponential backoff and a dead-letter state;
- never put bank details, OTPs, or unnecessary sensitive data in SMS/WhatsApp;
- expose delivery and acknowledgement status in the internal portal.

### Calendar and mobile handoff

After an internal user schedules a demo/onboarding appointment:

- create a Google Calendar event through an explicit, tenant-safe integration;
- invite the facility contact only when contact consent and a valid email are
  present;
- send a mobile WhatsApp confirmation using an approved template, with SMS as
  a fallback only where consent and provider policy permit it;
- store provider event/message IDs, timezone, status, cancellation, and
  reschedule history;
- retries must be idempotent and must not create duplicate calendar events or
  duplicate messages.

## Anti-abuse and safety controls

- Normalize phones, emails, URLs, and addresses before deduplication; maintain
  a deterministic facility fingerprint from normalized name + address + phone.
- Hold a referral in `DUPLICATE_REVIEW` when it matches an existing facility,
  existing clinic, or another partner's recent lead. Operators resolve the
  winner with an audit record.
- Reject self-referrals, same-phone partner/facility loops, disposable/test
  accounts, repeated submissions, and referrals whose contact has opted out.
- Do not allow a partner to refer their own clinic, create a fake facility,
  edit a converted lead, or change sponsor attribution after conversion.
- Limit submissions, OTP requests, partner invites, message retries, and
  payout changes per partner/IP/device. Add cooldowns and anomaly flags for
  bursts, repeated phones, shared bank accounts, and circular sponsor graphs.
- Require facility contact consent or a documented legitimate outreach basis;
  suppress STOP/opt-out recipients across SMS, WhatsApp, and email campaigns.
- Cap the partner-to-partner graph at one level, cap bonus exposure per child
  and per sponsor period, and place suspicious accounts on payout hold.
- Accrue only on settled, non-refunded, non-chargeback revenue inside the
  first 12 billed months. Reconcile payout ledgers against payment records.
- Keep financial and contact changes auditable. Never log OTPs, full bank
  accounts, PAN, or raw sensitive lead notes in application logs.

## Implementation backlog

| Priority | Work | Current gap / acceptance evidence |
| --- | --- | --- |
| P0 | Replace the 5%/15%-5% default reward bands with versioned 10% first-year net-revenue policy | **DONE (2026-08-15)** — new revenue-share partners default to a flat 10% band for months 1–12; `ratePercent` is snapshotted per payout row; unit tests cover months 1–12, month-13 no-accrual, non-positive revenue, and rounding. |
| P0 | Add facility lead schema, API, partner UI, internal queue, lifecycle/audit history | **PARTIAL (2026-08-15)** — slice 1 shipped: `FacilityLead` model + lifecycle state machine, `POST /partner/me/leads` (idempotent on per-partner key, normalized contact-phone `DUPLICATE_ENTRY`), `GET /internal/leads` queue, `PATCH /internal/leads/:id/status` (allowed-edge rules shared with the UI, append-only history with actor/reason), and a minimal internal leads page. Remaining: partner portal UI, cross-partner duplicate fingerprint/review, queue filters/pagination, operator assignment + outbox notification (own P0), calendar/mobile handoff. |
| P0 | Add internal create/edit/deactivate partner workflow | **DONE (2026-08-15)** — create dialog (type/name/phone/email) with normalized-phone duplicate conflict, per-row resend-welcome, message-audit drawer, edit dialog, and deactivate confirmation shipped; `PATCH` update (dedupe excludes self) and `PATCH` deactivate (idempotent, ledger-preserving) are unit-tested. |
| P0 | Add public partner signup/profile/terms and sponsor code capture | New partner can sign up, verify OTP, complete profile, and cannot submit leads before verification/terms. |
| P0 | Add lead-created outbox notification and operator assignment | **PARTIAL (2026-08-15)** — notification half shipped: `submitLead` persists the lead and a `facility-lead.created` outbox event atomically (ADR-0010; deterministic per-lead idempotency key ⇒ exactly one event even across relay retries/replays), and the CONVERTED transition appends `facility-lead.converted` atomically with the conditional status write (a losing concurrent operator appends nothing). `FacilityLeadNotificationService` listens to both events and materializes an internal notification row (channel `internal`, DELIVERED/FAILED + PII-redacted payload: facility name/location, partner, consent, deep link to `/leads`; never contact phone/email) keyed by `(leadId, kind)` so redelivery can't duplicate. `GET /internal/leads` now returns the latest notification delivery status per lead and the internal leads page renders a Notified/Notify-failed badge. Retry/DLQ is the outbox relay's existing bounded backoff + `lastError`/`attempts` (observable on the `OutboxEvent` row); the listener is best-effort (like referrer-welcome) — the relay does not await async listeners, so a failure surfaces as a FAILED notification row with the error rather than a rethrow. **Assignment half shipped (2026-08-15):** `FacilityLead.ownerUserId` + append-only `assignmentHistory` (audit records `{ fromUserId, toUserId, actorId, at }`, same never-edited-in-place contract as statusHistory); `PATCH /internal/leads/:id/assign` (INTERNAL-gated, target must be a Role.INTERNAL user, write is conditional on the owner read so a concurrent assign loses with a conflict instead of an overwrite, and existing notification rows are re-targeted to the new owner in the same transaction); `GET /internal/operators` lists assignable INTERNAL users for the picker; the internal leads page has an Owner column + assign dialog. The notification row carries `recipientUserId` — set from the lead's owner at materialize (null while the lead sits in the shared triage queue) and re-targeted on assignment, so the delivery record names the assigned operator rather than fanning out to every operator. Unit (26 facility-lead), internal page (6), and e2e (18) tests cover assignment, the audit trail, the operator-only target check, and the operators endpoint. **Remaining:** duplicate-score population in the payload, per-lead deep link / acknowledgement (read) state, calendar/mobile handoff. |
| P1 | Add configurable clinic plan discount policy and clinic dashboard tracking | Discount amount and duration are approved; checkout and clinic history show the same policy snapshot. |
| P1 | Add bank/KYC verification and payout approval/reversal controls | No unverified or held payout can be marked paid; all state changes are audited. |
| P1 | Add one-level partner sponsor bonus | Policy interpretation approved; graph, caps, duplicate-account, and no-self-reward tests pass. |
| P1 | Add Google Calendar + WhatsApp/SMS onboarding handoff | Idempotent event/message IDs, consent checks, retry states, timezone correctness, and cancellation/reschedule tests. |
| P2 | Add finance/recruitment reporting and campaign attribution | Export reconciles facilities, net collections, policy rates, payout rows, holds, and channel attribution. |

## Release gates

The program is not “implemented” until all P0 items are complete and the
following evidence exists:

- real partner signup, OTP, profile, lead submission, and internal progression
  E2E with duplicate/opt-out/unauthorized cases;
- 10% first-year payout ledger reconciled against seeded payments, including
  refund, chargeback, cancellation, retry, and scheduler replay cases;
- clinic discount path tested separately from cash commission;
- message delivery/outbox, notification, calendar, and WhatsApp/SMS provider
  smokes with failure and retry evidence;
- audit, tenant/RBAC, secret/PII redaction, rate-limit, and payout-hold checks;
- finance-approved terms and an operator runbook for disputes, reversals, and
  partner deactivation.

Until then, the feature parity plan must label referral partner as
`PARTIAL / BLOCKED`, not `COMPLETE`.

