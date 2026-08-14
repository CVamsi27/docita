# WhatsApp Templates — Meta Submission Guide

This document covers **every WhatsApp template Docita sends through Meta**, split into two categories:

1. **Marketing templates** (broadcasts §1–§10) — outbound campaigns from the internal broadcast feature.
2. **Utility templates** (transactional, §11–§26) — system messages triggered by user actions in the clinic app: appointment confirmations, reminders, doctor delays, prescriptions, invoices, payments, plus patient-reply acknowledgements (§24–§25).
3. **Authentication template** (§27) — patient portal / public-booking OTP. Meta's **AUTHENTICATION** category; mandatory copy-code button.

> **Internal-app path note (2026-08-02):** the `BROADCAST_PRESETS` map referenced
> below lived in the Next.js app at `apps/internal/features/broadcasts/broadcast-presets.ts`.
> The Vite internal app (`apps/internal`) has a `/broadcasts` shell page but the
> presets map is **not yet ported** — update the `metaTemplateName` references to the
> Vite location when the map lands.

Marketing templates open a 24-hour customer service window. Utility templates can be sent at any time but must match the user-initiated action and contain no promotional content — otherwise Meta will reject or down-categorise them.

The canonical source for **utility template content** is [`packages/types/src/whatsapp/default-templates.data.ts`](../../packages/types/src/whatsapp/default-templates.data.ts). The bodies below are the Meta-submission versions (positional `{{1}}`, `{{2}}` placeholders) of those same definitions — keep the two in sync.

All Marketing templates use English (`en`) with a single body variable for the recipient name.

The strings below are the exact copy to paste into the Meta template editor. The internal `BROADCAST_PRESETS` map points at these template names, so changing a `metaTemplateName` here requires the same change in [apps/internal/src/features/broadcasts/broadcast-presets.ts](../apps/internal/src/features/broadcasts/broadcast-presets.ts).

## How button replies are handled

Quick-reply buttons on appointment templates are fully wired end to end. When the patient taps a button on WhatsApp:

1. Meta delivers the interactive reply to [`whatsapp-webhook-ingress.service.ts`](../../apps/api/src/domains/whatsapp/application/services/whatsapp-webhook-ingress.service.ts), which finds the patient's most recent appointment and calls [`response-handler.service.ts`](../../apps/api/src/domains/whatsapp/application/services/response-handler.service.ts).
2. The button text/id is mapped via [`patient-response.policy.ts`](../../apps/api/src/domains/whatsapp/application/policies/patient-response.policy.ts) to a response type.
3. The appointment status is updated in the DB and a confirmation template is sent back to the patient.
4. An in-app notification is created for the clinic staff (doctor + reception) via [`staff-notification-inbox.service.ts`](../../apps/api/src/domains/whatsapp/application/services/staff-notification-inbox.service.ts), with WebSocket fan-out (`NOTIFICATION_CREATED`) so the badge updates live.

| Button text | Reply type | Appointment status | Patient confirmation | Staff notification |
|---|---|---|---|---|
| `Confirm` | `CONFIRM` | `CONFIRMED` | `patient_response_confirm` template | LOW priority |
| `I am on my way` / `On time` | `ON_THE_WAY` | `CONFIRMED` | `patient_response_confirm` template | LOW priority |
| `Reschedule` | `RESCHEDULE` | `RESCHEDULING` | Plain text — "Our staff will contact you to reschedule." | **HIGH priority** |
| `Cancel` / `Cancelled` | `CANCEL` | `CANCELLED` (soft cancel — row preserved for audit, billing, no-show analytics) | Plain text — "Your appointment on {{date}} at {{time}} has been cancelled." | **HIGH priority** |
| `Delayed` | `DELAY` | (unchanged; delay recorded) | Plain text — asks for expected delay in minutes | NORMAL priority |
| (reply with N minutes) | follow-up to `DELAY` | (unchanged) | `patient_response_delay` template; flags schedule conflict if it overlaps the next appointment | NORMAL priority |

**Cancellation is a soft cancel.** `status: CANCELLED` is set on the row but the row is preserved. The schedule view filters cancelled appointments out by default. This is required for audit trail, no-show / cancellation analytics, and any billing tied to the appointment id. There is intentionally no hard-delete path.

CTA buttons on prescription, invoice and payment templates (`View Prescription`, `View Invoice`, `Pay Now`) open URLs only — Meta does not send a webhook for CTA taps, so there is no reply to handle.

### CTA URL buttons (fixed domain + dynamic path)

Meta rejects templates where the **domain** is dynamic (e.g. `https://{{4}}` or passing a full URL as the button variable). Use a **fixed** approved domain with a **dynamic path suffix** only:

| Template | Button text | Website URL (Dynamic) | API variable for button |
|---|---|---|---|
| `prescription_created` | View Prescription | `https://docita.work/rx/{{1}}` | `rxToken` (e.g. prescription id) |
| `invoice_created` | View Invoice | `https://docita.work/inv/{{1}}` | `invToken` (invoice id) |
| `payment_reminder` | Pay Now | `https://docita.work/pay/{{1}}` | `payToken` (payment session id) |
| `payment_link` | Pay Now | `https://docita.work/pay/{{1}}` | `payToken` (payment session id) |
| `invoice_ready` | Pay Now | `https://docita.work/pay/{{1}}` | `payToken` (payment session id) |

The button’s `{{1}}` is **independent** from body placeholders (body may use `{{1}}`–`{{3}}` for clinic/patient/doctor; the button still uses its own `{{1}}` for the path token). When sending from the API, pass only the token (e.g. `abc123`), not `https://docita.work/rx/abc123`.

### Public patient pages (no login)

CTA links open `docita.work` landing routes. Those pages call unauthenticated API endpoints that stream the PDF or redirect to Razorpay:

| Landing path | API (versioned) | Purpose |
|---|---|---|
| `/rx/{prescriptionId}` | `GET /api/v1/public/patient/rx/{token}/pdf` | Download prescription PDF |
| `/inv/{invoiceId}` | `GET /api/v1/public/patient/inv/{token}/pdf` | Download invoice PDF |
| `/pay/{paymentSessionId}` | `GET /api/v1/public/patient/pay/{token}` | 302 redirect to Razorpay payment link |

**Pay CTAs (`/pay/…`) are Docita-only today.** `payment_reminder`, `payment_link`, and `invoice_ready` send only when the clinic has an active **Docita Razorpay payment session** (`provider: razorpay`). The button always uses `https://docita.work/pay/{payToken}` — never a hospital’s external payment URL or a raw Razorpay link in the template. Cash invoices and third-party hospital billing links are skipped.

Tokens are the same ids passed as `rxToken`, `invToken`, and `payToken` when sending WhatsApp templates. Access is unguessable-id based (no patient login). Deploy **both** the API and the landing site when changing these paths.

**App resend vs automation:** Manual “Send on WhatsApp” from the prescription view and automatic sends on `PRESCRIPTION_CREATED` both use `prescription_created` (link + CTA).

### When each utility template fires (code map)

| Template | Trigger | API entry |
|---|---|---|
| `prescription_created` | Prescription saved (`PRESCRIPTION_CREATED`) or manual resend from prescription UI | [`system-events.service.ts`](../../apps/api/src/domains/whatsapp/application/services/system-events.service.ts), [`resend.service.ts`](../../apps/api/src/domains/whatsapp/application/services/resend.service.ts) |
| `invoice_created` | Invoice generated (`INVOICE_GENERATED`) | [`system-events.service.ts`](../../apps/api/src/domains/whatsapp/application/services/system-events.service.ts) via [`whatsapp-event.listener.ts`](../../apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts) |
| `invoice_ready` | Manual “Send on WhatsApp” from invoice UI (requires active payment session) | [`resend.service.ts`](../../apps/api/src/domains/whatsapp/application/services/resend.service.ts) |
| `payment_link` | Staff creates/sends Razorpay payment link | [`payments-command.service.ts`](../../apps/api/src/domains/billing/application/services/payments-command.service.ts) |
| `payment_reminder` | Scheduler / overdue reminder for payment session | [`payments-command.service.ts`](../../apps/api/src/domains/billing/application/services/payments-command.service.ts) |
| `appointment_delay` | Doctor delay marked (`DOCTOR_DELAY_MARKED`; appointments shifted first) | [`system-events.service.ts`](../../apps/api/src/domains/whatsapp/application/services/system-events.service.ts) via [`whatsapp-event.listener.ts`](../../apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts) |

`INVOICE_GENERATED` also runs [`invoice-events.listener.ts`](../../apps/api/src/domains/billing/infrastructure/listeners/invoice-events.listener.ts), which **only** creates a Razorpay payment session (no WhatsApp). Marking a consultation done does **not** send extra WhatsApp messages; automation handles patient notifications.

Shared variable builders: [`patient-whatsapp-template-variables.ts`](../../apps/api/src/shared/whatsapp/patient-whatsapp-template-variables.ts).

---

# Part A — Marketing templates (broadcasts)

The internal `BROADCAST_PRESETS` map points at these template names, so changing a `metaTemplateName` here requires the same change in [apps/internal/src/features/broadcasts/broadcast-presets.ts](../apps/internal/src/features/broadcasts/broadcast-presets.ts).

---

## 1. `docita_intro_v1`

Generic Docita introduction with contact info. Safe to send to any audience where you just want to introduce Docita and provide ways to reach us.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, this is Docita — hospital & clinic software trusted across India.

We help you run the front desk in one place:
• Appointments + WhatsApp reminders (cut no-shows)
• Billing, invoices & daily reports
• EMR, prescriptions & lab orders on WhatsApp
• Pharmacy + inventory

Want a free 5-min demo? Reply DEMO and we'll call you back today.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Anil Kumar`

---

## 2. `docita_hospital_referral_partner_v1`

Audience: **hospitals already using Docita**. Asks them to refer other hospitals in exchange for a 5% revenue share. No fixed cash referral fee — existing customers earn through the revenue share only.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, thanks for being on Docita.

Refer a hospital, earn a recurring share:
• 5% of their first-year subscription, paid quarterly
• Zero effort — we handle the demo, onboarding & support
• Live tracking — you'll know the moment they sign up

Just share the hospital name, city & contact. That's it.

Reply REFER and we'll take it from there.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None (replies handled in the support inbox).
- **Sample variable:** `Apollo Hospitals Hyderabad`

---

## 3. `docita_pharmacy_referral_partner_v1`

Audience: **pharmacies**. Pitches them as referral partners — refer a hospital that goes live on Docita, earn ₹1,000.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, earn a referral fee for every hospital you refer to Docita.

Docita is hospital management software (appointments, billing, EMR, WhatsApp reminders, pharmacy & inventory). We're onboarding new hospitals across India.

• Flat referral fee per hospital that goes live
• You just share name, city & a contact — we do the demo, sales & setup
• Paid as soon as they activate

Reply REFER to start earning.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `MedPlus Banjara Hills`

---

## 4. `docita_hms_intro_v1`

Audience: **clinics or hospitals we want to onboard**. A direct “are you looking for HMS/clinic software?” opener with a compact value prop and contact details.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, looking for simple hospital/clinic software that actually gets used?

Docita runs your full front desk:
• Appointments + automatic WhatsApp reminders (fewer no-shows)
• Billing, GST invoices & daily collection reports
• EMR — patient history, prescriptions, lab orders
• Send prescriptions & invoices on WhatsApp in 1 tap
• Pharmacy + inventory + staff roles

Setup in a day. Staff trained free.

Reply DEMO for a free 5-min walkthrough today.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Srinivas`

---

## 5. `docita_hms_question_v1`

Audience: **clinics or hospitals we want to onboard**. A shorter “do you currently use software?” question (often higher reply rate) with the same contact details.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, quick one — are you using any software to run your clinic/hospital today?

Docita handles appointments, billing, EMR, pharmacy & WhatsApp reminders — all in one place. Most clinics go live in a day.

Reply YES (already using one) or DEMO (want to see it) — we'll call back today.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Anitha`

---

## 6. `docita_pricing_offer_v1`

Audience: **price-sensitive clinics / leads who asked "how much?"**. Avoids hard-coded amounts so the template stays valid even when prices change — directs them to the website / a callback for the actual numbers. Mirrors the landing page pricing strip.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, here's how Docita pricing works — clear, no hidden costs.

• Low monthly software fee per clinic
• One-time guided setup — includes patient import, prescription templates, letterhead, WhatsApp templates, billing config & staff training
• Annual plan saves ~15% vs monthly
• Higher tiers add multi-doctor, lab tests, inventory & analytics

Most clinics are fully live in 1–2 days.

Reply DEMO for a 5-min walkthrough, or PRICE for a written quote.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Ravi`

---

## 7. `docita_training_setup_v1`

Audience: **clinics worried "my staff can't use software"**. Future-facing template that leans into the guided setup + on-site/online staff training included in the setup fee. Use once the dedicated training package is finalised — update copy & version (e.g. `_v2`) before submitting.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, worried your front desk or staff won't pick up new software? Docita includes full setup + training.

What our setup package covers:
• Patient & history import from your existing records
• Prescription templates, letterhead & signature
• Billing, GST & WhatsApp templates configured for you
• Live staff training (reception, doctor, pharmacy)
• 2 weeks of hand-holding support after go-live

Most staff are independent within ~90% of workflows by week one.

Reply TRAIN for a free training-plan call.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Lakshmi`

---

## 8. `docita_demo_followup_v1`

Audience: **leads who saw a demo but didn't sign up** (re-engagement). Short, low-pressure nudge with one clear CTA.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, following up on your Docita demo.

If something held you back — pricing, data migration, or staff training — we can usually sort it on a 10-min call.

Reply CALL and we'll ring you back at a time that suits you.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Pradeep`

---

## 9. `docita_whatsapp_emr_v1`

Audience: **doctors / clinics who care about saving time on prescriptions & follow-ups**. Single feature angle — "send EMR, Rx, lab orders on WhatsApp" — instead of the full feature dump.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, what if every prescription, invoice and lab order went out on WhatsApp automatically?

That's Docita's EMR + WhatsApp:
• Write Rx once — patient gets it on WhatsApp instantly
• Auto follow-up & review reminders (cuts no-shows ~30%)
• Lab orders & reports linked to the patient timeline
• Works on mobile, no extra app for patients

Reply DEMO for a 5-min look.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Dr. Meera`

---

## 10. `docita_doctor_solo_v1`

Audience: **individual doctors / solo practitioners** (vs. hospital admins). More personal tone, emphasises mobile-first + quick start.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi Dr. {{1}}, running your clinic from a notebook or Excel?

Docita gives you a simple mobile app:
• Today's appointments + WhatsApp reminders
• Prescriptions + lab orders in 30 seconds
• Patient history, allergies & past visits at a glance
• Daily collection report on your phone

Live in a day. Affordable monthly plan, no long contracts.

Reply DEMO and we'll set up a 5-min call today.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `Karthik`

---

## Future / planned templates (not yet submitted)

Track new template ideas here before they go to Meta. Move into the numbered list above once the copy is locked and finance/legal have signed off on any pricing.

| Working name | Audience | Angle | Status |
|---|---|---|---|
| `docita_training_package_v1` | Clinics asking about training | Standalone training-only package (separate from setup) once SKU exists | **Blocked** — pricing TBD |
| `docita_annual_offer_v1` | Existing trial / new signups | Annual plan discount vs. monthly (use % saving, no rupee figure) | **Drafting** |
| `docita_lab_integration_v1` | Multi-doctor clinics | Higher tier features: lab tests, inventory, analytics | **Drafting** |
| `docita_camp_outreach_v1` | Hospitals running health camps | Camp registration + WhatsApp follow-up | Idea |
| `docita_pharmacy_inventory_v1` | Clinics with in-house pharmacy | Pharmacy + inventory module | Idea |
| `docita_winback_v2` | Churned customers | Win-back with new features shipped since they left | Idea |
| `docita_festival_offer_v1` | All prospects | Seasonal pricing offer (Diwali / New Year) — utility/marketing split TBD | Idea |

When promoting an entry: copy the section structure from templates 1–10, pick a versioned `snake_case` name, and add the matching `metaTemplateName` to [`apps/internal/src/features/broadcasts/broadcast-presets.ts`](../apps/internal/src/features/broadcasts/broadcast-presets.ts).

---

---

# Part B — Utility (transactional) templates

These templates are triggered by clinic events (appointment created, prescription shared, invoice generated, payment received, lab report ready, etc.). They are sent from `WhatsappClientService` via the `appointment_*`, `prescription_*`, `invoice_*`, `payment_*`, and `lab_report_*` template definitions in [`packages/types/src/whatsapp/default-templates.data.ts`](../../packages/types/src/whatsapp/default-templates.data.ts).

**Category in Meta: UTILITY** (not Marketing). Utility templates:

- can be sent any time the underlying event happens (no 24h window needed)
- must be transactional only — no offers, no upsell, no opt-out footer
- cost less than Marketing per send
- get rejected if Meta detects promotional copy

The bodies below use positional placeholders (`{{1}}`, `{{2}}`, …) which is what Meta requires. The named variables in the data file (`{{patientName}}`, `{{clinicName}}`, …) are replaced by the API in the order listed under each template's **Variable order**.

> Quick-reply / call-to-action **buttons** are part of the template and must be added in the Meta editor at submission time. Button text must match exactly — the webhook handler matches reply text to route the response.

---

## 11. `appointment_confirmation` (UTILITY)

Sent when an appointment is confirmed (e.g. after the patient taps "Confirm" on the scheduled template, or when reception manually confirms). Includes a maps link.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hello {{1}}, your appointment at *{{2}}* is confirmed.

Date: {{3}}
Time: {{4}}
Doctor: Dr. {{5}}
Location: {{6}}

We look forward to seeing you. Please arrive 10 minutes early.
```

- **Variable order:** `patientName`, `clinicName`, `date`, `time`, `doctorName`, `mapsLink`
- **Buttons (Quick Reply):** `Confirm`, `Reschedule`, `Cancel`
- **Sample variables:** `Priya Sharma`, `Apollo Clinic`, `28 May 2026`, `4:30 PM`, `Ravi Kumar`, `https://maps.app.goo.gl/xyz`

---

## 12. `appointment_reminder_24hr` (UTILITY)

Sent 24 hours before the appointment. Cron-driven from the reminders domain.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, a reminder of your appointment tomorrow at *{{1}}*.

Date: {{3}}
Time: {{4}}
Doctor: Dr. {{5}}

Please reply Confirm or Reschedule so we can plan the day.
```

- **Variable order:** `clinicName`, `patientName`, `date`, `time`, `doctorName`
- **Buttons (Quick Reply):** `Confirm`, `Reschedule`
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `29 May 2026`, `4:30 PM`, `Ravi Kumar`

---

## 13. `appointment_reminder_1hr` (UTILITY)

Sent 1 hour before the appointment.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, your appointment at *{{1}}* is in about 1 hour.

Date: {{3}}
Time: {{4}}
Doctor: Dr. {{5}}

Please head over now. Reply if you are running late.
```

- **Variable order:** `clinicName`, `patientName`, `date`, `time`, `doctorName`
- **Buttons (Quick Reply):** `I am on my way`, `Cancel`
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `28 May 2026`, `4:30 PM`, `Ravi Kumar`

---

## 14. `appointment_reminder_30min` (UTILITY)

Sent 30 minutes before — used to triage walk-ins vs delayed vs cancellations at the front desk.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
*Reminder* - {{1}}

Hi {{2}}, your appointment is in 30 minutes.

Please tell us your status:
```

- **Variable order:** `clinicName`, `patientName`
- **Buttons (Quick Reply):** `On time`, `Delayed`, `Cancelled`
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`

---

## 15. `appointment_cancelled` (UTILITY)

Sent when the clinic cancels an appointment (or after the patient taps Cancel on a reminder).

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, your appointment at *{{1}}* has been cancelled.

Date: {{3}}
Time: {{4}}

Reach out to rebook at a time that works for you.
```

- **Variable order:** `clinicName`, `patientName`, `date`, `time`
- **Buttons:** None
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `28 May 2026`, `4:30 PM`

---

## 16. `appointment_rescheduled` (UTILITY)

Sent when the appointment time changes.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, your appointment at *{{1}}* has been rescheduled.

New Date: {{3}}
New Time: {{4}}

Thank you for your patience. See you then.
```

- **Variable order:** `clinicName`, `patientName`, `date`, `time`
- **Buttons:** None
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `30 May 2026`, `5:15 PM`

---

## 17. `prescription_created` (UTILITY)

Sent when the doctor finalises a prescription. The medication list is *not* inlined so the template can be reused across patients without re-approval and so PHI doesn't sit in WhatsApp message bodies. The patient opens the full Rx via the CTA button (not an inline URL in the body).

> Add `docita.work` to the WABA's allowed domain list before submitting. Do **not** use `https://{{N}}` as the button URL — use a fixed base URL with a dynamic path suffix (see [CTA URL buttons](#cta-url-buttons-fixed-domain--dynamic-path)).

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, Dr. {{3}} from *{{1}}* has added your prescription.

Tap the button below to view your full prescription.

Wishing you a quick recovery.
```

- **Variable order (body):** `clinicName`, `patientName`, `doctorName`
- **Buttons (Call to Action — Visit website, Dynamic):**
  - **Button text:** `View Prescription`
  - **Website URL:** `https://docita.work/rx/{{1}}`
  - **Sample for button {{1}}:** `abc123` (Meta preview: `https://docita.work/rx/abc123`)
- **Sample body variables:** `Apollo Clinic`, `Priya Sharma`, `Ravi Kumar`
- **API send:** body → `clinicName`, `patientName`, `doctorName`; button → `rxToken` only (not the full URL)

---

## 18. `invoice_created` (UTILITY)

Sent when billing generates an invoice (post-consultation or post-procedure).

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, your invoice from *{{1}}* is ready.

Amount: {{3}}

Tap the button below to view your invoice.

Thank you for visiting us.
```

- **Variable order (body):** `clinicName`, `patientName`, `amount`
- **Buttons (Call to Action — Visit website, Dynamic):**
  - **Button text:** `View Invoice`
  - **Website URL:** `https://docita.work/inv/{{1}}`
  - **Sample for button {{1}}:** `abc123`
- **Sample body variables:** `Apollo Clinic`, `Priya Sharma`, `₹850`
- **API send:** body → `clinicName`, `patientName`, `amount`; button → `invToken` (invoice id)

> `{{3}}` is rendered by the API as a formatted currency string (e.g. `₹850`). The literal `₹` symbol is inside the *variable value*, not the template body, so the template stays currency-agnostic.

---

## 19. `payment_reminder` (UTILITY)

Fired by the daily 1 AM cron ([`scheduler.service.ts`](../../apps/api/src/domains/billing/application/services/scheduler.service.ts)) when a pending invoice's `dueDate` is exactly **1, 3, or 7 days** in the past (per clinic settings `paymentReminderDays`). Dedupes against `WhatsappLog` so each invoice receives each reminder day **at most once** even if the cron retries. Skipped if `paymentReminderEnabled = false` for the clinic, if there's no active Razorpay session, or if WhatsApp automation is paused.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, a quick reminder from *{{1}}* that your invoice is still due.

Amount: {{3}}
Due by: {{4}}

View invoice and pay online here: {{5}}

Reach out if you have any questions.
```

- **Variable order:** `clinicName`, `patientName`, `amount`, `dueDate`, `invoiceLink`
- **Buttons:** None — the Razorpay short URL is inlined in the body since `SendMessageUseCase` does not yet support dynamic CTA-button URLs.
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `₹850`, `31 May 2026`, `https://rzp.io/i/abc123`

---

## 20. `payment_confirmation` (UTILITY)

Sent after Razorpay confirms a successful payment. Acts as the digital receipt.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, we have received your payment at *{{1}}*.

Amount: {{3}}
Invoice: {{4}}
Date: {{5}}
Payment Ref: {{6}}

Thank you for your payment. Wishing you good health.
```

- **Variable order:** `clinicName`, `patientName`, `amount`, `invoiceNumber`, `date`, `paymentId`
- **Buttons:** None
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `₹850`, `INV-2026-00481`, `28 May 2026`, `pay_NxYz1234abcd`

---

## 21. `appointment_delay` (UTILITY)

Sent automatically when reception marks a doctor as running late ([`doctor-delay.service.ts`](../../apps/api/src/domains/appointments/application/services/doctor-delay.service.ts) → [`whatsapp-event.listener.ts`](../../apps/api/src/domains/whatsapp/application/listeners/whatsapp-event.listener.ts)). Affected same-day appointments are **shifted in the database first**; `newDate` / `newTime` are the **updated slot** (not the original booking time).

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
*Doctor Running Late* - {{1}}

Hi {{2}}, the doctor is running approximately {{3}} minutes late.

Your updated appointment time:
New date: {{4}}
New time: {{5}}

We apologise for the inconvenience and appreciate your patience.
```

- **Variable order:** `clinicName`, `patientName`, `delayMinutes`, `newDate`, `newTime`
- **Buttons:** None
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `30`, `28 May 2026`, `5:00 PM` (if the original slot was 4:30 PM and delay is 30 minutes)
- **API send:** `newDate` / `newTime` from `appointment.startTime` after the delay shift, formatted in the clinic timezone ([`buildAppointmentDelayVariables`](../../apps/api/src/shared/whatsapp/patient-whatsapp-template-variables.ts))

---

## 22. `payment_link` (UTILITY)

Sent when staff creates or shares a Razorpay payment link for an invoice ([`payments-command.service.ts`](../../apps/api/src/domains/billing/application/services/payments-command.service.ts) → `sendPaymentLinkWhatsApp`). The Razorpay short URL is inlined in the body — the current `SendMessageUseCase` does not yet support dynamic CTA-button URLs, so the link lives in the body text rather than a Pay Now button.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{1}}, here is the secure payment link for your invoice at *{{2}}*.

Amount: {{3}}
Pay online here: {{4}}

Reach out if you have any questions.
```

- **Variable order:** `patientName`, `clinicName`, `amount`, `paymentLink`
- **Buttons:** None
- **Sample variables:** `Priya Sharma`, `Apollo Clinic`, `₹850`, `https://rzp.io/i/abc123`

---

## 23. `invoice_ready` (UTILITY)

Triggered when staff hits the manual **Send to WhatsApp** button on an invoice detail page ([`useResendInvoiceWhatsApp`](../../packages/data-access/src/hooks/use-whatsapp.ts) → [`resend.service.ts`](../../apps/api/src/domains/whatsapp/application/services/resend.service.ts)). Includes invoice number and date; payment is via the CTA button (`docita.work/pay/…` redirects to the active Razorpay session).

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, your invoice from *{{1}}* is ready.

Invoice #: {{3}}
Date: {{4}}
Amount: {{5}}

Tap the button below to pay online.

Thank you for visiting us.
```

- **Variable order (body):** `clinicName`, `patientName`, `invoiceNumber`, `date`, `amount`
- **Buttons (Call to Action — Visit website, Dynamic):**
  - **Button text:** `Pay Now`
  - **Website URL:** `https://docita.work/pay/{{1}}`
  - **Sample for button {{1}}:** `ps_abc123` (payment session id)
- **Sample body variables:** `Apollo Clinic`, `Priya Sharma`, `INV-2026-00481`, `28 May 2026`, `₹850`
- **API send:** body → `clinicName`, `patientName`, `invoiceNumber`, `date`, `amount`; button → `payToken` (payment session id, not the Razorpay short URL)

---

## 24. `patient_response_confirm` (UTILITY)

Acknowledgement sent **back to the patient** when they tap `Confirm` or `I am on my way` / `On time` on any appointment template. Fired by [`patient-response-confirmation.service.ts`](../../apps/api/src/domains/whatsapp/application/services/patient-response-confirmation.service.ts) after the response handler flips the appointment to `CONFIRMED`.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Thanks {{1}}, your appointment at *{{2}}* on {{3}} at {{4}} with Dr. {{5}} is confirmed.

See you then. Please arrive 10 minutes early.
```

- **Variable order:** `patientName`, `clinicName`, `date`, `time`, `doctorName`
- **Buttons:** None
- **Sample variables:** `Priya Sharma`, `Apollo Clinic`, `28 May 2026`, `4:30 PM`, `Ravi Kumar`

> This always fires inside the 24h session window (the patient just tapped a button), so a textFallback works. Defining it as a Meta template still gives cleaner delivery + status reporting.

---

## 25. `patient_response_delay` (UTILITY)

Acknowledgement sent **back to the patient** when they tell us they're delayed and provide the minutes (e.g. tap `Delayed` then reply `15`). Fired by [`patient-response-confirmation.service.ts`](../../apps/api/src/domains/whatsapp/application/services/patient-response-confirmation.service.ts) once the response handler has noted the delay and checked for schedule conflicts.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Thanks for the heads up {{1}}. We have noted a delay of {{6}} minutes for your appointment at *{{2}}* on {{3}} at {{4}} with Dr. {{5}}.

The clinic will plan around the new time. Drive safe.
```

- **Variable order:** `patientName`, `clinicName`, `date`, `time`, `doctorName`, `delayMinutes`
- **Buttons:** None
- **Sample variables:** `Priya Sharma`, `Apollo Clinic`, `28 May 2026`, `4:30 PM`, `Ravi Kumar`, `15`

> If the delay creates a schedule conflict with another patient, the system falls back to a plain-text message asking the patient to call the clinic instead — that path doesn't use this template.

---

# Part C — Authentication template (OTP)

Meta's third category. Strict rules:

- Body **must contain only** the verification code line and a short safety statement. No marketing, no clinic name, no extras.
- Required button: **Copy code** (auto-copies the OTP) or **One-tap autofill** (Android only).
- Templates submit with a fixed pattern that Meta auto-rejects deviations from.
- AUTH templates can be sent any time — no 24h window restriction. This is the whole point.

## 27. `patient_login_otp` (AUTHENTICATION)

Used for both `/portal` patient login OTP ([`patient-portal-auth-command.service.ts`](../../apps/api/src/domains/patient-portal/application/services/patient-portal-auth-command.service.ts)) and public booking phone verification ([`public-booking-creation.service.ts`](../../apps/api/src/domains/public-booking/application/services/public-booking-creation.service.ts)). One template, two call sites — both pass `{ code }`.

**Important — Meta auto-generates the body for AUTHENTICATION templates.** You do not write custom prose in WhatsApp Manager. The body is built from toggles. Don't try to add "Docita" or any other brand wording — Meta will reject it.

### What to select in WhatsApp Manager

| Field | Value |
|---|---|
| **Name** | `patient_login_otp` |
| **Category** | Authentication |
| **Language** | English |
| **Code delivery setup** | **Copy code** (Recommended for now — no app signature hash required) |
| **Add security recommendation** | ✅ ON — appends *"For your security, do not share this code."* |
| **Add expiry time for the code** | ✅ ON, **10 minutes** — matches our `AUTH_CONSTANTS.MFA_CHALLENGE_TTL_MS` and patient-portal OTP TTL |
| **Message validity period** | 10 minutes (default; controls delivery deadline, not code expiry) |

> **About Zero-tap / One-tap auto-fill:** require the Android **package name** and **app signature hash** of a Docita Android app. We don't ship a Docita patient mobile app today, so leave these turned off and use **Copy code** until/unless we publish one. Zero-tap on web is not possible.

### Body Meta will actually send (preview)

With both toggles ON and Copy code selected:

```
{{1}} is your verification code. For your security, do not share this code. This code expires in 10 minutes.
```

- **Variable order:** `code`
- **Button (Copy code):** `Copy code` — Meta auto-copies `{{1}}` when tapped.
- **Sample variable:** `429381`

The string above is what's hard-coded in [`packages/types/src/whatsapp/default-templates.data.ts`](../../packages/types/src/whatsapp/default-templates.data.ts) as both `content` and `textFallback`. Keep these in sync if you ever change the Meta toggles (e.g. expiry → 5 minutes) — otherwise the dev-mode/free-text fallback drifts from production.

> Staff/admin MFA does **not** use WhatsApp — it uses TOTP via Google Authenticator ([`mfa.service.ts`](../../apps/api/src/shared/modules/auth/auth/mfa.service.ts)). No template needed.

---

## 28. `partner_welcome_v1` (UTILITY — PARTNER)

Sent once when an operator adds a referral partner (pharmacist / marketing rep / clinic) via the internal referrals page. Attaches the Docita Clinic OS showcase PDF as a header document and inlines the partner's ready-to-send share message in the body so they can copy-paste it into a doctor conversation. Rendered by [`PartnerTemplateService.renderWelcomeComponents`](../../apps/api/src/domains/subscriptions/application/services/partner-template.service.ts) and dispatched by [`ReferrerWelcomeService`](../../apps/api/src/domains/subscriptions/core/services/referrer-welcome.service.ts) on the `REFERRER_CREATED` event. The "Resend welcome" button in the internal referrals page re-fires the same template with `kind = RESEND_WELCOME` on the audit log row.

- **Category:** Utility (no promotional content — purely onboarding + share kit delivery)
- **Language:** English
- **Header:** **Document** (`docita-partner-showcase.pdf`, the 1-page PDF generated by `PartnerShowcasePdfService`). URL is supplied at send time via a 24h signed storage URL; the partner can download but not share a permanent link.
- **Body (with `{{1}}`–`{{5}}` = partnerName, typeLabel, code, partnerPortalUrl, shareMessage):**

```
Hi {{1}},

Welcome to the Docita Referral Partner programme.

You are listed as a {{2}} with referral code {{3}}.

Sign in to your partner portal anytime at:
{{4}}

Below is a ready-to-send message you can share with any doctor or clinic owner you speak to. Your code is applied automatically when they sign up using your link.

---
{{5}}

— The Docita team
```

- **Variable order:** `partnerName`, `typeLabel` (`Pharmacy` / `Marketing partner` / `Referral partner` / `Clinic`), `code` (the `RFR-XXXXXX` code), `partnerPortalUrl` (default `https://app.docita.work/partner`; override via `PARTNER_PORTAL_URL` env), `shareMessage` (multi-line — generated by `PartnerTemplateService.renderShareMessage`; can be long)
- **Button (Call to Action → URL):** `Open partner portal` — the URL is the full `partnerPortalUrl` (WABA URL buttons have a fixed prefix; we pass the entire URL as the dynamic token so the resulting link is the partner portal itself). The button is index 0.
- **Buttons (Quick Reply):** None.
- **Sample variables:** `Anil Kumar`, `Pharmacy`, `RFR-AB23CD`, `https://app.docita.work/partner`, `<the 11-line share message>`
- **No emoji in the body or the share message** — the partner brand voice is no-emoji (same rule as the marketing set).

### What to select in WhatsApp Manager

| Field | Value |
|---|---|
| **Name** | `partner_welcome_v1` |
| **Category** | Utility |
| **Language** | English |
| **Header** | **Document** (Type: `document`, then upload `docita-partner-showcase.pdf` as the sample) |
| **Body** | Paste the body above |
| **Buttons** | Add 1 button: **Call to action → URL**, label `Open partner portal`, type `URL`, leave the URL field empty (the dynamic value comes in at send time as the `partnerPortalUrl` variable) |
| **Sample header document** | `docita-partner-showcase.pdf` (the canonical showcase, generated from `apps/api/src/domains/subscriptions/application/services/partner-showcase-pdf.service.ts`) |

> **About the header document URL:** unlike body placeholders, the header document's `link` parameter is supplied at send time (not stored in the template). The Meta-approved template does not include a `{{1}}` placeholder for the document URL — `ReferrerWelcomeService` passes the freshly-generated signed URL when calling `whatsappClient.sendMessage`. As long as the template's sample document in WhatsApp Manager is `docita-partner-showcase.pdf`, Meta will accept it; the actual link sent at runtime can be any signed URL.

### What the recipient sees

The PDF preview thumbnail at the top (the 1-page Docita Clinic OS showcase) with the body text below and a green "Open partner portal" button at the bottom. The share message in the body is plain monospace-style text and is trivial to copy-paste.

### Why no `{{1}}` in the body for the PDF URL

The PDF link isn't a body placeholder — it's the **header document URL** parameter (a separate channel from body placeholders). `ReferrerWelcomeService` builds the request as `components: [{ type: 'header', parameters: [{ type: 'document', document: { link: pdfUrl, filename: 'docita-partner-showcase.pdf' } }] }, { type: 'body', parameters: [...] }]`. Don't try to also put `{{1}}` for the URL in the body — the document is the only "URL thing" the template knows about, and it's optional (a `partner_welcome_v1` send without a document will still work; the partner just won't see a PDF preview).

### Idempotency

The welcome pipeline can re-run without creating duplicate `WELCOME` rows because the `kind` field on the audit log differentiates `WELCOME` (create) from `RESEND_WELCOME` (operator-triggered resend). Both flows use the same template name + same body placeholders.

### Future variations

- **`partner_welcome_hi_v1`** — same template, `languageCode: 'hi'`. Wire it up when the first Hindi-speaking partner lands. The data-file Zod schema is already in place; add a sibling entry.
- **`partner_welcome_v2`** — if we want a header image instead of a PDF, swap `headerType: 'IMAGE'`, swap the parameter from `document` to `image` in `PartnerTemplateService.renderWelcomeComponents`, and re-submit. The PDF and image headers occupy the same Meta slot.

---

## 29. `partner_login_otp` (AUTHENTICATION)

Used by the partner self-service portal (`app.docita.work/partner`) when a referral partner requests a login OTP. Same audience split as `patient_login_otp` (§27) but for the partner audience — the helper is shared ([`whatsapp-login-otp.helper.ts`](../../apps/api/src/shared/whatsapp/whatsapp-login-otp.helper.ts), `sendLoginOtp(whatsapp, logger, 'partner', ...)`). OTP is 6 digits, 10-minute TTL, 3-attempt cap (atomic increment in the DB to prevent brute-force races).

**Important — Meta auto-generates the body for AUTHENTICATION templates.** You do not write custom prose in WhatsApp Manager. The body is built from toggles. Don't try to add "Docita" or any other brand wording — Meta will reject it.

### What to select in WhatsApp Manager

| Field | Value |
|---|---|
| **Name** | `partner_login_otp` |
| **Category** | Authentication |
| **Language** | English |
| **Code delivery setup** | **Copy code** (no Docita Android app today — see §27 for the Zero-tap note; same constraint applies) |
| **Add security recommendation** | ✅ ON |
| **Add expiry time for the code** | ✅ ON, **10 minutes** — matches `PARTNER_OTP_TTL_MS` in `partner-auth.service.ts` |
| **Message validity period** | 10 minutes (default) |

### Body Meta will actually send (preview)

With both toggles ON and Copy code selected:

```
{{1}} is your verification code. For your security, do not share this code. This code expires in 10 minutes.
```

- **Variable order:** `code`
- **Button (Copy code):** `Copy code` — Meta auto-copies `{{1}}` when tapped.
- **Sample variable:** `429381`

Mirrored content lives in `packages/types/src/whatsapp/default-templates.data.ts` as `partner_login_otp.content` and `.textFallback` — keep these in sync with the WhatsApp Manager toggles (same posture as §27).

### Operator resend flow

OTP re-send is the partner's own action (a "Resend code" button on the partner login page). Re-send re-uses the same `partner_login_otp` template with a new code; the previous challenge is invalidated via `PartnerOtpChallenge.updateMany({ where: { phone, usedAt: null } })`. The audit log on the referrer row is not touched (the OTP is a transient concern, not a partner-state change).

---

## Future / planned utility templates

Track new transactional triggers here.

| Working name | Trigger | Status |
|---|---|---|
| `consultation_followup` | N days after visit — "how are you feeling?" check-in | Idea |
| `prescription_refill_reminder` | Day before medication course ends | Idea |
| `vaccine_due_reminder` | Child / adult vaccine schedule | Idea |
| `annual_checkup_reminder` | 12 months after last full checkup | Idea |
| `clinic_closure_notice` | Clinic-side broadcast for closure days (festival, emergency) — could also be UTILITY | Idea |
| `doctor_unavailable_notice` | Per-doctor full-day absence (distinct from `appointment_delay`) | Idea |
| `lab_report_ready` | Lab report uploaded against a patient | **Blocked** — no LabReport model in Prisma schema yet |
| `queue_position_update` | Live walk-in queue position | Idea — needs WhatsApp Flows |
| `feedback_request` | After visit completion (must avoid promo language) | **Drafting** |

---

## Submission checklist

Follow these steps for **each** template above. Allow ~15 minutes per template the first time.

### 0. Before you open Meta

- Get the **final body copy** signed off — Meta does not allow edits after approval; you can only create a new version (`_v2`).
- Re-confirm any pricing or fee amounts (₹499, ₹4,999, ₹1,000 referral, 5% share, etc.) with finance.
- Make sure the matching entry in [`apps/internal/src/features/broadcasts/broadcast-presets.ts`](../apps/internal/src/features/broadcasts/broadcast-presets.ts) uses the **exact** `metaTemplateName` you're about to submit.

### 1. Open the template editor

1. Go to <https://business.facebook.com/> and sign in with an admin of the Docita Business Account.
2. Open **Business Settings** → **Accounts → WhatsApp Accounts** → select the Docita WABA.
3. Open the **WhatsApp Manager** (top-right shortcut, or <https://business.facebook.com/wa/manage/>).
4. In the left nav choose **Message templates** → **Create template**.

### 2. Fill in template metadata

| Field | Value |
|---|---|
| Category | **Marketing** for templates §1–§10, **Utility** for §11–§26, **Authentication** for §27 |
| Name | exact name from the template heading — lowercase, `snake_case`. Marketing templates are version-suffixed (`docita_intro_v1`); utility templates use the canonical name from the data file (`appointment_scheduled`, no version suffix) so the API resolver can find them |
| Language | **English** (`en`) — add `en_US` only if Meta requires it for your account |

> Tip: Names cannot be reused even after deletion for 30 days. If a name is rejected, bump the version (`_v2`).

### 3. Build the template body

1. **Header:** leave as **None** (all templates in this doc are body-only).
2. **Body:** paste the body text from the section above exactly as written.
   - For **Marketing** templates: keep `{{1}}` for the recipient name. Do not add new variables — the broadcast service only sends one.
   - For **Utility** templates: paste all positional placeholders (`{{1}}` … `{{N}}`) exactly as shown. The order MUST match the **Variable order** line, because the API substitutes named variables in that order.
   - Emoji are allowed and improve readability.
3. **Sample variables:** click **Add sample** for each variable and paste the corresponding values from the `Sample variables` line (in the same order). Meta uses these for review only; they are not sent to recipients.
4. **Footer:**
   - **Marketing:** paste `Reply STOP to opt out.` — required for marketing opt-out compliance in India.
   - **Utility:** leave empty. An opt-out footer on a utility template can cause Meta to re-classify it as Marketing.
5. **Buttons:**
   - **Marketing templates §1–§10:** leave empty. Replies route into the Support inbox.
   - **Utility templates §11–§21:** add buttons exactly as listed under each template:
     - Templates without a `Buttons` entry (or marked `Buttons: None`) must be submitted with **no buttons** at all.
     - **Quick Reply** buttons (`Confirm`, `Reschedule`, `Cancel`, `On time`, `Delayed`, `Cancelled`, `I am on my way`) — text must match exactly so the webhook handler can route replies.
     - **Call to Action** buttons (`View Prescription`, `View Invoice`, `Pay Now`) — set type to **Visit website**, URL type **Dynamic**, and a **fixed** Website URL per template (e.g. `https://docita.work/rx/{{1}}` — see [CTA URL buttons](#cta-url-buttons-fixed-domain--dynamic-path)). The sample for button `{{1}}` is only the path token (`abc123`), never a full URL. Add `docita.work` to the WABA's allowed domains first. **Invalid:** `https://{{4}}` or passing `https://docita.work/rx/abc123` as the button variable at send time.

### 4. Submit and wait for review

1. Click **Submit**. The template status moves to **In review**.
2. Approval is usually **minutes to a few hours**, occasionally up to 24h.
3. You will see one of:
   - **Approved** → ready to use.
   - **Rejected** → reason shown (most common: promotional claims without a clear opt-out, missing variable sample, or duplicated content of an existing template). Fix the body, bump to `_v2`, and resubmit.
   - **Paused / Flagged** → usually triggered by recipient block-rate after launch, not at submit time.

### 5. Wire it up in the app

**For Marketing templates (§1–§10):**

1. Confirm the template appears in the broadcast page's **Meta template** dropdown (the picker reads from `BROADCAST_PRESETS`).
2. Send a **test broadcast to your own number** with the production audience filter set to "only me" before doing a real fan-out.
3. For the first real send, start with a small batch (≤ 50 recipients) and watch the Support inbox + delivery status for an hour.

**For Utility templates (§11–§26):**

1. The template name in Meta must match the `name` field in [`packages/types/src/whatsapp/default-templates.data.ts`](../../packages/types/src/whatsapp/default-templates.data.ts) exactly (e.g. `appointment_confirmation`). The `TemplateResolverService` picks it up by name.
2. Trigger the underlying event in a staging clinic against a test patient number you control:
   - book an appointment → `appointment_confirmation` fires
   - cancel an appointment → `appointment_cancelled` fires
   - reschedule an appointment → `appointment_rescheduled` fires
   - mark doctor as delayed → `appointment_delay` fires for affected patients
   - cron job at T-24h / T-1h / T-30min → `appointment_reminder_*` fires
   - share a prescription (automatic or manual **Send to WhatsApp**) → `prescription_created` fires (link + CTA; opens `/rx/{id}`)
   - generate an invoice → `invoice_created` fires (automatic)
   - hit "Send to WhatsApp" on an invoice → `invoice_ready` fires (manual)
   - mark a Razorpay payment success → `payment_confirmation` fires (via `PAYMENT_CAPTURED` event from [`razorpay-invoice-webhook.service.ts`](../../apps/api/src/domains/billing/application/services/razorpay-invoice-webhook.service.ts))
3. Verify the rendered message matches Meta's approved version. If the API still uses `textFallback` (the free-text version), the template lookup is failing — most often a name mismatch or pending approval.

**For the Authentication template (§27):**

1. Submit `patient_login_otp` under Meta's **Authentication** category and pick the **One-time password** template type. Add the Copy-code button.
2. Once approved, trigger from staging:
   - `POST /portal/auth/request-otp` with a known patient phone → `patient_login_otp` fires from [`patient-portal-auth-command.service.ts`](../../apps/api/src/domains/patient-portal/application/services/patient-portal-auth-command.service.ts)
   - public booking `requestOtp` endpoint → same template from [`public-booking-creation.service.ts`](../../apps/api/src/domains/public-booking/application/services/public-booking-creation.service.ts)
3. Confirm delivery for a recipient who has **never** messaged us — this is the whole point of the AUTH category (no 24h window restriction).

### 6. Versioning & changes

- Body text is **immutable** after approval. Any wording change requires a new template — bump the suffix (`docita_intro_v1` → `docita_intro_v2`) and update the preset.
- Keep the old `_v1` approved until the new version is live and the preset is switched, so in-flight broadcasts don't break.
- Delete deprecated templates from Meta only **after** removing them from `BROADCAST_PRESETS`, otherwise the dropdown will point at a missing template.

### 7. Recommended submission order

Submit utility templates first — they unblock real patient-facing flows. Marketing templates can roll out as their copy is finalised.

**Batch 0 — Authentication (login is broken without this — submit first):**

1. `patient_login_otp` — patient portal + public-booking OTP. Plain-text OTP sends were broken outside the 24h window; the template path fixes them.

**Batch 1 — Utility (clinic goes dark without these):**

2. `appointment_confirmation`
3. `appointment_reminder_24hr`
4. `appointment_reminder_1hr`
5. `appointment_reminder_30min`
6. `appointment_cancelled`
7. `appointment_rescheduled`
8. `appointment_delay`
9. `invoice_created`
10. `invoice_ready` — manual "Send to WhatsApp" button on invoices.
11. `payment_confirmation`
12. `payment_reminder`
13. `prescription_created` — automatic and manual prescription WhatsApp (link + CTA).
14. `payment_link` — staff-initiated Razorpay payment link share.
15. `patient_response_confirm` — patient-side acknowledgement when patient confirms or is on the way.
16. `patient_response_delay` — patient-side acknowledgement when patient reports a delay.

**Batch 2 — Marketing (safer ones first):**

17. `docita_hms_question_v1`
18. `docita_hms_intro_v1`
19. `docita_intro_v1`
20. `docita_doctor_solo_v1`
21. `docita_whatsapp_emr_v1`
22. `docita_pricing_offer_v1`
23. `docita_demo_followup_v1`
24. `docita_training_setup_v1`
25. `docita_hospital_referral_partner_v1` — referral templates have higher rejection risk (commercial offer).
26. `docita_pharmacy_referral_partner_v1`

## Operational notes

- The broadcast service sends through the existing support WhatsApp number (the same one wired into `WhatsappClientService`). Replies from broadcast recipients automatically land in `/support` (Support WhatsApp inbox) because the webhook handler routes all incoming traffic to `SupportWhatsAppInboxService`.
- Sends are throttled (~4/sec) and processed serially in-process; for very large batches consider extracting this into a queue worker job.
- The broadcast page also supports "Free text" mode which calls the regular text endpoint — only use this for recipients who are inside the 24-hour customer service window (i.e. they've messaged us first).
- **No hard rupee amounts in template bodies.** Use percentages (e.g. `5%` revenue share, `~15%` annual saving, `~30%` fewer no-shows) or qualitative phrases ("flat referral fee", "low monthly fee") and surface the actual numbers in the reply / callback. Template bodies cannot be edited after Meta approval — a hard-coded price means a forced `_v2` every time pricing moves.
- Percentages and commercial claims (`5%` share, `~30%` no-show reduction, `~90%` staff proficiency in week one) are still commercial statements — re-confirm with finance/marketing before submitting, since they are also frozen after approval.
