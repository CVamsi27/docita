import { Injectable } from '@nestjs/common';

interface MessageTemplate {
  key: string;
  name: string;
  channels: {
    whatsapp?: string;
    email?: string;
    sms?: string;
  };
  variables: string[];
  description?: string;
}

@Injectable()
export class MessageTemplateService {
  private templates: Map<string, MessageTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  registerTemplate(template: MessageTemplate): void {
    this.templates.set(template.key, template);
  }

  getTemplate(templateKey: string): MessageTemplate | undefined {
    return this.templates.get(templateKey);
  }

  processTemplate(
    templateKey: string,
    channel: string,
    variables: Record<string, unknown>,
  ): string {
    const template = this.getTemplate(templateKey);
    if (!template) {
      throw new Error(`Template ${templateKey} not found`);
    }

    let content: string;
    if (channel === 'whatsapp' && template.channels.whatsapp) {
      content = template.channels.whatsapp;
    } else if (channel === 'email' && template.channels.email) {
      content = template.channels.email;
    } else if (channel === 'sms' && template.channels.sms) {
      content = template.channels.sms;
    } else {
      throw new Error(`No template found for channel ${channel}`);
    }

    for (const variable of template.variables) {
      const rawValue = variables[variable];
      const value =
        rawValue === undefined || rawValue === null
          ? `{{${variable}}}`
          : String(rawValue);
      content = content.replace(
        new RegExp(`\\{\\{${variable}\\}\\}`, 'g'),
        value,
      );
    }

    return content;
  }

  private registerDefaultTemplates(): void {
    this.registerTemplate({
      key: 'appointment_confirmation',
      name: 'Appointment Confirmation',
      channels: {
        whatsapp:
          'Your appointment with {{doctorName}} is scheduled for {{appointmentDate}} at {{appointmentTime}}.',
        email:
          '<p>Your appointment with {{doctorName}} is scheduled for {{appointmentDate}} at {{appointmentTime}}.</p>',
        sms: 'Appointment confirmed: {{appointmentDate}} {{appointmentTime}} with {{doctorName}}',
      },
      variables: ['doctorName', 'appointmentDate', 'appointmentTime'],
      description: 'Confirmation message for appointment scheduling',
    });

    this.registerTemplate({
      key: 'payment_reminder',
      name: 'Payment Reminder',
      channels: {
        whatsapp:
          'Your invoice #{{invoiceId}} for {{amount}} is due on {{dueDate}}. Click here to pay: {{paymentLink}}',
        email:
          '<p>Your invoice #{{invoiceId}} for {{amount}} is due on {{dueDate}}.</p><p><a href="{{paymentLink}}">Pay Now</a></p>',
        sms: 'Invoice #{{invoiceId}} for {{amount}} due {{dueDate}}. Pay here: {{paymentLink}}',
      },
      variables: ['invoiceId', 'amount', 'dueDate', 'paymentLink'],
      description: 'Reminder for pending payment',
    });

    this.registerTemplate({
      key: 'prescription_ready',
      name: 'Prescription Ready',
      channels: {
        whatsapp: 'Your prescription is ready for pickup at {{clinicName}}.',
        email:
          '<p>Your prescription is ready for pickup at {{clinicName}}.</p>',
        sms: 'Prescription ready for pickup at {{clinicName}}',
      },
      variables: ['clinicName'],
      description: 'Notification that prescription is ready',
    });
  }
}
