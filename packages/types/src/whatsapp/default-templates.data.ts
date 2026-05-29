/** Canonical WhatsApp default template definitions (config-as-data). */
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

    prescription_shared: {
      name: 'prescription_shared',
      category: 'PRESCRIPTION',
      content: `Hi {{patientName}}, Dr. {{doctorName}} from *{{clinicName}}* has shared your prescription.

Medications:
{{medications}}

Notes from the doctor:
{{instructions}}

Wishing you a quick recovery. Reach out for any clarifications.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'doctorName', required: true },
        { name: 'medications', required: true },
        { name: 'instructions', required: false, defaultValue: '' },
      ],
      buttonType: 'NONE',
      textFallback: `Hi {{patientName}}, Dr. {{doctorName}} from *{{clinicName}}* has shared your prescription.

Medications:
{{medications}}

Notes from the doctor:
{{instructions}}

Wishing you a quick recovery. Reach out for any clarifications.`,
    },

    prescription_created: {
      name: 'prescription_created',
      category: 'PRESCRIPTION',
      content: `Hi {{patientName}}, Dr. {{doctorName}} from *{{clinicName}}* has added your prescription.

View full prescription here: {{link}}

Wishing you a quick recovery.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'doctorName', required: true },
        { name: 'link', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `Hi {{patientName}}, Dr. {{doctorName}} from *{{clinicName}}* has added your prescription.

View full prescription here: {{link}}

Wishing you a quick recovery.`,
    },

    invoice_ready: {
      name: 'invoice_ready',
      category: 'INVOICE',
      content: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Invoice #: {{invoiceNumber}}
Date: {{date}}
Amount: {{amount}}

Pay online here: {{paymentLink}}

Thank you for visiting us.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'invoiceNumber', required: true },
        { name: 'date', required: true },
        { name: 'paymentLink', required: false, defaultValue: '' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Invoice #: {{invoiceNumber}}
Date: {{date}}
Amount: {{amount}}

Pay online here: {{paymentLink}}

Thank you for visiting us.`,
    },

    invoice_created: {
      name: 'invoice_created',
      category: 'INVOICE',
      content: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Amount: {{amount}}
View invoice here: {{link}}

Thank you for visiting us.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'link', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `Hi {{patientName}}, your invoice from *{{clinicName}}* is ready.

Amount: {{amount}}
View invoice here: {{link}}

Thank you for visiting us.`,
    },

    payment_reminder: {
      name: 'payment_reminder',
      category: 'PAYMENT',
      content: `Hi {{patientName}}, a quick reminder from *{{clinicName}}* that your invoice is still due.

Amount: {{amount}}
Due by: {{dueDate}}

View invoice and pay online here: {{invoiceLink}}

Reach out if you have any questions.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'dueDate', required: true },
        { name: 'invoiceLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `Hi {{patientName}}, a quick reminder from *{{clinicName}}* that your invoice is still due.

Amount: {{amount}}
Due by: {{dueDate}}

View invoice and pay online here: {{invoiceLink}}

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

Hi {{patientName}}, the doctor is running approximately {{delayMinutes}} minutes late for your appointment.

Date: {{date}}
Time: {{time}}

We apologise for the inconvenience and appreciate your patience.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'delayMinutes', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Doctor Running Late* - {{clinicName}}

Hi {{patientName}}, the doctor is running approximately {{delayMinutes}} minutes late for your appointment.

Date: {{date}}
Time: {{time}}

We apologise for the inconvenience and appreciate your patience.`,
    },

    payment_link: {
      name: 'payment_link',
      category: 'PAYMENT',
      content: `Hi {{patientName}}, here is the secure payment link for your invoice at *{{clinicName}}*.

Amount: {{amount}}
Pay online here: {{paymentLink}}

Reach out if you have any questions.`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'paymentLink', required: true },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `Hi {{patientName}}, here is the secure payment link for your invoice at *{{clinicName}}*.

Amount: {{amount}}
Pay online here: {{paymentLink}}

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
      content: `{{code}} is your Docita verification code.

For your security, do not share this code with anyone. It is valid for 10 minutes.`,
      variables: [
        { name: 'code', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `{{code}} is your Docita verification code.

For your security, do not share this code with anyone. It is valid for 10 minutes.`,
    },

  } as const;
