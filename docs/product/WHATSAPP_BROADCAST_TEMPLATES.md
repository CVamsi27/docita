# WhatsApp Templates — Meta Submission Guide

This document covers **every WhatsApp template Docita sends through Meta**, split into two categories:

1. **Marketing templates** (broadcasts §1–§10) — outbound campaigns from the internal broadcast feature.
2. **Utility templates** (transactional, §11–§26) — system messages triggered by user actions in the clinic app: appointment confirmations, reminders, doctor delays, prescriptions, invoices, payments, plus patient-reply acknowledgements (§25–§26).
3. **Authentication template** (§27) — patient portal / public-booking OTP. Meta's **AUTHENTICATION** category; mandatory copy-code button.

Marketing templates open a 24-hour customer service window. Utility templates can be sent at any time but must match the user-initiated action and contain no promotional content — otherwise Meta will reject or down-categorise them.

The canonical source for **utility template content** is [`packages/types/src/whatsapp/default-templates.data.ts`](../../packages/types/src/whatsapp/default-templates.data.ts). The bodies below are the Meta-submission versions (positional `{{1}}`, `{{2}}` placeholders) of those same definitions — keep the two in sync.

All Marketing templates use English (`en`) with a single body variable for the recipient name.

The strings below are the exact copy to paste into the Meta template editor. The internal `BROADCAST_PRESETS` map points at these template names, so changing a `metaTemplateName` here requires the same change in [apps/internal/features/broadcasts/broadcast-presets.ts](../apps/internal/features/broadcasts/broadcast-presets.ts).

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

---

# Part A — Marketing templates (broadcasts)

The internal `BROADCAST_PRESETS` map points at these template names, so changing a `metaTemplateName` here requires the same change in [apps/internal/features/broadcasts/broadcast-presets.ts](../apps/internal/features/broadcasts/broadcast-presets.ts).

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

When promoting an entry: copy the section structure from templates 1–10, pick a versioned `snake_case` name, and add the matching `metaTemplateName` to [`apps/internal/features/broadcasts/broadcast-presets.ts`](../apps/internal/features/broadcasts/broadcast-presets.ts).

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

Sent when the doctor finalises a prescription. Body links out to the full Rx — the medication list is *not* inlined so the template can be reused across patients without re-approval and so PHI doesn't sit in WhatsApp message bodies.

> Meta requires CTA URLs to be on an approved domain. Add `docita.work` (and any whitelabel domains) to the WABA's allowed domain list before submitting.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, Dr. {{3}} from *{{1}}* has added your prescription.

View full prescription here: {{4}}

Wishing you a quick recovery.
```

- **Variable order:** `clinicName`, `patientName`, `doctorName`, `link`
- **Buttons (Call to Action):** `View Prescription` → URL = `{{4}}`
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `Ravi Kumar`, `https://docita.work/rx/abc123`

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
View invoice here: {{4}}

Thank you for visiting us.
```

- **Variable order:** `clinicName`, `patientName`, `amount`, `link`
- **Buttons (Call to Action):** `View Invoice` → URL = `{{4}}`
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `₹850`, `https://docita.work/inv/abc123`

> `{{3}}` is rendered by the API as a formatted currency string (e.g. `₹850`). The literal `₹` symbol is inside the *variable value*, not the template body, so the template stays currency-agnostic.

---

## 19. `payment_reminder` (UTILITY)

Sent when an invoice is unpaid past the due date threshold.

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
- **Buttons (Call to Action):** `Pay Now` → URL = `{{5}}`
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `₹850`, `31 May 2026`, `https://docita.work/inv/abc123`

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

Sent automatically when reception marks a doctor as running late (via the doctor-delay flow). Fires for every patient whose appointment is still ahead of them on the day.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
*Doctor Running Late* - {{1}}

Hi {{2}}, the doctor is running approximately {{3}} minutes late for your appointment.

Date: {{4}}
Time: {{5}}

We apologise for the inconvenience and appreciate your patience.
```

- **Variable order:** `clinicName`, `patientName`, `delayMinutes`, `date`, `time`
- **Buttons:** None
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `30`, `28 May 2026`, `4:30 PM`

---

## 22. `prescription_shared` (UTILITY)

Triggered when staff hits the manual **Send to WhatsApp** button on a prescription detail page ([`useResendPrescriptionWhatsApp`](../../packages/data-access/src/hooks/use-whatsapp.ts) → [`resend.service.ts`](../../apps/api/src/domains/whatsapp/application/services/resend.service.ts)). Includes the full medication list inline (unlike the link-only `prescription_created` which fires automatically).

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, Dr. {{3}} from *{{1}}* has shared your prescription.

Medications:
{{4}}

Notes from the doctor:
{{5}}

Wishing you a quick recovery. Reach out for any clarifications.
```

- **Variable order:** `clinicName`, `patientName`, `doctorName`, `medications`, `instructions`
- **Buttons:** None
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `Ravi Kumar`, `• Paracetamol 500mg - 1 tab - twice a day (3 days)\n• Azithromycin 500mg - 1 tab - once a day (5 days)`, `Take after meals. Plenty of fluids.`

> The full medication list is inlined into the body — this means the template variable carries PHI. Meta allows this for utility templates, but every send should also be logged to the `WhatsappLog` table (already handled by `resend.service.ts`).

---

## 23. `invoice_ready` (UTILITY)

Triggered when staff hits the manual **Send to WhatsApp** button on an invoice detail page ([`useResendInvoiceWhatsApp`](../../packages/data-access/src/hooks/use-whatsapp.ts) → [`resend.service.ts`](../../apps/api/src/domains/whatsapp/application/services/resend.service.ts)). Carries the same payment link the automatic `invoice_created` flow uses, plus invoice number and date.

- **Category:** Utility
- **Language:** English
- **Header:** None
- **Body:**

```
Hi {{2}}, your invoice from *{{1}}* is ready.

Invoice #: {{3}}
Date: {{4}}
Amount: {{5}}

Pay online here: {{6}}

Thank you for visiting us.
```

- **Variable order:** `clinicName`, `patientName`, `invoiceNumber`, `date`, `amount`, `paymentLink`
- **Buttons (Call to Action):** `Pay Now` → URL = `{{6}}`
- **Sample variables:** `Apollo Clinic`, `Priya Sharma`, `INV-2026-00481`, `28 May 2026`, `₹850`, `https://rzp.io/i/abc123`

---

## 25. `patient_response_confirm` (UTILITY)

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

## 26. `patient_response_delay` (UTILITY)

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

- **Category:** Authentication
- **Language:** English
- **Header:** None
- **Body:**

```
{{1}} is your Docita verification code.

For your security, do not share this code with anyone. It is valid for 10 minutes.
```

- **Variable order:** `code`
- **Button (Copy Code):** `Copy code` — Meta auto-copies `{{1}}` when tapped.
- **Sample variables:** `429381`

> When submitting in Meta, pick category **Authentication** and the **One-time password** template type. Meta provides a fixed body skeleton; you can only customise the safety statement and the code-expiry duration. The 10-minute validity here matches `AUTH_CONSTANTS.MFA_CHALLENGE_TTL_MS` / patient-portal OTP TTL.

> Staff/admin MFA does **not** use WhatsApp — it uses TOTP via Google Authenticator ([`mfa.service.ts`](../../apps/api/src/shared/modules/auth/auth/mfa.service.ts)). No template needed.

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
- Make sure the matching entry in [`apps/internal/features/broadcasts/broadcast-presets.ts`](../apps/internal/features/broadcasts/broadcast-presets.ts) uses the **exact** `metaTemplateName` you're about to submit.

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
     - **Call to Action** buttons (`View Prescription`, `View Invoice`, `Pay Now`) — set type to "Visit website", URL type "Dynamic", URL template `https://docita.work/{{1}}` (or the placeholder shown in the template). Add `docita.work` to the WABA's allowed domains first.

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
   - share a prescription → `prescription_created` fires (link only, automatic)
   - hit "Send to WhatsApp" on a prescription → `prescription_shared` fires (inline meds, manual)
   - generate an invoice → `invoice_created` fires (automatic)
   - hit "Send to WhatsApp" on an invoice → `invoice_ready` fires (manual)
   - mark a Razorpay payment success → `payment_confirmation` fires (via `PAYMENT_CAPTURED` event from [`razorpay-invoice-webhook.service.ts`](../../apps/api/src/domains/billing/application/services/razorpay-invoice-webhook.service.ts))
3. Verify the rendered message matches Meta's approved version. If the API still uses `textFallback` (the free-text version), the template lookup is failing — most often a name mismatch or pending approval.

**For the Authentication template (§24):**

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
13. `prescription_created`
14. `prescription_shared` — manual "Send to WhatsApp" button on prescriptions; inlines medications.
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
