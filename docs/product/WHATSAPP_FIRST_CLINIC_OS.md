# WhatsApp-First Clinic OS — Product & Distribution Strategy

> **Positioning:** Docita is the WhatsApp-first clinic OS. A small clinic owner should be able to start running their clinic without opening a browser. WhatsApp is not a feature — it is the primary interface.

---

## 1. The Problem with Existing Solutions

Practo Ray, MocDoc, Halemind, etc. all assume:
- The clinic has a desktop/laptop
- Someone will sit down and "set up the software"
- The doctor wants to open a browser to check the day's schedule

Reality for a single-owner clinic in India:
- Doctor owns a smartphone (Android, ₹10-20k)
- Front desk may have a cheap Android phone or no device at all
- "Software setup" means downloading an APK or opening a link
- The doctor already gets appointment requests, prescription photos, and patient queries on WhatsApp

Existing players built browser-first SaaS with WhatsApp as a notification add-on. This document inverts that:

**WhatsApp is the OS. The web app is the power-user mode.**

---

## 2. Tier & Pricing Redesign (Small Clinic Focus)

### Free Tier (₹0/mo) — "The Hook"

Purpose: Eliminate trial friction. No payment, no credit card, no demo call.

| Feature | Detail |
|---------|--------|
| Patient management | Name, phone, visit history (last 10 notes) |
| Appointment calendar | Today & tomorrow view only (via WhatsApp chat) |
| Manual reminders | No auto-reminders (patient can't miss what they never had) |
| E-Rx (basic) | Generate and share prescription text via WhatsApp |
| ABHA verify (M1) | Yes — free and government-mandated; incentive-compatible |
| Billing | None |
| Staff logins | 0 (doctor only) |
| Patient limit | 100 active patients |
| Prescription limit | 50/month |
| WhatsApp | Read-only: patient can receive appointment info via WhatsApp |
| Reports | None |
| Support | Community WhatsApp group only |

**Why this works:**
- Zero barrier to start
- Clinic gets real value (appointment mgmt + WhatsApp Rx)
- DHIS incentive (₹20/ABHA-linked record) is a freemium upsell hook — when they hit 100 patients, they *want* to pay
- No support cost (community group absorbs this)

### Starter (₹999/mo) — "The Real Clinic"

Purpose: Covers a functioning single-doctor clinic. Undercut Practo Ray (₹2000+) on price.

| Feature | Detail |
|---------|--------|
| Everything in Free | — |
| Patient limit | Unlimited |
| Appointment calendar | Full 30-day calendar view |
| Auto reminders | WhatsApp reminders at 24hr and 1hr (templated) |
| Basic billing | GST invoices, cash/UPI recording |
| Reports | Daily collection, patient count, no-show rate |
| WhatsApp | Full send: prescriptions, invoices, reminders via WhatsApp |
| Staff logins | 1 front desk staff |
| Patient portal | Basic (view appointments, download past Rx) |
| Support | WhatsApp chat support (8am-8pm) |

### Growth (₹2499/mo) — "Multi-Doctor Ready"

Purpose: 2-5 doctor clinics that need more structure.

| Feature | Detail |
|---------|--------|
| Everything in Starter | — |
| Doctors | Up to 5 |
| Staff logins | Up to 5 |
| Inventory | Medicines & supplies tracking |
| Lab integration | Upload reports, share on WhatsApp |
| ABHA verify (M1) | Full ABDM integration for DHIS incentive |
| Analytics | Recall rates, peak hours, doctor-wise revenue |
| Queue management | Digital queue with SMS/WhatsApp status updates |
| Patient portal | Full (appointments, Rx, billing, history, lab reports) |

### Pro (₹4999/mo) — "Small Chain"

Purpose: 2-5 locations, needs consolidation.

| Feature | Detail |
|---------|--------|
| Everything in Growth | — |
| Locations | Up to 5 |
| Consolidated reports | Cross-location revenue, patient acquisition |
| AI scribe | Voice-to-clinical-note transcription |
| Custom branding | Logo on patient-facing WhatsApp messages and portal |
| API access | Integration with external lab/pharmacy systems |
| Priority support | Dedicated WhatsApp line |

### Pricing Rationale

| Competitor | Solo Clinic Price | Docita Equivalent |
|-----------|-----------------|-------------------|
| Practo Ray | ₹2000-₹2500/mo | ₹999/mo (Starter) |
| MocDoc | ₹1500/mo | ₹999/mo (Starter) |
| Halemind | ₹1200/mo | ₹999/mo (Starter) |
| Dochours | ₹999/mo | ₹999/mo (Starter) — feature parity, not price war |

**Free tier is the distribution mechanism.** You don't win on price at ₹999 vs ₹1200. You win by having 1000 clinics on Free who convert to Starter at 10% = 100 paid clinics before you spend a rupee on ads.

---

## 3. WhatsApp-First Onboarding (The Core Innovation)

### Flow: "Text START to +91 87903 11010"

This is the single most important product decision. No app store, no email verification, no password.

```
Step 1: Clinic owner texts "START" to Docita WhatsApp number
Step 2: Auto-reply: "Welcome to Docita! Let's set up your clinic in 2 minutes.
         What's your clinic name?"
Step 3: User replies "Dr. Sharma's Clinic"
Step 4: "Great! What type of clinic? (1) General Physician (2) Dentist (3) Skin
         (4) Child (5) Eye (6) Other"
Step 5: User replies "1"
Step 6: "Perfect! Now enter your first patient's name and phone:
         Example: Ravi Kumar, 9876543210"
Step 7: User replies "Ravi Kumar, 9876543210"
Step 8: "Done! Patient added. Your clinic is live at https://docita.work/c/abc123
         Login OTP is 429381. What would you like to do next?
         (1) Book an appointment (2) Write a prescription (3) See today's schedule"
```

**Total time to first patient saved: ~90 seconds.** No competitor does this.

### WhatsApp-native daily workflow

The clinic owner should be able to run the entire day from WhatsApp:

```
Message to clinic (8 AM): "Good morning Dr. Sharma! Today's schedule:
  9:00 AM — Ravi Kumar (follow-up)
  10:30 AM — Priya Sharma (new patient)
  11:00 AM — Anil Verma (check-up)

  Reply '1' to view Ravi's history
  Reply '2' to see today's full schedule
  Reply 'START' to add a walk-in patient"
```

When a patient is in consultation:
```
Doctor messages: "New Rx for Ravi Kumar"
Docita replies: "Open prescription form: https://docita.work/rx/new?patient=123&via=whatsapp
  Or reply with: Medicine, dose, duration (e.g. 'Amoxicillin 500mg, 1-0-1, 5 days')"
```

### WhatsApp as the patient's interface too

Patients can:
- Text their clinic's Docita number to book/reschedule/cancel
- Receive reminders, prescriptions, invoices on WhatsApp
- Reply "Confirm" or "Reschedule" to appointment reminders
- Get digital queue position updates

All without installing any app.

### What this means architecturally

The WhatsApp number becomes the **primary user identity**. The web session is secondary. Key changes:

- No mandatory email/password signup
- Phone number + clinic name = minimum viable registration
- Web access is authenticated via WhatsApp OTP (not email OTP)
- "Login" means "send OTP to the registered WhatsApp number"
- Session management ties to WhatsApp number, not email

---

## 4. Distribution & Marketing Channels

### Channel #1: WhatsApp viral loop (built into product)

When a clinic sends a prescription or invoice to a patient on WhatsApp:
```
Your prescription from Dr. Sharma's Clinic
[View Prescription]
---
Powered by Docita — Start your clinic on WhatsApp: https://docita.work/start
```

Each patient touch becomes a distribution channel. If the patient is a doctor themselves, or knows a clinic owner, the "Powered by Docita" line is a CTA.

**Implementation:** This already exists in the prescription footer (see `DOCITA_MARKETING_DISTRIBUTION_STRATEGY.md` §12). Ensure the CTA explicitly mentions WhatsApp: "Start your clinic on WhatsApp" not "Visit docita.work."

### Channel #2: Medical representatives (MRs) as sales force

Every pharma company has 50-200 MRs visiting clinics daily. An MR visits 8-10 clinics per day. The MR already has WhatsApp groups with doctors.

**Offer to pharma companies (e.g., Sun Pharma, Cipla, Mankind):**
- MRs get a referral link: "Share this with your doctors → they get free clinic software → you get ₹500 per signup"
- Pharma gets: an in-app banner slot visible to the doctor during e-Rx (targeted by specialty)
- Doctor gets: free clinic OS
- Docita gets: distribution at zero CAC

**Execution:**
1. Create a pharma partner portal (simple): track referrals, payouts, banner slots
2. One-page PDF for MRs: "How to help your doctors go digital in 2 minutes"
3. MR WhatsApp-broadcasts the "Text START to 87903 11010" message to their doctor contacts

### Channel #3: IMA (Indian Medical Association) chapters

350,000+ doctors across 1,700+ branches.

**Tactic:** Present at IMA chapter meetings. Not a product demo — a talk titled *"How to stop losing patients to follow-up fatigue — the WhatsApp clinic approach"*.

**At the end:** "Text START to 87903 11010. 2 minutes. Free. I'll show you after the session."

**Goal:** Get 3 IMA chapters to try it → screenshot WhatsApp conversations → use as social proof for the next 20 chapters.

### Channel #4: CAs (Chartered Accountants)

Every clinic has a CA. The CA does GST filing, reconciliation, TDS. CAs hate it when clinics have messy records.

**Pitch to CA:** "Put your doctor clients on Docita → their GST invoices auto-generate → your reconciliation drops from 4 hours to 20 minutes. You get 10% recurring commission on whatever they pay."

**Execution:**
- One-page PDF: "For CAs: How to digitize your healthcare clients"
- WhatsApp broadcast to CA networks
- Co-branded referral page: `docita.work/ca/[referral-code]`

### Channel #5: WhatsApp group seeding

India has thousands of "Doctors WhatsApp Group" — specialty-specific, city-specific, IMA chapter groups.

**Tactic:**
- Join 50-100 groups (founder or team member participating genuinely for 2 weeks — answer medical questions, share relevant content)
- Then: "Hey, I built this thing for my own clinic — WhatsApp-based. Anyone want to try? Text START to 87903 11010, takes 2 minutes."
- Not a spam blast. A genuine recommendation from a group participant.

### Channel #6: Zero-click public patient pages

When a patient opens a prescription or invoice link (`docita.work/rx/{id}`), the page shows:
- The prescription/invoice (primary purpose)
- A small footer: "Your clinic runs on Docita. Start your own clinic on WhatsApp →"
- Target: patients who are themselves doctors or clinic owners

### Channel #7: YouTube Shorts (1/day, 60 seconds)

Not "Docita features." Instead:

| Day | Title | Hook |
|-----|-------|------|
| 1 | "Your clinic is losing patients to WhatsApp" | Show how appointments get lost in chat |
| 2 | "I set up a clinic in 90 seconds" | Screen recording: text START → done |
| 3 | "Why patients don't come back" | Follow-up is hard → Docita auto-does it |
| 4 | "The ₹20 per patient you're leaving on the table" | ABHA DHIS incentive |
| 5 | "My receptionist quit. Now what?" | WhatsApp-first means no receptionist needed |
| 6 | "3 clinic metrics you should check daily" | Daily collection, no-shows, recall rate |
| 7 | "How to write a prescription in 10 seconds" | WhatsApp reply → prescription sent |

**Format:** Face to camera (founder) + screen recording overlay. Shot on phone. No production value needed — authenticity beats polish for clinic owners.

### Channel #8: Google Business Profile as a landing page

- "Docita Clinic Software" GBP with the WhatsApp number as primary CTA
- Posts: screenshots of the WhatsApp flow (blurred patient data)
- Google Q&A: answer questions about clinic management
- WhatsApp button on GBP: directly opens chat with "START" pre-filled

### Channel #9: Pay-for-performance (zero-risk trial)

- First 100 clinics: **Free for life** (no time limit)
- Cost: $0 (server cost for 100 clinics is negligible)
- Gain: 100 case studies, 100 Google reviews, 100 WhatsApp screenshots, 100 referral sources
- After 100: ₹999/mo for Starter. After 500: ₹1499/mo. Raise price as proof accumulates.

### Channel #10: Medical equipment vendors

People who sell X-ray machines, ECG machines, dental chairs, autoclaves, etc. visit clinics regularly.

**Offer:** "Every clinic you sell equipment to — offer them free clinic software as a value-add. We handle setup. You get ₹500 per referral."

---

## 5. Engineering Changes Needed in This Repo

### High Priority (block WhatsApp-first onboarding)

#### 5.1 WhatsApp-based clinic registration

**Current state:** Inbound WhatsApp messages already enter through Meta's webhook controller and `WhatsAppWebhookIngressService`. The authenticated `POST /api/v1/whatsapp/sender/managed-onboarding/start` sender-settings route has been converted from a 503 stub into a real managed sender onboarding starter; public "Text START" clinic registration still needs a webhook-routed state machine.

**What to build:**
- Route inbound `START` messages from `WhatsAppWebhookIngressService` before appointment-response resolution, then handle each onboarding step in a state machine
- `WhatsAppOnboardingService` — manages state per WhatsApp number (which step they're on, what data they've provided)
- State transitions: `AWAITING_CLINIC_NAME` → `AWAITING_SPECIALTY` → `AWAITING_FIRST_PATIENT` → `COMPLETED`
- On completion: create clinic with `TRIALING` subscription on Free tier, send back the web login URL with OTP
- Store the WhatsApp phone number as the clinic's primary auth identifier

**Files to create:**
- `apps/api/src/domains/whatsapp/application/services/whatsapp-onboarding.service.ts`
- `packages/types/src/contracts/whatsapp-onboarding.ts` (Zod schemas for onboarding state machine)
- `apps/api/src/domains/whatsapp/infrastructure/persistence/prisma-onboarding-store.ts`

**Files to modify:**
- `apps/api/src/domains/whatsapp/application/services/whatsapp-webhook-ingress.service.ts` — route unmatched `START` messages into onboarding
- `packages/types/src/whatsapp/default-templates.data.ts` — add onboarding utility templates

#### 5.2 WhatsApp number as primary identity

**Current state:** Staff login is email/password-based, JWT tied to `User`. Patient portal OTP exists under `apps/api/src/domains/patient-portal`; staff auth lives under `apps/api/src/shared/modules/auth/auth`.

**What to change:**
- Allow clinic registration with just phone number + clinic name (no email required)
- Login via "send OTP to WhatsApp number" (not just SMS/email)
- Patient portal already does OTP-based login — extend same pattern to clinic staff
- Add `loginMethod` field: `email | whatsapp`
- WhatsApp number should be unique per clinic (or configurable)

**Files to modify:**
- `packages/types/src/shared/clinics.ts` and `packages/types/src/contracts/clinics.ts` — add `primaryWhatsAppNumber` field
- `apps/api/src/shared/modules/auth/auth/` — add WhatsApp OTP login flow
- Update registration flow to not require email

#### 5.3 WhatsApp daily digest / clinic schedule

**Current state:** Clinic sees schedule by logging into the web app.

**What to build:**
- Daily cron (7:30 AM clinic timezone): send WhatsApp message with today's appointment list
- Interactive buttons: "View patient history" → sends patient summary
- "Add walk-in" → triggers quick-add flow
- Uses existing WhatsApp template infrastructure (add new template type)

**Files to create:**
- `apps/api/src/domains/whatsapp/application/services/daily-digest.service.ts`
- `apps/api/src/domains/whatsapp/infrastructure/schedulers/daily-digest.scheduler.ts`

**Files to modify:**
- `packages/types/src/whatsapp/default-templates.data.ts` — add `daily_digest` template
- `apps/api/src/shared/whatsapp/patient-whatsapp-template-variables.ts` — add clinic digest variable builder

#### 5.4 WhatsApp-based prescription creation

**Current state:** Prescription requires opening the web app.

**What to build:**
- When doctor messages "New Rx for [patient name]" → Docita replies with a link or asks for medicine details
- Or: doctor forwards a medicine name → Docita asks for dose/duration → adds to prescription
- Simpler v1: WhatsApp message contains a link to a mobile-friendly Rx form (pre-filled with patient context)
- V2: structured WhatsApp interactive messages (medicine name, dose, duration as separate prompts)

**Files to create:**
- `apps/api/src/domains/whatsapp/application/services/whatsapp-prescription.service.ts`

**Files to modify:**
- `apps/api/src/domains/whatsapp/presentation/controllers/whatsapp-sender.controller.ts` — add prescription endpoints
- Patient response handler to route prescription-related replies

#### 5.5 Free tier implementation

**Current state:** Canonical billing tiers live in `packages/types/src/billing/tier.ts` and Prisma `ClinicTier`. `FREE` is now added as a canonical non-billable tier. Existing paid tiers are kept stable; display naming can map `ESSENTIAL` to Starter and `PROFESSIONAL` to Growth while the pricing redesign is completed.

**What to change:**
- Keep `FREE` in the tier system as a non-billable tier
- `TIER_LIMITS.FREE`: 100 patients, 50 prescriptions/month, 1 doctor, 0 staff logins
- `FEATURE_TIER_MAP`: map basic features (patient management, calendar, basic Rx, ABHA verify) to FREE
- Onboarding defaults to Free tier (no payment, no trial timer)
- Upsell prompts: "You've added 95 patients. Free tier supports 100. Upgrade to Starter (₹999) to continue."
- DHIS incentive messaging on Free tier dashboard: "You verified 45 ABHA patients so far. At 100/mo, you'd earn ₹2000 under DHIS. Upgrade to Starter to unlock unlimited verifications."

**Files to modify:**
- `packages/types/src/billing/tier.ts` — maintain FREE pricing (0), limits, feature map, AI/referral/overage rows
- `packages/utils/src/billing/tier-rules.ts` — handle FREE in feature access and tier-name helpers
- `apps/api/src/domains/subscriptions/` — keep FREE as an active non-billable subscription type
- `apps/api/src/shared/modules/auth/guards/subscription-status.guard.ts` — FREE tier should use `ACTIVE` subscription status with no trial timer
- Onboarding flow — default to FREE, add upsell at limit thresholds

#### 5.6 WhatsApp-powered "Login"

**Current state:** Clinic staff login via email + password (or Google OAuth).

**What to build:**
- Clinic staff can request login OTP via WhatsApp
- Bot sends 6-digit OTP to the clinic's WhatsApp number
- OTP verified → returns session token
- No password needed for WhatsApp-first clinics

**Files to create:**
- `apps/api/src/domains/auth/whatsapp-otp-auth.service.ts`

**Files to modify:**
- Auth controller: add `POST /api/v1/auth/whatsapp/request-otp` and `POST /api/v1/auth/whatsapp/verify-otp`
- Use existing patient-portal OTP infrastructure but for clinic staff

### Medium Priority

#### 5.7 WhatsApp template for daily schedule

- Meta template: `daily_schedule_v1` (Marketing category)
- Sent by cron every morning
- Body: "Good morning Dr. {{1}}! Today's schedule:\n\n{{2}}\n\nReply PATIENT <name> to view history, WALKIN to add a patient."
- Variable `{{2}}` contains formatted list of appointments

#### 5.8 Referral tracking system

**Current state:** Referral primitives already exist: `Clinic.referralCode`, `Referral`, `ReferralCredit`, and shared referral schemas. What is missing is acquisition-channel tracking, partner attribution, payout workflow, and a user-facing dashboard for the WhatsApp-first GTM motion.

**What to build:**
- Reuse existing referral code per clinic (short, e.g., `DRSHARMA`)
- Referral landing page: `docita.work/ref/DRSHARMA`
- When a new clinic registers via referral link, link back to referrer
- Payout tracking (manual at first, automated later)
- Referral dashboard in the web app: "You referred 3 clinics. You earned ₹1500."

**Files to create:**
- Extend `packages/types/src/shared/referrals.ts` for acquisition-channel and payout status schemas
- Add API referral services/controllers around the existing Prisma `Referral` and `ReferralCredit` models
- `apps/app/src/features/referrals/` — referral dashboard UI

#### 5.9 WhatsApp number display on patient pages

**Current state:** `docita.work/rx/{token}` shows the prescription only.

**What to change:**
- Add a non-intrusive footer: "Your clinic runs on Docita. Start your own at no cost — text START to +91 87903 11010"
- Only shown if the viewer is not the clinic staff
- Use a cookie/session to track if the viewer is the clinic or a patient

**Files to modify:**
- `apps/landing/src/pages/rx/[token].astro`
- `apps/landing/src/pages/inv/[token].astro`
- `apps/landing/src/pages/pay/[token].astro`

#### 5.10 "Free for life" flag

**Current state:** All clinics have a subscription with a trial period.

**What to change:**
- Add `isGrandfathered: boolean` to clinic subscription
- Grandfathered clinics: Free tier, no trial expiry, no payment prompts
- Only assign to first 100 clinics (manually or via a promo code `FREEFORLIFE`)
- After 100: new clinics get normal Free tier with upsell

**Files to modify:**
- Prisma schema: add `isGrandfathered` to subscription
- Tier evaluation: skip expiry check if grandfathered

### Low Priority (nice to have)

#### 5.11 UPI/POS integration as lock-in

- Integrate with Pine Labs / Paytm / Razorpay POS
- Clinic takes payments through Docita → locked in for patient records
- Currently Razorpay online payments exist; POS integration is new

#### 5.12 Pharma partner portal

- Simple web page: pharma companies log in, see referral stats, payouts
- Generate MR referral links
- Download payout reports

#### 5.13 Patient WhatsApp "book appointment"

- A patient can message the clinic's WhatsApp number
- Bot: "To book an appointment, reply with your name and preferred date"
- Creates appointment request in the clinic's queue
- Clinic receives notification: "New booking request from Ravi Kumar for tomorrow 4pm. Accept? (Yes/No)"

#### 5.14 Hindi / regional language WhatsApp support

- WhatsApp messages in Hindi for clinics where the doctor prefers Hindi
- Template translations submitted to Meta
- UI language toggle on landing page

---

## 6. Success Metrics

### Activation (first 7 days)

| Metric | Target | Why |
|--------|--------|-----|
| Time from first WhatsApp message to first patient saved | < 2 min | Measures onboarding friction |
| % of WhatsApp registrations that create a 2nd patient | > 60% | Measures stickiness of v1 |
| % of WhatsApp registrations that log into web app | > 30% | Shows they want more power |
| Day 7 retention (still active) | > 40% | Baseline for a free product |

### Conversion

| Metric | Target | Why |
|--------|--------|-----|
| Free → Starter conversion rate | 10% within 90 days | Benchmark for freemium SaaS |
| Trigger for conversion | Most common: hitting patient limit | Upsell prompt timing |
| DHIS incentive as conversion reason | Track proportion | Validates the "₹20/patient" hook |

### Distribution

| Metric | Target | Why |
|--------|--------|-----|
| Signups from "Powered by Docita" footer | Track weekly | Measures viral loop |
| Signups from pharma MR referrals | Track weekly | Measures partner channel |
| Signups from WhatsApp group seeding | Track weekly | Measures community channel |
| Cost per signup (all channels) | < ₹50 | Target for zero-paid-acquisition model |

---

## 7. 90-Day Execution Plan

### Month 1 — Build WhatsApp onboarding

**Product:**
- WhatsApp clinic registration flow (text START → clinic created) — §5.1
- Free tier in code — §5.5
- WhatsApp number as identity — §5.2
- WhatsApp daily digest — §5.3

**Distribution:**
- Claim "docita.work" Google Business Profile — §4 Channel #8
- Join 10 doctor WhatsApp groups, participate genuinely — §4 Channel #5
- Founder starts LinkedIn posting: 1/day — §4 Channel #7
- Record 3 YouTube Shorts — §4 Channel #7
- Create one-page PDF for pharma MRs — §4 Channel #2
- First SEO landing pages (already exist, verify indexed)

**Goal:** 100 WhatsApp signups (all free, all grandfathered).

### Month 2 — Launch distribution channels

**Product:**
- WhatsApp prescription creation (v1: link to mobile form) — §5.4
- WhatsApp OTP login — §5.6
- Referral tracking — §5.8
- "Powered by Docita" on patient pages — §5.9

**Distribution:**
- Reach out to 3 IMA chapters for talks — §4 Channel #3
- Contact 5 pharma companies for MR partnership — §4 Channel #2
- Contact 10 CAs for clinic referrals — §4 Channel #4
- Record 20 YouTube Shorts (bank them) — §4 Channel #7
- Attend 2 local medical association meetings — §4 Channel #3
- Reach out to 5 medical equipment vendors — §4 Channel #10

**Goal:** 500 total signups, first 10 conversion to Starter.

### Month 3 — Optimize conversion

**Product:**
- Free tier limit prompts (upsell at 95% of limit) — §5.5
- ABHA verify flow from WhatsApp
- Patient WhatsApp booking — §5.13
- UPI/POS integration (pilot with 1 payment provider) — §5.11

**Distribution:**
- Double down on highest-performing channels (drop lowest)
- First referral-based signups from existing users
- Record 3 case studies (anonymized) from active clinics
- Paid retargeting only if organic CAC < ₹50

**Goal:** 1000 total signups, 50 paying (Starter or above), ₹50k MRR.

---

## 8. Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WhatsApp template approval delays for onboarding flow | High | Blocks core flow | Build browser-based fallback; submit templates early via Meta business partner |
| Clinic owners don't trust "free" (assume hidden cost) | Medium | Low conversion | Grandfather first 100 publicly; make "Free for life" the headline, not "Free trial" |
| WhatsApp number gets rate-limited during onboarding | Medium | Blocks signups | Implement rate limiting per sender; have backup number |
| Pharma MRs don't adopt referral program | Medium | Channel fails | Test with 1 company first; iterate on payout until adoption hits 10% |
| ABDM sandbox approval delays | Low | Blocks ABHA feature | Ship ABHA verify as "Coming soon" on Free tier; make it a Starter unlock |
| Free tier cannibalizes Starter | Low | Revenue miss | Free tier limits (100 patients, 50 Rx/mo) ensure natural upsell at growth |

---

## 9. Positioning Summary

### Don't say:
- "Cloud-based clinic management software"
- "HMIS for small clinics"
- "AI-powered healthcare platform"

### Say:
- **"Run your clinic on WhatsApp."**
- **"No software to install. No setup. Just text START to +91 87903 11010."**
- **"Your patients already text you on WhatsApp. Now your clinic runs there too."**
- **"Free for life. No hidden charges. No credit card."**

### Visual identity for distribution:
- Green WhatsApp bubble icon + "Docita" in simple sans-serif
- Text overlay on screenshots: actual WhatsApp conversation showing the bot flow
- Before/After: "WhatsApp chaos → WhatsApp clinic OS"
- Color palette: WhatsApp green (#25D366) + dark text + white. Web app can keep its own palette — distribution creative should use WhatsApp green.

---

## Appendix: Current State vs Target State

| Area | Current (June 2026) | Target |
|------|-------------------|--------|
| Registration | Web-only, email+password, 30-day trial | WhatsApp: "Text START", instant Free tier |
| Primary identity | Email | WhatsApp phone number |
| Daily workflow | Must open browser | WhatsApp daily digest, run from chat |
| Prescription creation | Web app only | WhatsApp reply or link to mobile form |
| Free tier | None (30-day trial only) | Forever-free tier with limits |
| Pricing | ₹499-₹7999/mo | ₹0 → ₹999 → ₹2499 → ₹4999 |
| Distribution | Founder content + SEO | WhatsApp viral loop + pharma MRs + IMA + CAs |
| Patient portal | Web app (browser login) | WhatsApp + web |
| ABHA/ABDM | M1 built, needs credentials | Free tier feature, DHIS as upsell hook |
| Referral program | None | Built into product |
| Support | Email + support inbox | WhatsApp community + WhatsApp chat |
