/**
 * Canonical WhatsApp default template definitions (config-as-data).
 *
 * jscpd flags many of the `variables`/`buttons` blocks below as near-duplicates —
 * that's inherent to the domain (sibling templates legitimately share the same
 * patient/clinic/date/time variable shapes and confirm/reschedule/cancel button
 * sets). Extracting those into shared constants would force every template to be
 * cross-referenced to understand its own contract, which is exactly what this
 * file exists to avoid: each entry should stay self-contained and reviewable by
 * non-engineers against the approved WhatsApp Manager copy.
 */
// jscpd:ignore-start
export const WHATSAPP_DEFAULT_TEMPLATES_RAW = {
    appointment_confirmation: {
      name: 'appointment_confirmation',
      category: 'APPOINTMENT',
      content: `Hello {{patientName}}, your appointment at *{{clinicName}}* is confirmed.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}
Location: {{mapsLink}}

We look forward to seeing you. Please arrive 10 minutes early.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
        { name: 'doctorName', required: true },
        { name: 'mapsLink', required: false, defaultValue: '—' },
      ],
      buttonType: 'QUICK_REPLY',
      buttons: [
        { id: 'confirm', text: 'Confirm' },
        { id: 'reschedule', text: 'Reschedule' },
        { id: 'cancel', text: 'Cancel' },
      ],
      textFallback: `Hello {{patientName}}, your appointment at *{{clinicName}}* is confirmed.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}
Location: {{mapsLink}}

We look forward to seeing you. Please arrive 10 minutes early.

Reply:
1. Confirm
2. Reschedule
3. Cancel`,
    },

    appointment_reminder_24hr: {
      name: 'appointment_reminder_24hr',
      category: 'APPOINTMENT',
      content: `Hi {{patientName}}, a reminder of your appointment tomorrow at *{{clinicName}}*.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}

Please reply Confirm or Reschedule so we can plan the day.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
        { name: 'doctorName', required: true },
      ],
      buttonType: 'QUICK_REPLY',
      buttons: [
        { id: 'confirm', text: 'Confirm' },
        { id: 'reschedule', text: 'Reschedule' },
      ],
      textFallback: `Hi {{patientName}}, a reminder of your appointment tomorrow at *{{clinicName}}*.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}

Please reply Confirm or Reschedule so we can plan the day.`,
    },

    appointment_reminder_1hr: {
      name: 'appointment_reminder_1hr',
      category: 'APPOINTMENT',
      content: `Hi {{patientName}}, your appointment at *{{clinicName}}* is in about 1 hour.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}

Please head over now. Reply if you are running late.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
        { name: 'doctorName', required: true },
      ],
      buttonType: 'QUICK_REPLY',
      buttons: [
        { id: 'confirm', text: 'I am on my way' },
        { id: 'cancel', text: 'Cancel' },
      ],
      textFallback: `Hi {{patientName}}, your appointment at *{{clinicName}}* is in about 1 hour.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}

Please head over now. Reply if you are running late.`,
    },

    appointment_reminder_30min: {
      name: 'appointment_reminder_30min',
      category: 'APPOINTMENT',
      content: `*Reminder* - {{clinicName}}

Hi {{patientName}}, your appointment is in 30 minutes.

Please tell us your status:`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
      ],
      buttonType: 'QUICK_REPLY',
      buttons: [
        { id: 'on_time', text: 'On time' },
        { id: 'delayed', text: 'Delayed' },
        { id: 'cancelled', text: 'Cancelled' },
      ],
      textFallback: `*Reminder* - {{clinicName}}

Hi {{patientName}}, your appointment is in 30 minutes.

Reply with one word:
On time / Delayed / Cancelled`,
    },

    prescription_created: {
      name: 'prescription_created',
      category: 'PRESCRIPTION',
      content: `Hi {{patientName}}, Dr. {{doctorName}} from *{{clinicName}}* has added your prescription.

Tap the button below to view your full prescription.

Wishing you a quick recovery.`,
      variables: [
        { name: 'clinicName', required: true },
        { name: 'patientName', required: true },
        { name: 'doctorName', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'view_prescription', text: 'View Prescription' }],
      buttonUrlVariable: 'rxToken',
      textFallback: `Hi {{patientName}}, Dr. {{doctorName}} from *{{clinicName}}* has added your prescription.

View full prescription here: {{rxLink}}

Wishing you a quick recovery.`,
    },

    lab_result_ready: {
      name: 'lab_result_ready',
      category: 'FOLLOW_UP',
      content: `Hi {{patientName}}, your lab results from *{{clinicName}}* are ready.

Test: {{testName}}
Date: {{resultDate}}

Tap the button below to view your report. Please consult your doctor for any questions.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'testName', required: true },
        { name: 'resultDate', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'view_results', text: 'View Results' }],
      buttonUrlVariable: 'resultLink',
      textFallback: `Hi {{patientName}}, your lab results from *{{clinicName}}* are ready.

Test: {{testName}}
Date: {{resultDate}}

View your report here: {{resultLink}}

Please consult your doctor for any questions.`,
    },

    invoice_ready: {
      name: 'invoice_ready',
      category: 'INVOICE',
      content: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Invoice #: {{invoiceNumber}}
Date: {{date}}
Amount: {{amount}}

Tap the button below to pay online.

Thank you for visiting us.`,
      variables: [
        { name: 'clinicName', required: true },
        { name: 'patientName', required: true },
        { name: 'invoiceNumber', required: true },
        { name: 'date', required: true },
        { name: 'amount', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'pay_now', text: 'Pay Now' }],
      buttonUrlVariable: 'payToken',
      textFallback: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Invoice #: {{invoiceNumber}}
Date: {{date}}
Amount: {{amount}}

Pay online here: {{payLink}}

Thank you for visiting us.`,
    },

    invoice_created: {
      name: 'invoice_created',
      category: 'INVOICE',
      content: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Amount: {{amount}}

Tap the button below to view your invoice.

Thank you for visiting us.`,
      variables: [
        { name: 'clinicName', required: true },
        { name: 'patientName', required: true },
        { name: 'amount', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'view_invoice', text: 'View Invoice' }],
      buttonUrlVariable: 'invToken',
      textFallback: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Amount: {{amount}}
View invoice here: {{invLink}}

Thank you for visiting us.`,
    },

    payment_reminder: {
      name: 'payment_reminder',
      category: 'PAYMENT',
      content: `Hi {{patientName}}, a quick reminder from *{{clinicName}}* that your invoice is still due.

Amount: {{amount}}
Due by: {{dueDate}}

Tap the button below to pay online securely via Docita.

Reach out if you have any questions.`,
      variables: [
        { name: 'clinicName', required: true },
        { name: 'patientName', required: true },
        { name: 'amount', required: true },
        { name: 'dueDate', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'pay_now', text: 'Pay Now' }],
      buttonUrlVariable: 'payToken',
      textFallback: `Hi {{patientName}}, a quick reminder from *{{clinicName}}* that your invoice is still due.

Amount: {{amount}}
Due by: {{dueDate}}

Pay online here: {{payLink}}

Reach out if you have any questions.`,
    },

    payment_confirmation: {
      name: 'payment_confirmation',
      category: 'PAYMENT',
      content: `Hi {{patientName}}, we have received your payment at *{{clinicName}}*.

Amount: {{amount}}
Invoice: {{invoiceNumber}}
Date: {{date}}
Payment Ref: {{paymentId}}

Thank you for your payment. Wishing you good health.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'invoiceNumber', required: true },
        { name: 'date', required: true },
        { name: 'paymentId', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `Hi {{patientName}}, we have received your payment at *{{clinicName}}*.

Amount: {{amount}}
Invoice: {{invoiceNumber}}
Date: {{date}}
Payment Ref: {{paymentId}}

Thank you for your payment. Wishing you good health.`,
    },

    appointment_cancelled: {
      name: 'appointment_cancelled',
      category: 'APPOINTMENT',
      content: `Hi {{patientName}}, your appointment at *{{clinicName}}* has been cancelled.

Date: {{date}}
Time: {{time}}

Reach out to rebook at a time that works for you.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `Hi {{patientName}}, your appointment at *{{clinicName}}* has been cancelled.

Date: {{date}}
Time: {{time}}

Reach out to rebook at a time that works for you.`,
    },

    appointment_rescheduled: {
      name: 'appointment_rescheduled',
      category: 'APPOINTMENT',
      content: `Hi {{patientName}}, your appointment at *{{clinicName}}* has been rescheduled.

New Date: {{date}}
New Time: {{time}}

Thank you for your patience. See you then.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `Hi {{patientName}}, your appointment at *{{clinicName}}* has been rescheduled.

New Date: {{date}}
New Time: {{time}}

Thank you for your patience. See you then.`,
    },

    appointment_delay: {
      name: 'appointment_delay',
      category: 'APPOINTMENT',
      content: `*Doctor Running Late* - {{clinicName}}

Hi {{patientName}}, the doctor is running approximately {{delayMinutes}} minutes late.

Your updated appointment time:
New date: {{newDate}}
New time: {{newTime}}

We apologise for the inconvenience and appreciate your patience.`,
      variables: [
        { name: 'clinicName', required: true },
        { name: 'patientName', required: true },
        { name: 'delayMinutes', required: true },
        { name: 'newDate', required: true },
        { name: 'newTime', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Doctor Running Late* - {{clinicName}}

Hi {{patientName}}, the doctor is running approximately {{delayMinutes}} minutes late.

Your updated appointment time:
New date: {{newDate}}
New time: {{newTime}}

We apologise for the inconvenience and appreciate your patience.`,
    },

    payment_link: {
      name: 'payment_link',
      category: 'PAYMENT',
      content: `Hi {{patientName}}, here is the secure payment link for your invoice at *{{clinicName}}*.

Amount: {{amount}}

Tap the button below to pay online.

Reach out if you have any questions.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'pay_now', text: 'Pay Now' }],
      buttonUrlVariable: 'payToken',
      textFallback: `Hi {{patientName}}, here is the secure payment link for your invoice at *{{clinicName}}*.

Amount: {{amount}}
Pay online here: {{payLink}}

Reach out if you have any questions.`,
    },

    patient_response_confirm: {
      name: 'patient_response_confirm',
      category: 'APPOINTMENT',
      content: `Thanks {{patientName}}, your appointment at *{{clinicName}}* on {{date}} at {{time}} with Dr. {{doctorName}} is confirmed.

See you then. Please arrive 10 minutes early.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
        { name: 'doctorName', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `Thanks {{patientName}}, your appointment at *{{clinicName}}* on {{date}} at {{time}} with Dr. {{doctorName}} is confirmed.

See you then. Please arrive 10 minutes early.`,
    },

    patient_response_delay: {
      name: 'patient_response_delay',
      category: 'APPOINTMENT',
      content: `Thanks for the heads up {{patientName}}. We have noted a delay of {{delayMinutes}} minutes for your appointment at *{{clinicName}}* on {{date}} at {{time}} with Dr. {{doctorName}}.

The clinic will plan around the new time. Drive safe.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
        { name: 'doctorName', required: true },
        { name: 'delayMinutes', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `Thanks for the heads up {{patientName}}. We have noted a delay of {{delayMinutes}} minutes for your appointment at *{{clinicName}}* on {{date}} at {{time}} with Dr. {{doctorName}}.

The clinic will plan around the new time. Drive safe.`,
    },

    patient_login_otp: {
      name: 'patient_login_otp',
      category: 'AUTHENTICATION',
      // Meta auto-generates the body for AUTHENTICATION templates from the
      // "security recommendation" + "expiry time" toggles. We can't write custom
      // copy here. The content below mirrors what Meta sends with both toggles
      // ON and a 10-minute expiry, and is what the textFallback path uses if
      // the template lookup fails. Keep this string in sync with what's
      // approved in WhatsApp Manager.
      content: `{{code}} is your verification code. For your security, do not share this code. This code expires in 10 minutes.`,
      variables: [{ name: 'code', required: true }],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'copy_code', text: 'Copy code' }],
      textFallback: `{{code}} is your verification code. For your security, do not share this code. This code expires in 10 minutes.`,
    },

    partner_welcome_v1: {
      name: 'partner_welcome_v1',
      category: 'PARTNER',
      // Sent once when an operator adds a referral partner
      // (pharmacist / marketing rep / clinic) via the internal referrals
      // page. The Docita Clinic OS showcase PDF is attached as a header
      // document and the partner's share message is inlined in the body
      // so they can copy-paste it straight into a doctor conversation.
      // Rendered by `PartnerTemplateService.renderWelcomeComponents`.
      content: `Hi {{1}},

Welcome to the Docita Referral Partner programme.

You are listed as a {{2}} with referral code {{3}}.

Sign in to your partner portal anytime at:
{{4}}

Below is a ready-to-send message you can share with any doctor or clinic owner you speak to. Your code is applied automatically when they sign up using your link.

---
{{5}}

— The Docita team`,
      variables: [
        { name: 'partnerName', required: true },
        { name: 'typeLabel', required: true },
        { name: 'code', required: true },
        { name: 'partnerPortalUrl', required: true },
        { name: 'shareMessage', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      buttons: [
        { id: 'open_partner_portal', text: 'Open partner portal' },
      ],
      headerType: 'DOCUMENT',
      headerDocumentFilename: 'docita-partner-showcase.pdf',
      // 24h signed URL; the partner can download but not share a permanent link.
      // The signed URL is generated at send time by `ReferrerWelcomeService`.
      textFallback: `Hi {{partnerName}},

Welcome to the Docita Referral Partner programme.

You are listed as a {{typeLabel}} with referral code {{code}}.

Sign in to your partner portal anytime at: {{partnerPortalUrl}}

— The Docita team`,
    },

    partner_login_otp: {
      name: 'partner_login_otp',
      category: 'AUTHENTICATION',
      // Meta auto-generates the body — same posture as `patient_login_otp`.
      // Mirrored content kept in sync with the WhatsApp Manager toggles
      // below; rendered by `sendLoginOtp` in
      // `apps/api/src/shared/whatsapp/whatsapp-login-otp.helper.ts`.
      content: `{{code}} is your verification code. For your security, do not share this code. This code expires in 10 minutes.`,
      variables: [{ name: 'code', required: true }],
      buttonType: 'CALL_TO_ACTION',
      buttons: [{ id: 'copy_code', text: 'Copy code' }],
      textFallback: `{{code}} is your verification code. For your security, do not share this code. This code expires in 10 minutes.`,
    },

  } as const;
// jscpd:ignore-end
