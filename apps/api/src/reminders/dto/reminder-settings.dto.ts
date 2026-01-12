import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const reminderSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  hoursBeforeAppt: z.number().int().min(1).max(168).optional(),
  emailSubject: z.string().optional(),
  emailTemplate: z.string().optional(),
  smsTemplate: z.string().optional(),
});

export class ReminderSettingsDto extends createZodDto(reminderSettingsSchema) {}

export const sendReminderSchema = z.object({
  type: z.enum(['email', 'sms']),
});

export class SendReminderDto extends createZodDto(sendReminderSchema) {}
