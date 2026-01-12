import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  WhatsappTemplateCategory,
  WhatsappButtonType,
  WhatsappTemplateStatus,
} from '@workspace/db';

/**
 * Template variable interface
 */
interface TemplateVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Button configuration for interactive templates
 */
interface TemplateButton {
  id: string;
  text: string;
  action?: string; // For CALL_TO_ACTION buttons
}

/**
 * Resolved template ready for sending
 */
export interface ResolvedTemplate {
  content: string;
  buttons?: TemplateButton[];
  buttonType: WhatsappButtonType;
  textFallback: string; // Text version for sandbox/fallback
  metaTemplateId?: string; // For production with approved templates
}

/**
 * Default system templates - designed for interactive buttons with text fallback
 */
const DEFAULT_TEMPLATES: Record<
  string,
  {
    name: string;
    category: WhatsappTemplateCategory;
    content: string;
    variables: TemplateVariable[];
    buttonType: WhatsappButtonType;
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

Hi {{patientName}}, your appointment is in 30 minutes!

👨‍⚕️ Dr. {{doctorName}}
🕐 {{time}}

Are you on your way?`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'doctorName', required: true },
      { name: 'time', required: true },
    ],
    buttonType: 'QUICK_REPLY',
    buttons: [
      { id: 'on_the_way', text: '🚗 On my way' },
      { id: 'delay', text: '⏱️ Running late' },
      { id: 'reschedule', text: '📅 Reschedule' },
      { id: 'cancel', text: '❌ Cancel' },
    ],
    textFallback: `⏰ *Reminder* - {{clinicName}}

Hi {{patientName}}, your appointment is in 30 minutes!

👨‍⚕️ Dr. {{doctorName}}
🕐 {{time}}

Are you on your way?
1️⃣ On my way
2️⃣ Running late (15 min)
3️⃣ Need to reschedule
4️⃣ Cancel`,
  },

  appointment_reminder_24hr: {
    name: 'appointment_reminder_24hr',
    category: 'APPOINTMENT',
    content: `📅 *Appointment Tomorrow* - {{clinicName}}

Hi {{patientName}}, this is a reminder about your appointment tomorrow.

📅 Date: {{date}}
🕐 Time: {{time}}
👨‍⚕️ Doctor: Dr. {{doctorName}}

Please arrive 10 minutes early.`,
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
    textFallback: `📅 *Appointment Tomorrow* - {{clinicName}}

Hi {{patientName}}, this is a reminder about your appointment tomorrow.

📅 Date: {{date}}
🕐 Time: {{time}}
👨‍⚕️ Doctor: Dr. {{doctorName}}

Please arrive 10 minutes early.

Reply:
1️⃣ Confirm
2️⃣ Reschedule
3️⃣ Cancel`,
  },

  patient_response_confirm: {
    name: 'patient_response_confirm',
    category: 'APPOINTMENT',
    content: `✅ *Confirmed* - {{clinicName}}

Thank you {{patientName}}! Your appointment is confirmed.

📅 {{date}} at {{time}}
👨‍⚕️ Dr. {{doctorName}}

See you soon! 🏥`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'date', required: true },
      { name: 'time', required: true },
      { name: 'doctorName', required: true },
    ],
    buttonType: 'NONE',
    textFallback: `✅ *Confirmed* - {{clinicName}}

Thank you {{patientName}}! Your appointment is confirmed.

📅 {{date}} at {{time}}
👨‍⚕️ Dr. {{doctorName}}

See you soon! 🏥`,
  },

  patient_response_delay: {
    name: 'patient_response_delay',
    category: 'APPOINTMENT',
    content: `⏱️ *Noted* - {{clinicName}}

Thanks for letting us know, {{patientName}}. We've informed the clinic that you're running late.

Your appointment: {{time}}
Please arrive as soon as possible.`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'time', required: true },
    ],
    buttonType: 'NONE',
    textFallback: `⏱️ *Noted* - {{clinicName}}

Thanks for letting us know, {{patientName}}. We've informed the clinic that you're running late.

Your appointment: {{time}}
Please arrive as soon as possible.`,
  },

  prescription_ready: {
    name: 'prescription_ready',
    category: 'PRESCRIPTION',
    content: `Hello {{patientName}} 👋

Your prescription from *{{clinicName}}* is ready!

💊 *Medications:*
{{medications}}

📋 *Instructions:*
{{instructions}}

👨‍⚕️ Prescribed by: Dr. {{doctorName}}

For queries, contact us. Get well soon! 🏥`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'medications', required: true },
      {
        name: 'instructions',
        required: false,
        defaultValue: 'Follow as prescribed',
      },
      { name: 'doctorName', required: true },
    ],
    buttonType: 'NONE',
    textFallback: `Hello {{patientName}} 👋

Your prescription from *{{clinicName}}* is ready!

💊 *Medications:*
{{medications}}

📋 *Instructions:*
{{instructions}}

👨‍⚕️ Prescribed by: Dr. {{doctorName}}

For queries, contact us. Get well soon! 🏥`,
  },

  invoice_ready: {
    name: 'invoice_ready',
    category: 'INVOICE',
    content: `Hello {{patientName}} 👋

Your invoice from *{{clinicName}}* is ready.

💰 *Amount:* {{amount}}
📋 *Invoice #:* {{invoiceNumber}}
📅 *Date:* {{date}}

{{#if paymentLink}}
Pay online: {{paymentLink}}
{{/if}}

Thank you for choosing us! 🏥`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'amount', required: true },
      { name: 'invoiceNumber', required: true },
      { name: 'date', required: true },
      { name: 'paymentLink', required: false },
    ],
    buttonType: 'CALL_TO_ACTION',
    buttons: [{ id: 'pay', text: '💳 Pay Now', action: '{{paymentLink}}' }],
    textFallback: `Hello {{patientName}} 👋

Your invoice from *{{clinicName}}* is ready.

💰 *Amount:* {{amount}}
📋 *Invoice #:* {{invoiceNumber}}
📅 *Date:* {{date}}

{{#if paymentLink}}
Pay online: {{paymentLink}}
{{/if}}

Thank you for choosing us! 🏥`,
  },

  staff_notification: {
    name: 'staff_notification',
    category: 'STAFF_NOTIFICATION',
    content: `🔔 *Patient Response* - {{clinicName}}

Patient: {{patientName}}
Appointment: {{date}} at {{time}}
Response: {{responseType}}
{{#if message}}Message: "{{message}}"{{/if}}

Please take appropriate action.`,
    variables: [
      { name: 'clinicName', required: true },
      { name: 'patientName', required: true },
      { name: 'date', required: true },
      { name: 'time', required: true },
      { name: 'responseType', required: true },
      { name: 'message', required: false },
    ],
    buttonType: 'NONE',
    textFallback: `🔔 *Patient Response* - {{clinicName}}

Patient: {{patientName}}
Appointment: {{date}} at {{time}}
Response: {{responseType}}
{{#if message}}Message: "{{message}}"{{/if}}

Please take appropriate action.`,
  },

  payment_link: {
    name: 'payment_link',
    category: 'PAYMENT',
    content: `Hello {{patientName}} 👋

Here's your payment link from *{{clinicName}}*:

💰 *Amount:* {{amount}}
📋 *For:* {{description}}

Pay securely: {{paymentLink}}

This link expires in 24 hours.`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'amount', required: true },
      { name: 'description', required: false, defaultValue: 'Consultation' },
      { name: 'paymentLink', required: true },
    ],
    buttonType: 'CALL_TO_ACTION',
    buttons: [{ id: 'pay', text: '💳 Pay Now', action: '{{paymentLink}}' }],
    textFallback: `Hello {{patientName}} 👋

Here's your payment link from *{{clinicName}}*:

💰 *Amount:* {{amount}}
📋 *For:* {{description}}

Pay securely: {{paymentLink}}

This link expires in 24 hours.`,
  },

  payment_confirmation: {
    name: 'payment_confirmation',
    category: 'PAYMENT',
    content: `✅ *Payment Received* - {{clinicName}}

Thank you {{patientName}}! We've received your payment.

💰 *Amount:* {{amount}}
📋 *Invoice #:* {{invoiceNumber}}
🗓️ *Date:* {{date}}
💳 *Payment ID:* {{paymentId}}

Your receipt is available in the app.

Thank you for choosing us! 🏥`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'amount', required: true },
      { name: 'invoiceNumber', required: true },
      { name: 'date', required: true },
      { name: 'paymentId', required: true },
    ],
    buttonType: 'NONE',
    textFallback: `✅ *Payment Received* - {{clinicName}}

Thank you {{patientName}}! We've received your payment.

💰 *Amount:* {{amount}}
📋 *Invoice #:* {{invoiceNumber}}
🗓️ *Date:* {{date}}
💳 *Payment ID:* {{paymentId}}

Your receipt is available in the app.

Thank you for choosing us! 🏥`,
  },

  payment_failed: {
    name: 'payment_failed',
    category: 'PAYMENT',
    content: `❌ *Payment Failed* - {{clinicName}}

Hi {{patientName}}, your payment could not be processed.

💰 *Amount:* {{amount}}
📋 *Invoice #:* {{invoiceNumber}}

Please try again: {{paymentLink}}

Need help? Contact us at the clinic.`,
    variables: [
      { name: 'patientName', required: true },
      { name: 'clinicName', required: true },
      { name: 'amount', required: true },
      { name: 'invoiceNumber', required: true },
      { name: 'paymentLink', required: true },
    ],
    buttonType: 'CALL_TO_ACTION',
    buttons: [{ id: 'retry', text: '🔄 Try Again', action: '{{paymentLink}}' }],
    textFallback: `❌ *Payment Failed* - {{clinicName}}

Hi {{patientName}}, your payment could not be processed.

💰 *Amount:* {{amount}}
📋 *Invoice #:* {{invoiceNumber}}

Please try again: {{paymentLink}}

Need help? Contact us at the clinic.`,
  },
};

@Injectable()
export class WhatsappTemplatesService {
  private readonly logger = new Logger(WhatsappTemplatesService.name);
  private readonly useProductionMode: boolean;

  constructor(private readonly prisma: PrismaService) {
    // Check if we should use production mode (approved templates via Meta Cloud API)
    this.useProductionMode = process.env.WHATSAPP_PRODUCTION_MODE === 'true';
    this.logger.log(
      `WhatsApp Templates initialized in ${this.useProductionMode ? 'PRODUCTION' : 'SANDBOX'} mode`,
    );
  }

  /**
   * Get all default template names
   */
  getDefaultTemplateNames(): string[] {
    return Object.keys(DEFAULT_TEMPLATES);
  }

  /**
   * Get a template by ID, first checking database, then falling back to defaults
   */
  async getTemplate(
    templateId: string,
    clinicId?: string,
  ): Promise<
    (typeof DEFAULT_TEMPLATES)[keyof typeof DEFAULT_TEMPLATES] | null
  > {
    // First, check if clinic has a custom template
    if (clinicId) {
      const customTemplate = await this.prisma.whatsappTemplate.findFirst({
        where: {
          clinicId,
          name: templateId,
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      if (customTemplate) {
        return {
          name: customTemplate.name,
          category: customTemplate.category,
          content: customTemplate.content,
          variables:
            (customTemplate.variables as unknown as TemplateVariable[]) || [],
          buttonType: customTemplate.buttonType,
          buttons: customTemplate.buttons as unknown as
            | TemplateButton[]
            | undefined,
          textFallback: customTemplate.content, // Use content as fallback
        };
      }
    }

    // Fall back to default templates
    return DEFAULT_TEMPLATES[templateId] || null;
  }

  /**
   * Resolve a template with variables - the core abstraction
   * Always use this method, never construct messages directly
   */
  async resolveTemplate(
    templateId: string,
    variables: Record<string, string>,
    clinicId?: string,
  ): Promise<ResolvedTemplate | null> {
    const template = await this.getTemplate(templateId, clinicId);
    if (!template) {
      this.logger.warn(`Template not found: ${templateId}`);
      return null;
    }

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && !variables[variable.name]) {
        if (variable.defaultValue) {
          variables[variable.name] = variable.defaultValue;
        } else {
          this.logger.warn(
            `Missing required variable: ${variable.name} for template: ${templateId}`,
          );
          return null;
        }
      }
    }

    // Resolve content with variables
    const resolvedContent = this.replaceVariables(template.content, variables);
    const resolvedFallback = this.replaceVariables(
      template.textFallback,
      variables,
    );

    // Resolve buttons if present
    let resolvedButtons: TemplateButton[] | undefined;
    if (template.buttons) {
      resolvedButtons = template.buttons.map((button) => ({
        ...button,
        action: button.action
          ? this.replaceVariables(button.action, variables)
          : undefined,
      }));
    }

    // Check for approved production template
    let metaTemplateId: string | undefined;
    if (this.useProductionMode && clinicId) {
      const approvedTemplate = await this.prisma.whatsappTemplate.findFirst({
        where: {
          clinicId,
          name: templateId,
          status: 'APPROVED',
          isActive: true,
        },
      });
      metaTemplateId = approvedTemplate?.metaTemplateId || undefined;
    }

    return {
      content: resolvedContent,
      buttons: resolvedButtons,
      buttonType: template.buttonType,
      textFallback: resolvedFallback,
      metaTemplateId,
    };
  }

  /**
   * Replace {{variable}} placeholders with values
   * Also handles {{#if variable}}...{{/if}} conditionals
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;

    // Handle conditionals: {{#if variable}}content{{/if}}
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(conditionalRegex, (_, varName, content) => {
      return variables[varName] ? content : '';
    });

    // Replace simple variables: {{variable}}
    const variableRegex = /\{\{(\w+)\}\}/g;
    result = result.replace(variableRegex, (_, varName) => {
      return variables[varName] || '';
    });

    return result.trim();
  }

  /**
   * Get the text message to send based on mode
   * In sandbox: returns textFallback (with reply numbers)
   * In production: returns content (with buttons handled by Meta Cloud API)
   */
  getMessageForMode(resolved: ResolvedTemplate): string {
    if (this.useProductionMode && resolved.metaTemplateId) {
      // In production with approved template, use the content
      // Buttons will be handled by Meta Cloud API
      return resolved.content;
    }
    // In sandbox or without approved template, use text fallback with reply numbers
    return resolved.textFallback;
  }

  /**
   * Seed default templates for a clinic
   */
  async seedDefaultTemplates(clinicId: string): Promise<void> {
    const existingTemplates = await this.prisma.whatsappTemplate.findMany({
      where: { clinicId },
    });

    if (existingTemplates.length > 0) {
      this.logger.log(
        `Clinic ${clinicId} already has templates, skipping seed`,
      );
      return;
    }

    const templateEntries = Object.entries(DEFAULT_TEMPLATES);
    for (const [_, template] of templateEntries) {
      await this.prisma.whatsappTemplate.create({
        data: {
          clinicId,
          name: template.name,
          category: template.category,
          content: template.content,
          variables: JSON.parse(JSON.stringify(template.variables)),
          buttonType: template.buttonType,
          buttons: template.buttons
            ? JSON.parse(JSON.stringify(template.buttons))
            : null,
          status: 'DRAFT',
          isDefault: true,
          isActive: true,
        },
      });
    }

    this.logger.log(
      `Seeded ${templateEntries.length} templates for clinic ${clinicId}`,
    );
  }

  /**
   * List all templates for a clinic
   */
  async listTemplates(clinicId: string) {
    return this.prisma.whatsappTemplate.findMany({
      where: { clinicId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }, { version: 'desc' }],
    });
  }

  /**
   * Update template status (for approval workflow)
   */
  async updateTemplateStatus(
    templateId: string,
    status: WhatsappTemplateStatus,
    metaTemplateId?: string,
  ) {
    return this.prisma.whatsappTemplate.update({
      where: { id: templateId },
      data: {
        status,
        metaTemplateId,
        updatedAt: new Date(),
      },
    });
  }
}
