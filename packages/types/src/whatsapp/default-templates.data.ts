/** Canonical WhatsApp default template definitions (config-as-data). */
export const WHATSAPP_DEFAULT_TEMPLATES_RAW = {
    appointment_scheduled: {
      name: 'appointment_scheduled',
      category: 'APPOINTMENT',
      content: `Hello {{patientName}}

Your appointment at *{{clinicName}}* is confirmed!

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}

We look forward to seeing you!`,
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
        { id: 'cancel', text: 'Cancel' },
      ],
      textFallback: `Hello {{patientName}}

Your appointment at *{{clinicName}}* is confirmed!

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}

Reply:
1. Confirm
2. Reschedule
3. Cancel

We look forward to seeing you!`,
    },

    appointment_confirmation: {
      name: 'appointment_confirmation',
      category: 'APPOINTMENT',
      content: `Hello {{patientName}}

Your appointment at *{{clinicName}}* is confirmed!

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}
Location: {{mapsLink}}`,
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
      textFallback: `Hello {{patientName}}

Your appointment at *{{clinicName}}* is confirmed!

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}
Location: {{mapsLink}}

Reply:
1. Confirm
2. Reschedule
3. Cancel`,
    },

    appointment_reminder_24hr: {
      name: 'appointment_reminder_24hr',
      category: 'APPOINTMENT',
      content: `*Appointment Reminder* - {{clinicName}}

Hi {{patientName}}, this is a reminder for your appointment tomorrow.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}`,
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
      textFallback: `*Appointment Reminder* - {{clinicName}}

Hi {{patientName}}, this is a reminder for your appointment tomorrow.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}`,
    },

    appointment_reminder_1hr: {
      name: 'appointment_reminder_1hr',
      category: 'APPOINTMENT',
      content: `*Appointment Reminder* - {{clinicName}}

Hi {{patientName}}, your appointment is in 1 hour.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}`,
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
      textFallback: `*Appointment Reminder* - {{clinicName}}

Hi {{patientName}}, your appointment is in 1 hour.

Date: {{date}}
Time: {{time}}
Doctor: Dr. {{doctorName}}`,
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
      content: `*Your Prescription* from {{clinicName}}

Hi {{patientName}}, your prescription has been shared!

Dr. {{doctorName}} prescribed:
{{medications}}

View full prescription: {{prescriptionLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'doctorName', required: true },
        { name: 'medications', required: true },
        { name: 'prescriptionLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Your Prescription* from {{clinicName}}

Hi {{patientName}}, your prescription has been shared!

Dr. {{doctorName}} prescribed:
{{medications}}

View full prescription: {{prescriptionLink}}`,
    },

    prescription_created: {
      name: 'prescription_created',
      category: 'PRESCRIPTION',
      content: `*Your Prescription* from {{clinicName}}

Hi {{patientName}}, your prescription has been shared!

Dr. {{doctorName}} has added your treatment.
View full prescription: {{link}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'doctorName', required: true },
        { name: 'link', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Your Prescription* from {{clinicName}}

Hi {{patientName}}, your prescription has been shared!

Dr. {{doctorName}} has added your treatment.
View full prescription: {{link}}`,
    },

    invoice_created: {
      name: 'invoice_created',
      category: 'INVOICE',
      content: `*Invoice Ready* - {{clinicName}}

Hi {{patientName}}, your invoice is ready.

Amount: {{amount}}
View invoice: {{link}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'link', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Invoice Ready* - {{clinicName}}

Hi {{patientName}}, your invoice is ready.

Amount: {{amount}}
View invoice: {{link}}`,
    },

    payment_reminder: {
      name: 'payment_reminder',
      category: 'PAYMENT',
      content: `*Payment Due* - {{clinicName}}

Hi {{patientName}}, your invoice is ready!

Amount: {{amount}}
Due by: {{dueDate}}

View invoice: {{invoiceLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'dueDate', required: true },
        { name: 'invoiceLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Payment Due* - {{clinicName}}

Hi {{patientName}}, your invoice is ready!

Amount: {{amount}}
Due by: {{dueDate}}

View invoice: {{invoiceLink}}`,
    },

    payment_confirmation: {
      name: 'payment_confirmation',
      category: 'PAYMENT',
      content: `*Payment Received* - {{clinicName}}

Hi {{patientName}}, we received your payment.

Amount: {{amount}}
Invoice: {{invoiceNumber}}
Date: {{date}}
Payment Ref: {{paymentId}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'invoiceNumber', required: true },
        { name: 'date', required: true },
        { name: 'paymentId', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Payment Received* - {{clinicName}}

Hi {{patientName}}, we received your payment.

Amount: {{amount}}
Invoice: {{invoiceNumber}}
Date: {{date}}
Payment Ref: {{paymentId}}`,
    },

    appointment_cancelled: {
      name: 'appointment_cancelled',
      category: 'APPOINTMENT',
      content: `*Appointment Update* - {{clinicName}}

Hi {{patientName}}, your appointment has been cancelled.

Date: {{date}}
Time: {{time}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Appointment Update* - {{clinicName}}

Hi {{patientName}}, your appointment has been cancelled.

Date: {{date}}
Time: {{time}}`,
    },

    appointment_rescheduled: {
      name: 'appointment_rescheduled',
      category: 'APPOINTMENT',
      content: `*Appointment Update* - {{clinicName}}

Hi {{patientName}}, your appointment has been rescheduled.

New Date: {{date}}
New Time: {{time}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Appointment Update* - {{clinicName}}

Hi {{patientName}}, your appointment has been rescheduled.

New Date: {{date}}
New Time: {{time}}`,
    },

    lab_report_ready: {
      name: 'lab_report_ready',
      category: 'APPOINTMENT',
      content: `*Lab Report Ready* - {{clinicName}}

Hi {{patientName}}, your lab report is ready!

Test: {{testName}}
View report: {{reportLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'testName', required: true },
        { name: 'reportLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Lab Report Ready* - {{clinicName}}

Hi {{patientName}}, your lab report is ready!

Test: {{testName}}
View report: {{reportLink}}`,
    },
  } as const;
