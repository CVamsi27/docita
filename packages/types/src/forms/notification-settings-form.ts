import { z } from "zod";

export const notificationSettingsFormSchema = z.object({
  whatsappNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean(),
});

export type NotificationSettingsFormValues = z.infer<
  typeof notificationSettingsFormSchema
>;
