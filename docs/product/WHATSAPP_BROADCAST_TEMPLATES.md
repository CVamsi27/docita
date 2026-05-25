# WhatsApp Broadcast — Meta Marketing Templates

This document captures the MARKETING templates that need to be submitted in WhatsApp Manager (Meta Business Suite → WhatsApp → Manage templates → Create template) before the broadcast feature can fan out to recipients who are outside the 24-hour session window.

All templates are MARKETING category, English (`en`), with a single body variable for the recipient name.

The strings below are the exact copy to paste into the Meta template editor. The internal `BROADCAST_PRESETS` map points at these template names, so changing a `metaTemplateName` here requires the same change in [apps/internal/features/broadcasts/broadcast-presets.ts](../apps/internal/features/broadcasts/broadcast-presets.ts).

---

## 1. `docita_intro_v1`

Generic Docita introduction with contact info. Safe to send to any audience where you just want to introduce Docita and provide ways to reach us.

- **Category:** Marketing
- **Language:** English
- **Header:** None
- **Body (with `{{1}}` = recipient name):**

```
Hi {{1}}, this is Docita.

We work with clinics and hospitals across India. If you'd like to learn more or get in touch, here's where to reach us:

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

We're now onboarding more hospitals — and we'd love your help. If you connect us to a hospital that signs up:
• 5% of their first-year subscription, paid to you quarterly
• You stay in the loop — we keep you posted on every referral

All we need is the hospital name, city, and a contact person. We do the rest.

Reply REFER to get started.

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
Hi {{1}}, Docita is now onboarding hospitals — and we pay pharmacies who refer them.

₹1,000 referral fee per hospital that goes live on Docita.

All we need from you is the hospital name, city, and a contact person. We do the rest.

Reply REFER to get started.

🌐 docita.work
📧 support@docita.work
📞 +91 87903 11010
```

- **Footer (optional):** `Reply STOP to opt out.`
- **Buttons:** None.
- **Sample variable:** `MedPlus Banjara Hills`

---

## Submission checklist

1. In Meta Business Suite, open the Docita WhatsApp Business Account → Message templates → Create template.
2. Category: **Marketing**.
3. Name: use the exact `metaTemplateName` from the preset (snake_case, version-suffixed). Versioning convention is `_v1`, `_v2`, etc.
4. Paste the body text above. Confirm the variable is `{{1}}` and add the sample value.
5. Footer is optional but recommended for opt-out compliance.
6. Submit for review. Approval typically takes minutes to a few hours.
7. Once **APPROVED**, the broadcast page can be used in "Meta template" mode for that audience.

## Operational notes

- The broadcast service sends through the existing support WhatsApp number (the same one wired into `WhatsappClientService`). Replies from broadcast recipients automatically land in `/support` (Support WhatsApp inbox) because the webhook handler routes all incoming traffic to `SupportWhatsAppInboxService`.
- Sends are throttled (~4/sec) and processed serially in-process; for very large batches consider extracting this into a queue worker job.
- The broadcast page also supports "Free text" mode which calls the regular text endpoint — only use this for recipients who are inside the 24-hour customer service window (i.e. they've messaged us first).
- Referral fee amounts (5% for hospital partners, ₹1,000 for pharmacy partners) in the template body are commercial offers — re-confirm with finance before submitting to Meta, since template body cannot be edited after approval (only a new version like `_v2` can be created).
