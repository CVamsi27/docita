import { Injectable } from '@nestjs/common';

interface TemplateVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
}

interface TemplateButton {
  id: string;
  text: string;
  action?: string;
}

/**
 * DefaultTemplatesService - Manages default WhatsApp template library
 * Responsibilities:
 * - Maintaining default template definitions
 * - Providing access to default templates
 * - Listing available templates
 */
@Injectable()
export class DefaultTemplatesService {
  /**
   * Default system templates - designed for interactive buttons with text fallback
   */
  readonly templates: Record<
    string,
    {
      name: string;
      category:
        | 'APPOINTMENT'
        | 'PRESCRIPTION'
        | 'INVOICE'
        | 'PAYMENT'
        | 'FOLLOW_UP'
        | 'MARKETING'
        | 'STAFF_NOTIFICATION';
      content: string;
      variables: TemplateVariable[];
      buttonType: 'QUICK_REPLY' | 'CALL_TO_ACTION';
      buttons?: TemplateButton[];
      textFallback: string;
    }
  > = {
    appointment_scheduled: {
      name: 'appointment_scheduled',
      category: 'APPOINTMENT',
      content: `Hello {{patientName}} 👋

Your appointment at *{{clinicName}}* is confirmed!

📅 Date: {{date}}
🕐 Time: {{time}}
👨‍⚕️ Doctor: Dr. {{doctorName}}

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
        { id: 'confirm', text: '✅ Confirm' },
        { id: 'reschedule', text: '📅 Reschedule' },
        { id: 'cancel', text: '❌ Cancel' },
      ],
      textFallback: `Hello {{patientName}} 👋

Your appointment at *{{clinicName}}* is confirmed!

📅 Date: {{date}}
🕐 Time: {{time}}
👨‍⚕️ Doctor: Dr. {{doctorName}}

Reply:
1️⃣ Confirm
2️⃣ Reschedule
3️⃣ Cancel

We look forward to seeing you! 🏥`,
    },

    appointment_reminder_30min: {
      name: 'appointment_reminder_30min',
      category: 'APPOINTMENT',
      content: `⏰ *Reminder* - {{clinicName}}

Hi {{patientName}}, your appointment is in 30 minutes!`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
      ],
      buttonType: 'QUICK_REPLY',
      buttons: [
        { id: 'confirm', text: '✅ I am on my way' },
        { id: 'cancel', text: '❌ Cancel' },
      ],
      textFallback: `⏰ *Reminder* - {{clinicName}}

Hi {{patientName}}, your appointment is in 30 minutes!

Reply:
1️⃣ I am on my way
2️⃣ Cancel`,
    },

    prescription_shared: {
      name: 'prescription_shared',
      category: 'PRESCRIPTION',
      content: `💊 *Your Prescription* from {{clinicName}}

Hi {{patientName}}, your prescription has been shared!

Dr. {{doctorName}} prescribed:
{{medications}}

📋 View full prescription: {{prescriptionLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'doctorName', required: true },
        { name: 'medications', required: true },
        { name: 'prescriptionLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `💊 *Your Prescription* from {{clinicName}}

Hi {{patientName}}, your prescription has been shared!

Dr. {{doctorName}} prescribed:
{{medications}}

View full prescription: {{prescriptionLink}}`,
    },

    payment_reminder: {
      name: 'payment_reminder',
      category: 'PAYMENT',
      content: `💳 *Payment Due* - {{clinicName}}

Hi {{patientName}}, your invoice is ready!

Amount: ₹{{amount}}
Due by: {{dueDate}}

📄 View invoice: {{invoiceLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'amount', required: true },
        { name: 'dueDate', required: true },
        { name: 'invoiceLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `💳 *Payment Due* - {{clinicName}}

Hi {{patientName}}, your invoice is ready!

Amount: ₹{{amount}}
Due by: {{dueDate}}

View invoice: {{invoiceLink}}`,
    },

    lab_report_ready: {
      name: 'lab_report_ready',
      category: 'APPOINTMENT',
      content: `🧪 *Lab Report Ready* - {{clinicName}}

Hi {{patientName}}, your lab report is ready!

Test: {{testName}}
📊 View report: {{reportLink}}`,
      variables: [
        { name: 'patientName', required: true },
        { name: 'clinicName', required: true },
        { name: 'testName', required: true },
        { name: 'reportLink', required: false, defaultValue: 'Link' },
      ],
      buttonType: 'CALL_TO_ACTION',
      textFallback: `🧪 *Lab Report Ready* - {{clinicName}}

Hi {{patientName}}, your lab report is ready!

Test: {{testName}}
View report: {{reportLink}}`,
    },
  };

  /**
   * Get all default template names
   */
  getDefaultTemplateNames(): string[] {
    return Object.keys(this.templates);
  }

  /**
   * Get a default template by ID
   */
  getDefaultTemplate(
    templateId: string,
  ): (typeof this.templates)[keyof typeof this.templates] | null {
    return this.templates[templateId] || null;
  }

  /**
   * Get all default templates
   */
  getAllDefaultTemplates() {
    return Object.values(this.templates);
  }
}
