import { Injectable } from '@nestjs/common';

export interface TemplateVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
}

export interface TemplateButton {
  id: string;
  text: string;
  action?: string;
}

export type TemplateCategory =
  | 'APPOINTMENT'
  | 'PRESCRIPTION'
  | 'INVOICE'
  | 'PAYMENT'
  | 'FOLLOW_UP'
  | 'MARKETING'
  | 'STAFF_NOTIFICATION';

export interface DefaultTemplateDefinition {
  name: string;
  category: TemplateCategory;
  content: string;
  variables: TemplateVariable[];
  buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION' | 'NONE';
  buttons?: TemplateButton[];
  textFallback: string;
}

@Injectable()
export class DefaultTemplatesService {
  readonly templates: Record<string, DefaultTemplateDefinition> = {
    appointment_scheduled: {
      name: 'appointment_scheduled',
      category: 'APPOINTMENT',
      content: `Hello {{patientName}}\n\nYour appointment at *{{clinicName}}* is confirmed!\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}\n\nWe look forward to seeing you!`,
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
      textFallback: `Hello {{patientName}}\n\nYour appointment at *{{clinicName}}* is confirmed!\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}\n\nReply:\n1. Confirm\n2. Reschedule\n3. Cancel\n\nWe look forward to seeing you!`,
    },

    appointment_confirmation: {
      name: 'appointment_confirmation',
      category: 'APPOINTMENT',
      content: `Hello {{patientName}}\n\nYour appointment at *{{clinicName}}* is confirmed!\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}`,
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
      textFallback: `Hello {{patientName}}\n\nYour appointment at *{{clinicName}}* is confirmed!\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}\n\nReply:\n1. Confirm\n2. Reschedule\n3. Cancel`,
    },

    appointment_reminder_24hr: {
      name: 'appointment_reminder_24hr',
      category: 'APPOINTMENT',
      content: `*Appointment Reminder* - {{clinicName}}\n\nHi {{patientName}}, this is a reminder for your appointment tomorrow.\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}`,
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
      textFallback: `*Appointment Reminder* - {{clinicName}}\n\nHi {{patientName}}, this is a reminder for your appointment tomorrow.\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}`,
    },

    appointment_reminder_1hr: {
      name: 'appointment_reminder_1hr',
      category: 'APPOINTMENT',
      content: `*Appointment Reminder* - {{clinicName}}\n\nHi {{patientName}}, your appointment is in 1 hour.\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}`,
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
      textFallback: `*Appointment Reminder* - {{clinicName}}\n\nHi {{patientName}}, your appointment is in 1 hour.\n\nDate: {{date}}\nTime: {{time}}\nDoctor: Dr. {{doctorName}}`,
    },

    appointment_reminder_30min: {
      name: 'appointment_reminder_30min',
      category: 'APPOINTMENT',
      content: `*Reminder* - {{clinicName}}\n\nHi {{patientName}}, your appointment is in 30 minutes!`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
      ],
      buttonType: 'QUICK_REPLY',
      buttons: [
        { id: 'confirm', text: 'I am on my way' },
        { id: 'cancel', text: 'Cancel' },
      ],
      textFallback: `*Reminder* - {{clinicName}}\n\nHi {{patientName}}, your appointment is in 30 minutes!\n\nReply:\n1. I am on my way\n2. Cancel`,
    },

    prescription_shared: {
      name: 'prescription_shared',
      category: 'PRESCRIPTION',
      content: `*Your Prescription* from {{clinicName}}\n\nHi {{patientName}}, your prescription has been shared!\n\nDr. {{doctorName}} prescribed:\n{{medications}}\n\nView full prescription: {{prescriptionLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'doctorName', required: true },
        { name: 'medications', required: true },
        { name: 'prescriptionLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Your Prescription* from {{clinicName}}\n\nHi {{patientName}}, your prescription has been shared!\n\nDr. {{doctorName}} prescribed:\n{{medications}}\n\nView full prescription: {{prescriptionLink}}`,
    },

    prescription_created: {
      name: 'prescription_created',
      category: 'PRESCRIPTION',
      content: `*Your Prescription* from {{clinicName}}\n\nHi {{patientName}}, your prescription has been shared!\n\nDr. {{doctorName}} has added your treatment.\nView full prescription: {{link}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'doctorName', required: true },
        { name: 'link', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Your Prescription* from {{clinicName}}\n\nHi {{patientName}}, your prescription has been shared!\n\nDr. {{doctorName}} has added your treatment.\nView full prescription: {{link}}`,
    },

    invoice_created: {
      name: 'invoice_created',
      category: 'INVOICE',
      content: `*Invoice Ready* - {{clinicName}}\n\nHi {{patientName}}, your invoice is ready.\n\nAmount: {{amount}}\nView invoice: {{link}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'link', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Invoice Ready* - {{clinicName}}\n\nHi {{patientName}}, your invoice is ready.\n\nAmount: {{amount}}\nView invoice: {{link}}`,
    },

    payment_reminder: {
      name: 'payment_reminder',
      category: 'PAYMENT',
      content: `*Payment Due* - {{clinicName}}\n\nHi {{patientName}}, your invoice is ready!\n\nAmount: ₹{{amount}}\nDue by: {{dueDate}}\n\nView invoice: {{invoiceLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'dueDate', required: true },
        { name: 'invoiceLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Payment Due* - {{clinicName}}\n\nHi {{patientName}}, your invoice is ready!\n\nAmount: ₹{{amount}}\nDue by: {{dueDate}}\n\nView invoice: {{invoiceLink}}`,
    },

    payment_confirmation: {
      name: 'payment_confirmation',
      category: 'PAYMENT',
      content: `*Payment Received* - {{clinicName}}\n\nHi {{patientName}}, we received your payment.\n\nAmount: {{amount}}\nInvoice: {{invoiceNumber}}\nDate: {{date}}\nPayment Ref: {{paymentId}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'invoiceNumber', required: true },
        { name: 'date', required: true },
        { name: 'paymentId', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Payment Received* - {{clinicName}}\n\nHi {{patientName}}, we received your payment.\n\nAmount: {{amount}}\nInvoice: {{invoiceNumber}}\nDate: {{date}}\nPayment Ref: {{paymentId}}`,
    },

    appointment_cancelled: {
      name: 'appointment_cancelled',
      category: 'APPOINTMENT',
      content: `*Appointment Update* - {{clinicName}}\n\nHi {{patientName}}, your appointment has been cancelled.\n\nDate: {{date}}\nTime: {{time}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Appointment Update* - {{clinicName}}\n\nHi {{patientName}}, your appointment has been cancelled.\n\nDate: {{date}}\nTime: {{time}}`,
    },

    appointment_rescheduled: {
      name: 'appointment_rescheduled',
      category: 'APPOINTMENT',
      content: `*Appointment Update* - {{clinicName}}\n\nHi {{patientName}}, your appointment has been rescheduled.\n\nNew Date: {{date}}\nNew Time: {{time}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'date', required: true },
        { name: 'time', required: true },
      ],
      buttonType: 'NONE',
      textFallback: `*Appointment Update* - {{clinicName}}\n\nHi {{patientName}}, your appointment has been rescheduled.\n\nNew Date: {{date}}\nNew Time: {{time}}`,
    },

    lab_report_ready: {
      name: 'lab_report_ready',
      category: 'APPOINTMENT',
      content: `*Lab Report Ready* - {{clinicName}}\n\nHi {{patientName}}, your lab report is ready!\n\nTest: {{testName}}\nView report: {{reportLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'testName', required: true },
        { name: 'reportLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `*Lab Report Ready* - {{clinicName}}\n\nHi {{patientName}}, your lab report is ready!\n\nTest: {{testName}}\nView report: {{reportLink}}`,
    },
  };

  getDefaultTemplateNames(): string[] {
    return Object.keys(this.templates);
  }

  getDefaultTemplate(templateId: string): DefaultTemplateDefinition | null {
    return this.templates[templateId] || null;
  }

  getAllDefaultTemplates(): DefaultTemplateDefinition[] {
    return Object.values(this.templates);
  }
}
